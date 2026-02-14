// src/utils/telemetry.js
import FingerprintJS from '@fingerprintjs/fingerprintjs';

/**
 * Mengambil informasi GPU (Kartu Grafis).
 * Berguna untuk mendeteksi apakah user menggunakan Virtual Machine (bot) atau PC fisik.
 */
const getGpuInfo = () => {
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return null;

    const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return null;

    return {
      vendor: (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
      renderer: (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL),
    };
  } catch (e) {
    return null;
  }
};

/**
 * Mengambil informasi Koneksi Jaringan (Network Information API).
 * Hanya tersedia di Chrome/Edge, return null di Firefox/Safari.
 * Berguna untuk mendeteksi tipe koneksi (4g vs wifi vs ethernet).
 */
const getConnectionInfo = () => {
  const conn =
    (navigator as any).connection ||
    (navigator as any).mozConnection ||
    (navigator as any).webkitConnection;
  if (!conn) return null;

  return {
    effectiveType: conn.effectiveType, // '4g', '3g', etc.
    rtt: conn.rtt, // Round-trip time estimasi
    downlink: conn.downlink, // Kecepatan download estimasi (Mbps)
    saveData: conn.saveData, // Apakah mode hemat data aktif?
  };
};

/**
 * FUNGSI UTAMA: Mengumpulkan semua telemetri perangkat.
 */
export const getDeviceTelemetry = async () => {
  // 1. Inisialisasi FingerprintJS
  let visitorId = 'unknown';
  try {
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    visitorId = result.visitorId;
  } catch (error) {
    console.warn('Telemetry: Gagal memuat FingerprintJS', error);
  }

  // 2. Kumpulkan Data Browser Standar
  const browserData = {
    userAgent: navigator.userAgent,
    language: navigator.language || (navigator as any).userLanguage,
    languages: navigator.languages, // Array bahasa yang disukai
    platform: navigator.platform, // e.g., 'Win32', 'MacIntel'
    cookieEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack,
    hardwareConcurrency: navigator.hardwareConcurrency, // Jumlah core CPU
    deviceMemory: (navigator as any).deviceMemory, // Estimasi RAM (hanya Chrome)
  };

  // 3. Kumpulkan Data Layar
  const screenData = {
    width: window.screen.width,
    height: window.screen.height,
    availWidth: window.screen.availWidth,
    availHeight: window.screen.availHeight,
    colorDepth: window.screen.colorDepth,
    pixelRatio: window.devicePixelRatio,
  };

  // 4. Kumpulkan Data Waktu (Penting untuk deteksi VPN mismatch)
  const timeData = {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: new Date().getTimezoneOffset(), // Selisih menit dari UTC
  };

  // 5. Gabungkan Semua
  return {
    visitor_id: visitorId, // Hash unik perangkat
    gpu: getGpuInfo(), // Info Hardware Grafis
    network: getConnectionInfo(), // Info Koneksi (Speed/Type)
    browser: browserData, // Info Browser/OS
    screen: screenData, // Info Layar
    time: timeData, // Info Waktu
    referrer: document.referrer || 'Direct', // Dari mana user datang
    url: window.location.href, // URL saat ini
    ga_enabled: typeof (window as any).gtag === 'function', // Status Google Analytics
  };
};

/**
 * Inisialisasi Google Analytics secara dinamis.
 * Hanya dipanggil jika user menyetujui cookie non-esensial.
 */
export const initializeGoogleAnalytics = (measurementId: string) => {
  if (!measurementId) {
    console.warn('Google Analytics: Measurement ID tidak ditemukan.');
    return;
  }

  if ((window as any).gtag) {
    console.log('Google Analytics sudah aktif.');
    return;
  }

  // 1. Inject Script Tag
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  // 2. Initialize DataLayer
  (window as any).dataLayer = (window as any).dataLayer || [];
  function gtag(...args: any[]) {
    (window as any).dataLayer.push(arguments);
  }
  gtag('js', new Date());

  // 3. Config
  gtag('config', measurementId);
  (window as any).gtag = gtag; // Expose global function

  console.log(`Google Analytics (${measurementId}) diaktifkan.`);
};

// ===== MICROSOFT CLARITY API WRAPPERS =====

/**
 * Cek apakah Clarity sudah dimuat.
 */
const isClarityLoaded = () => typeof (window as any).clarity === 'function';

/**
 * Identifikasi user yang login ke Clarity.
 * @param {string} userId - ID unik user
 * @param {string} [friendlyName] - Nama yang ditampilkan (opsional)
 * @param {string} [sessionId] - Custom session ID (opsional)
 * @param {string} [pageId] - Custom page ID (opsional)
 */
export const clarityIdentify = (
  userId: string,
  friendlyName: string | null = null,
  sessionId: string | null = null,
  pageId: string | null = null,
) => {
  if (!isClarityLoaded()) return;
  try {
    (window as any).clarity('identify', userId, sessionId, pageId, friendlyName);
    console.log(`[Clarity] Identified user: ${userId}`);
  } catch (e) {
    console.warn('[Clarity] Identify failed:', e);
  }
};

/**
 * Set custom tag untuk session Clarity.
 * @param {string} key - Nama tag
 * @param {string|string[]} value - Nilai tag (bisa array)
 */
export const claritySetTag = (key: string, value: string | string[]) => {
  if (!isClarityLoaded()) return;
  try {
    (window as any).clarity('set', key, value);
    console.log(`[Clarity] Tag set: ${key}=${value}`);
  } catch (e) {
    console.warn('[Clarity] Set tag failed:', e);
  }
};

/**
 * Track custom event di Clarity.
 * @param {string} eventName - Nama event
 */
export const clarityEvent = (eventName: string) => {
  if (!isClarityLoaded()) return;
  try {
    (window as any).clarity('event', eventName);
    console.log(`[Clarity] Event tracked: ${eventName}`);
  } catch (e) {
    console.warn('[Clarity] Event failed:', e);
  }
};

/**
 * Prioritaskan session ini untuk direkam (jika melebihi kuota harian).
 * @param {string} reason - Alasan upgrade
 */
export const clarityUpgrade = (reason: string) => {
  if (!isClarityLoaded()) return;
  try {
    (window as any).clarity('upgrade', reason);
    console.log(`[Clarity] Session upgraded: ${reason}`);
  } catch (e) {
    console.warn('[Clarity] Upgrade failed:', e);
  }
};

/**
 * Memberikan consent untuk Clarity (GDPR compliance).
 */
export const clarityConsent = () => {
  if (!isClarityLoaded()) return;
  try {
    (window as any).clarity('consent');
    console.log('[Clarity] Consent granted');
  } catch (e) {
    console.warn('[Clarity] Consent failed:', e);
  }
};

/**
 * Mengirim semua data telemetry ke Clarity sebagai custom tags.
 * Panggil ini saat app dimuat atau setelah login untuk tracking lengkap.
 */
export const claritySetAllTelemetry = async () => {
  if (!isClarityLoaded()) {
    console.warn('[Clarity] Not loaded, skipping telemetry tags');
    return;
  }

  try {
    // GPU Info
    const gpu = getGpuInfo();
    if (gpu) {
      claritySetTag('gpu_vendor', gpu.vendor || 'unknown');
      claritySetTag('gpu_renderer', gpu.renderer || 'unknown');
    }

    // Network Info (Chrome/Edge only)
    const network = getConnectionInfo();
    if (network) {
      claritySetTag('network_type', network.effectiveType || 'unknown');
      claritySetTag('network_downlink', String(network.downlink || 0));
      claritySetTag('data_saver', network.saveData ? 'on' : 'off');
    }

    // Browser/Device Info
    claritySetTag('platform', navigator.platform || 'unknown');
    claritySetTag('language', navigator.language || 'unknown');
    claritySetTag('cpu_cores', String(navigator.hardwareConcurrency || 0));
    if ((navigator as any).deviceMemory) {
      claritySetTag('device_memory', `${(navigator as any).deviceMemory}GB`);
    }

    // Screen Info
    claritySetTag(
      'screen_resolution',
      `${window.screen.width}x${window.screen.height}`,
    );
    claritySetTag('pixel_ratio', String(window.devicePixelRatio || 1));
    claritySetTag('color_depth', String(window.screen.colorDepth || 24));

    // Time/Timezone (VPN detection hint)
    claritySetTag('timezone', Intl.DateTimeFormat().resolvedOptions().timeZone);
    claritySetTag('timezone_offset', String(new Date().getTimezoneOffset()));

    // Referrer
    claritySetTag('referrer', document.referrer || 'direct');

    // FingerprintJS visitor ID (if available)
    try {
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      claritySetTag('visitor_id', result.visitorId);
    } catch (e) {
      // FingerprintJS failed, skip
    }

    console.log('[Clarity] All telemetry tags set successfully');
  } catch (e) {
    console.warn('[Clarity] Failed to set telemetry tags:', e);
  }
};
