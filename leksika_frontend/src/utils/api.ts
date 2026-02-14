/// <reference types="vite/client" />
// src/utils/api.js
import axios from 'axios';
import { ref, computed } from 'vue';
import { useAuthStore } from '@/stores/auth';

// =============================================================================
// URL Configuration - Auto-derive based on mode
// =============================================================================

// Port configuration
const DEV_PORT = 8001;
const PROD_PORT = 8000;

// Read host from environment
const BACKEND_HOST = import.meta.env.VITE_BACKEND_HOST || 'localhost';
const PRODUCTION_DOMAIN =
  import.meta.env.VITE_PRODUCTION_DOMAIN || 'leksika.id';

// Detect if we're in development or production mode
// __IS_DEV__ is injected by vite.config.js
declare const __IS_DEV__: boolean;
const isDev = typeof __IS_DEV__ !== 'undefined' ? __IS_DEV__ : true;

// CRITICAL: Force HTTPS if page is loaded over HTTPS to prevent Mixed Content errors
const isPageSecure =
  typeof window !== 'undefined' && window.location.protocol === 'https:';

// Build Backend URL based on mode
let BACKEND_URL: string;
if (isPageSecure) {
  // Production via HTTPS - use same origin (Cloudflare Tunnel routes /api/* to backend)
  BACKEND_URL = `https://${window.location.host}`;
  console.info('API: Using production backend at', BACKEND_URL);
} else if (isDev) {
  // Development mode - use dynamic hostname for LAN support
  // This allows connecting from 192.168.x.x
  BACKEND_URL = `http://${window.location.hostname}:${DEV_PORT}`;
} else {
  // Production mode (local) - use current hostname:PROD_PORT
  // This allows accessing from other devices via WiFi IP (e.g. 192.168.1.10:8000)
  BACKEND_URL = `http://${window.location.hostname}:${PROD_PORT}`;
}

// Derive API Base URL (append /api/)
export const API_BASE_URL = `${BACKEND_URL}/api/`;

// Derive WebSocket Base URL (replace http->ws, https->wss, append /api/)
export const WS_BASE_URL =
  BACKEND_URL.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:') + '/api/';

// 🔍 Debug: tampilkan URL yang dipakai
console.log(`✅ Mode: ${isDev ? 'DEVELOPMENT' : 'PRODUCTION'}`);
console.log(`✅ Backend URL: ${BACKEND_URL}`);
console.log(`✅ API Base URL: ${API_BASE_URL}`);
console.log(`✅ WS Base URL: ${WS_BASE_URL}`);

// =============================================================================
// Axios Instance
// =============================================================================

const baseApi = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 300000, // 5 menit (AI Translation butuh waktu lama)
});

// =============================================================================
// AI Log — Reactive state langsung (tanpa Pinia store)
// =============================================================================

export interface AiLogEntry {
  id: string;
  timestamp: number;
  type: string;
  input: string;
  output: string;
  status: 'pending' | 'success' | 'error';
  durationMs: number;
  metadata: {
    model?: string;
    keyIndex?: number;
    mode?: string;
    endpoint?: string;
    [key: string]: any;
  };
}

const MAX_LOGS = 200;

function _genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

/** Reactive AI log list — import langsung dari api.ts */
export const aiLogs = ref<AiLogEntry[]>([]);
export const aiLogAutoScroll = ref(true);
export const aiLogCount = computed(() => aiLogs.value.length);
export const aiLogPendingCount = computed(() => aiLogs.value.filter(l => l.status === 'pending').length);
export const aiLogErrorCount = computed(() => aiLogs.value.filter(l => l.status === 'error').length);

export function addAiLog(entry: Omit<AiLogEntry, 'id' | 'timestamp' | 'durationMs' | 'status' | 'output'> & { output?: string }): string {
  const id = _genId();
  aiLogs.value.push({
    ...entry,
    id,
    timestamp: Date.now(),
    status: 'pending',
    output: entry.output || '',
    durationMs: 0,
  });
  if (aiLogs.value.length > MAX_LOGS) {
    aiLogs.value = aiLogs.value.slice(-MAX_LOGS);
  }
  return id;
}

export function updateAiLog(id: string, update: Partial<Pick<AiLogEntry, 'output' | 'status' | 'durationMs' | 'metadata'>>) {
  const index = aiLogs.value.findIndex(l => l.id === id);
  if (index !== -1) {
    // Gunakan spread untuk menggabungkan dan mengganti objek agar reaktivitas Vue terjamin
    aiLogs.value[index] = { 
      ...aiLogs.value[index], 
      ...update,
      metadata: { ...aiLogs.value[index].metadata, ...(update.metadata || {}) }
    };
  }
}

export function clearAiLogs() {
  aiLogs.value = [];
}

// =============================================================================
// Interceptors — Backend-Driven AI Detection
// =============================================================================
// Strategi: Backend (ai_services.rs) adalah satu-satunya sumber kebenaran.
// Setiap respons AI mengandung header `x-ai-model`. Frontend cukup mengecek
// header ini, sehingga otomatis mencakup SEMUA endpoint AI saat ini dan masa depan
// tanpa perlu maintain daftar URL pattern.

// Map untuk menyimpan waktu mulai setiap request yang berpotensi AI
const _requestTimingMap = new Map<any, number>();

/** Ekstrak ringkasan input dari request config untuk ditampilkan di log */
function _summarizeInput(config: any): { type: string; input: string } {
  let data = config.data;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch { /* ignore */ }
  }

  if (!data || typeof data !== 'object') {
    return { type: 'other', input: String(data || '') };
  }

  const type = data.ai_action || data.action || 'other';
  let input = type !== 'other' ? `[${type}]` : '';

  // Selalu sertakan JSON lengkap agar benar-benar "full" sesuai permintaan user
  const jsonStr = JSON.stringify(data, null, 2);
  
  if (input) {
    input += '\n' + jsonStr;
  } else {
    input = jsonStr;
  }

  return { type, input };
}

/** Ekstrak ringkasan output dari response data */
function _summarizeOutput(data: any): string {
  if (!data) return '';
  if (typeof data !== 'object') return String(data);

  // Kembalikan JSON lengkap agar "full"
  return JSON.stringify(data, null, 2);
}

// --- REQUEST INTERCEPTOR ---
baseApi.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore();
    const token = authStore.token;

    if (token) {
      config.headers['Authorization'] = `Token ${token}`;
    }

    // Semuanya kita catat waktunya agar robust jika ada AI header di respons manapun
    _requestTimingMap.set(config, Date.now());

    return config;
  },
  (error) => Promise.reject(error),
);

// --- RESPONSE INTERCEPTOR ---
baseApi.interceptors.response.use(
  (response) => {
    const startTime = _requestTimingMap.get(response.config);
    _requestTimingMap.delete(response.config);

    // Backend-driven detection: jika ada header x-ai-model, ini adalah respons AI
    const model = response.headers['x-ai-model'];
    
    if (model) {
      if (!startTime) {
        console.warn(`[AI Log] Found x-ai-model (${model}) but startTime is missing for ${response.config.url}. Check interceptors.`);
      }
      
      try {
        const duration = Date.now() - startTime;
        const { type, input } = _summarizeInput(response.config);
        const output = _summarizeOutput(response.data);
        const keyIndex = response.headers['x-ai-key-index'] ? parseInt(response.headers['x-ai-key-index']) : undefined;
        const mode = response.headers['x-ai-mode'];
        const endpoint = `${response.config.method?.toUpperCase()} ${response.config.url}`;

        const logId = addAiLog({ type, input, metadata: { endpoint } });
        updateAiLog(logId, {
          output: output,
          status: 'success',
          durationMs: duration,
          metadata: { model, keyIndex, mode },
        });
      } catch { /* silent */ }
    }

    return response;
  },
  (error) => {
    const startTime = _requestTimingMap.get(error?.config);
    _requestTimingMap.delete(error?.config);

    // Juga cek respons error yang berisi header AI
    const headers = error?.response?.headers || {};
    const model = headers['x-ai-model'];
    
    if (model) {
      if (!startTime) {
        console.warn(`[AI Log Error] Found x-ai-model (${model}) but startTime is missing for ${error.config?.url}.`);
      }
      
      try {
        const duration = Date.now() - startTime;
        const { type, input } = _summarizeInput(error.config);
        const errMsg = error?.response?.data?.error || error?.message || 'Unknown error';
        const keyIndex = headers['x-ai-key-index'] ? parseInt(headers['x-ai-key-index']) : undefined;
        const mode = headers['x-ai-mode'];
        const endpoint = `${error.config?.method?.toUpperCase()} ${error.config?.url}`;

        const logId = addAiLog({ type, input, metadata: { endpoint } });
        updateAiLog(logId, {
          output: `❌ ${errMsg}`,
          status: 'error',
          durationMs: duration,
          metadata: { model, keyIndex, mode },
        });
      } catch { /* silent */ }
    }

    return Promise.reject(error);
  },
);

// Mengekspor instance yang sudah dikonfigurasi sebagai 'api'.
export const api = baseApi;
