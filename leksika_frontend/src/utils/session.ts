// src/utils/session.js

import { ref, watch, type Ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { getDeviceTelemetry } from './telemetry';
import { WS_BASE_URL } from './api';

// --- WebSocket URL for Session ---
// Derive from WS_BASE_URL (already handles production vs development in api.js)
const WS_URL = WS_BASE_URL + 'ws/session/';

// --- Reactive State ---
export const isConnected = ref(false);
export const validationStatus = ref('idle'); // idle, validating, success, error
export const isSessionValidated = ref(false); // Validated by Turnstile + Telemetry
export const sessionId: Ref<string | null> = ref(null); // Assigned by backend

// --- Internal State ---
let socket: WebSocket | null = null;
let reconnectInterval: any = null;
let pingInterval: any = null;

// --- Private Functions ---

const connect = async () => {
  // Avoid multiple connections
  if (socket && socket.readyState === WebSocket.OPEN) {
    return;
  }

  // Clean up old listeners
  if (socket) {
    socket.onopen = null;
    socket.onmessage = null;
    socket.onclose = null;
    socket.onerror = null;
    socket.close();
  }

  const authStore = useAuthStore();
  console.log('SESSION: Connecting to', WS_URL);
  socket = new WebSocket(WS_URL);

  // --- Helper: Safe Base64 for UTF-8 ---
  function safeEncodeBase64(str: string) {
    try {
      const bytes = new TextEncoder().encode(str);
      const binString = Array.from(bytes, (byte) =>
        String.fromCodePoint(byte),
      ).join('');
      return btoa(binString);
    } catch (e) {
      console.warn('SESSION: Base64 Encode failed:', e);
      return '';
    }
  }

  function safeDecodeBase64(base64: string) {
    try {
      const binString = atob(base64);
      const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0)!);
      return new TextDecoder().decode(bytes);
    } catch (e) {
      console.warn('SESSION: Base64 Decode failed:', e);
      return null;
    }
  }

  socket.onopen = async () => {
    console.log('SESSION: WebSocket Connected.');
    isConnected.value = true;
    clearInterval(reconnectInterval);

    // Send initial telemetry data, using Base64 obfuscation
    const telemetryData = await getDeviceTelemetry();
    const rawPayload = JSON.stringify({
      telemetry: telemetryData,
      auth_token: authStore.token || null,
    });

    sendMessage({
      type: 'ClientHello',
      payload: {
        data: safeEncodeBase64(rawPayload), // Use Safe Encode
      },
    });

    // Start a ping every 30 seconds to keep the connection alive
    pingInterval = setInterval(() => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        sendMessage({ type: 'Ping' });
      }
    }, 30000);
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      // console.log('SESSION: Received message', data); // Removed log for cleaner console

      switch (data.type) {
        case 'ServerHello':
          sessionId.value = data.payload?.session_id;
          break;
        case 'TelemetryResult':
          // Send geo data from FindIP to Clarity (Obfuscated using Base64)
          import('@/utils/telemetry').then(({ claritySetTag }) => {
            try {
              const encodedData = data.payload?.data;
              if (encodedData) {
                // Use Safe Decode
                const jsonStr = safeDecodeBase64(encodedData);
                if (jsonStr) {
                  const p = JSON.parse(jsonStr);

                  // 1. Special Handling: Geo Location (Combined Lat/Lng)
                  if (p.latitude && p.longitude) {
                    claritySetTag(
                      'geo_location',
                      `${p.latitude.toFixed(4)},${p.longitude.toFixed(4)}`,
                    );
                  }

                  // 2. Dynamic Handling: Send ALL other properties as tags automatically
                  // This ensures any new data from 'findip' is automatically included without code changes.
                  Object.keys(p).forEach((key) => {
                    const value = p[key];
                    if (value === null || value === undefined) return;

                    // Skip separate lat/long tokens if you only want the combined one, 
                    // but keeping them might be useful for filtering. We'll keep them.
                    
                    // Specific mapping for standardizing names if needed
                    let tagName = key;
                    if (key === 'timezone') tagName = 'geo_timezone';

                    // Convert to string (Clarity tags must be strings)
                    const stringValue = String(value);

                    // Send to Clarity
                    claritySetTag(tagName, stringValue);
                  });

                  console.log('[Clarity] Telemetry/Geo tags synced:', Object.keys(p));
                }
              }
            } catch (e) {
              console.warn('SESSION: Failed to process TelemetryResult:', e);
            }
          });
          break;
        case 'ValidationSuccess':
          isSessionValidated.value = true;
          validationStatus.value = 'success';
          break;
        case 'ValidationFailure':
          isSessionValidated.value = false;
          validationStatus.value = 'error';
          console.warn('SESSION: Backend validation failed.');
          break;
        case 'Pong':
          // Server acknowledged our ping
          break;
      }
    } catch (error) {
      console.error('SESSION: Error parsing message from server:', error);
    }
  };

  socket.onclose = () => {
    console.log('SESSION: WebSocket Disconnected.');
    isConnected.value = false;
    isSessionValidated.value = false;
    clearInterval(pingInterval);

    // Attempt to reconnect after a delay
    if (!reconnectInterval) {
      reconnectInterval = setInterval(() => {
        console.log('SESSION: Attempting to reconnect...');
        connect();
      }, 5000); // Reconnect every 5 seconds
    }
  };

  socket.onerror = (error) => {
    console.error('SESSION: WebSocket Error:', error);
    socket?.close(); // This will trigger onclose and the reconnect logic
  };
};

const disconnect = () => {
  if (socket) {
    console.log('SESSION: Manually disconnecting.');
    // Prevent automatic reconnection
    clearInterval(reconnectInterval);
    reconnectInterval = null;
    socket.onclose = null;
    socket.close();
  }
};

// --- Public API ---

/**
 * Sends a message to the WebSocket server.
 * Can be called as sendMessage({ type: 'TypeName', payload: {} })
 * or for backward compatibility sendMessage('TypeName', {})
 * @param {string|object} typeOrMessage - The message type string or the full message object.
 * @param {object} [payload] - The message payload, only used if the first argument is a string.
 */
export const sendMessage = (typeOrMessage: string | any, payload?: any) => {
  let message: any;
  if (typeof typeOrMessage === 'string') {
    // Backward compatible call: sendMessage('Type', { payload_data })
    message = { type: typeOrMessage, payload };
  } else {
    // Modern call: sendMessage({ type: 'Type', payload: {} })
    message = typeOrMessage;
  }

  // For Ping, there is no payload content
  if (message.type === 'Ping') {
    delete message.payload;
  }

  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  } else {
    console.warn('SESSION: Could not send message, WebSocket is not open.');
  }
};

/**
 * Abstraction to send a Turnstile token to the backend for session validation.
 * @param {string} token - The token received from the Turnstile widget.
 */
export const validateSessionWithTurnstile = (token: string) => {
  if (!token) {
    console.error('SESSION: Turnstile token is required for validation.');
    return;
  }
  validationStatus.value = 'validating';
  sendMessage('TurnstileToken', { token });
};

/**
 * Initializes the session manager.
 * Connects to the WebSocket and handles authentication state changes.
 */
export const initializeSession = () => {
  const authStore = useAuthStore();

  // Watch for login/logout to manage the connection
  watch(
    () => authStore.isLoggedIn,
    (isLoggedIn) => {
      if (isLoggedIn) {
        // If logging in, disconnect and reconnect to send new auth token
        disconnect();
        connect();
      } else {
        disconnect();
      }
    },
    { immediate: true },
  );

  // Initial connection for anonymous users
  if (!authStore.isLoggedIn) {
    connect();
  }
};

/**
 * [DEV BYPASS] Immediately mark session as validated without Turnstile.
 * Only to be used in development mode.
 */
export const bypassValidationForDev = () => {
  isSessionValidated.value = true;
  validationStatus.value = 'success';
  console.log(
    '[DEV] Session validation bypassed - isSessionValidated set to true.',
  );
};

// Example of a composable to use in components
export const useSession = () => {
  return {
    isConnected,
    isSessionValidated,
    validationStatus,
    sessionId,
    sendMessage,
    initializeSession,
    validateSessionWithTurnstile,
    bypassValidationForDev, // [DEV] Expose bypass function
  };
};
