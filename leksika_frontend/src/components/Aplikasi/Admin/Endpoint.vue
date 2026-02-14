<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { api, WS_BASE_URL } from '@/utils/api';

const emit = defineEmits<{
  (e: 'back'): void;
}>();

interface Endpoint {
  id: string | number;
  path: string;
  method: string;
  description?: string;
  last_status_code?: number;
  avg_latency_ms?: number;
  last_accessed_at?: string;
  [key: string]: any; // fallback for sort key
}

const endpoints = ref<Endpoint[]>([]);
const isConnected = ref(false); // Status koneksi WS
const searchQuery = ref('');
const connectionError = ref<string | null>(null); // Untuk menampilkan error
let socket: WebSocket | null = null;
let reconnectInterval: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// Sort State
const sortKey = ref<string>('last_accessed_at');
const sortOrder = ref<'asc' | 'desc'>('desc');

// --- Utility: Build WebSocket URL ---
const buildWsUrl = () => {
  const authStore = useAuthStore();
  const token = authStore.token || '';
  // Derive from WS_BASE_URL (already handles production vs development in api.js)
  const baseWsUrl = WS_BASE_URL + 'ws/endpoints/';
  return token ? `${baseWsUrl}?token=${encodeURIComponent(token)}` : baseWsUrl;
};

// --- Fallback: Fetch via HTTP API ---
const fetchEndpointsViaHttp = async () => {
  try {
    const response = await api.get('/admin/endpoints/');
    endpoints.value = response.data;
    connectionError.value = null;
  } catch (error) {
    console.error('HTTP Fallback Error:', error);
    connectionError.value = 'Gagal memuat data endpoint.';
  }
};

// --- WebSocket Logic ---
const connectWebSocket = () => {
  const wsUrl = buildWsUrl();
  console.log('WS Connecting to:', wsUrl.replace(/token=[^&]+/, 'token=***'));

  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    console.log('WS Connected: System Endpoints');
    isConnected.value = true;
    connectionError.value = null;
    reconnectAttempts = 0; // Reset counter on successful connection
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      // Update data secara realtime
      endpoints.value = data;
    } catch (e) {
      console.error('Error parsing WS message:', e);
    }
  };

  socket.onclose = (event) => {
    console.log('WS Disconnected', event.code, event.reason);
    isConnected.value = false;

    // Auto reconnect logic dengan batasan
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      if (!reconnectInterval) {
        reconnectInterval = setTimeout(() => {
          reconnectAttempts++;
          console.log(
            `WS Reconnect attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`,
          );
          connectWebSocket();
          reconnectInterval = null;
        }, 3000);
      }
    } else {
      console.log('WS Max reconnect attempts reached, falling back to HTTP');
      connectionError.value =
        'WebSocket tidak tersedia, menggunakan HTTP polling.';
      // Fallback ke HTTP polling setiap 5 detik
      startHttpPolling();
    }
  };

  socket.onerror = (error) => {
    console.error('WS Error:', error);
    if (socket) socket.close();
  };
};

// --- HTTP Polling Fallback ---
let httpPollingInterval: ReturnType<typeof setInterval> | null = null;
const startHttpPolling = () => {
  if (httpPollingInterval) return; // Prevent multiple intervals

  // Fetch immediately
  fetchEndpointsViaHttp();

  // Then poll every 5 seconds
  httpPollingInterval = setInterval(fetchEndpointsViaHttp, 5000);
};

const stopHttpPolling = () => {
  if (httpPollingInterval) {
    clearInterval(httpPollingInterval);
    httpPollingInterval = null;
  }
};

// --- Computed & Helpers (Sama seperti sebelumnya) ---

const processedEndpoints = computed(() => {
  let result = [...endpoints.value];

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(
      (ep) =>
        ep.path.toLowerCase().includes(q) ||
        ep.method.toLowerCase().includes(q),
    );
  }

  if (sortKey.value) {
    result.sort((a, b) => {
      let valA = a[sortKey.value];
      let valB = b[sortKey.value];
      if (valA === null || valA === undefined) valA = '';
      if (valB === null || valB === undefined) valB = '';
      if (valA < valB) return sortOrder.value === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder.value === 'asc' ? 1 : -1;
      return 0;
    });
  }
  return result;
});

const setSort = (key: string) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = key;
    sortOrder.value = 'asc';
  }
};

const getStatusColor = (code?: number) => {
  if (!code)
    return 'bg-[var(--color-surface-container-highest)] text-[var(--color-outline)] border-[var(--color-outline-variant)]';
  if (code >= 200 && code < 300)
    return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800';
  if (code >= 400 && code < 500)
    return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800';
  if (code >= 500)
    return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
  return 'bg-blue-100 text-blue-700 border-blue-200';
};

const getMethodBadge = (method: string) => {
  const colors: Record<string, string> = {
    GET: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
    POST: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800',
    PUT: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800',
    DELETE:
      'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800',
    PATCH:
      'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800',
  };
  return colors[method] || 'bg-gray-50 text-gray-700 border-gray-200';
};

const getLatencyClass = (ms?: number | null) => {
  if (ms === null || ms === undefined) return 'text-[var(--color-outline)]';
  if (ms < 100) return 'text-green-600 dark:text-green-400 font-bold';
  if (ms < 500) return 'text-orange-600 dark:text-orange-400 font-bold';
  return 'text-red-600 dark:text-red-400 font-bold';
};

// --- Format Date Helper ---
const formatLastAccess = (dateString?: string) => {
  if (!dateString) return 'Belum pernah';
  const date = new Date(dateString);
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yy}.${mm}.${dd} ${hh}:${min}:${ss}`;
};

// --- Lifecycle ---
onMounted(async () => {
  // Fetch data awal via HTTP untuk memastikan data langsung tersedia
  await fetchEndpointsViaHttp();
  // Kemudian koneksi ke WebSocket untuk update realtime
  connectWebSocket();
});

onUnmounted(() => {
  if (socket) socket.close();
  if (reconnectInterval) clearTimeout(reconnectInterval);
  stopHttpPolling();
});
</script>

<template>
  <div class="px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8 bg-[var(--color-surface-container)] min-h-screen rounded-3xl w-full h-full flex flex-col">
    
    <header class="flex items-center mb-6 flex-shrink-0">
      <button @click="emit('back')" class="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-highest)] transition-colors" aria-label="Kembali">
        <span class="material-symbols-outlined">arrow_back</span>
      </button>
      <div class="flex-grow text-center">
        <h1 class="text-xl font-bold text-[var(--color-on-background)] flex items-center justify-center gap-2">
            System Endpoints
            <span class="relative flex h-3 w-3">
              <span v-if="isConnected" class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span :class="isConnected ? 'bg-green-500' : 'bg-red-500'" class="relative inline-flex rounded-full h-3 w-3"></span>
            </span>
        </h1>
      </div>
      <div class="w-10"></div> </header>

    <div class="flex items-center justify-end gap-4 mb-4">
       <div class="relative w-full max-w-xs">
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Cari path atau method..." 
            class="w-full bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-[var(--color-on-surface)] placeholder-[var(--color-on-surface-variant)] transition-all"
          >
          <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-outline)] text-lg">search</span>
       </div>
    </div>

    <div class="flex-grow flex flex-col overflow-hidden">
      <main class="flex-1 bg-[var(--color-surface-container)] rounded-2xl overflow-hidden flex flex-col border border-[var(--color-outline-variant)]">
        <div class="overflow-x-auto flex-1">
          <table class="w-full text-left" style="min-width: 900px;">
            <thead class="sticky top-0 bg-[var(--color-surface-container-high)] z-10 border-b border-[var(--color-outline-variant)]">
              <tr>
                <th @click="setSort('method')" class="p-4 font-semibold text-[var(--color-on-surface)] w-28 cursor-pointer hover:bg-[var(--color-surface-container-highest)] transition-colors">
                  <div class="flex items-center gap-1">
                    <span>METHOD</span>
                    <span v-if="sortKey === 'method'" class="material-symbols-outlined text-sm">{{ sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</span>
                  </div>
                </th>
                <th @click="setSort('path')" class="p-4 font-semibold text-[var(--color-on-surface)] cursor-pointer hover:bg-[var(--color-surface-container-highest)] transition-colors">
                  <div class="flex items-center gap-1">
                    <span>PATH</span>
                    <span v-if="sortKey === 'path'" class="material-symbols-outlined text-sm">{{ sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</span>
                  </div>
                </th>
                <th @click="setSort('last_status_code')" class="p-4 font-semibold text-[var(--color-on-surface)] text-center w-32 cursor-pointer hover:bg-[var(--color-surface-container-highest)] transition-colors">
                  <div class="flex items-center justify-center gap-1">
                    <span>STATUS</span>
                    <span v-if="sortKey === 'last_status_code'" class="material-symbols-outlined text-sm">{{ sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</span>
                  </div>
                </th>
                <th @click="setSort('avg_latency_ms')" class="p-4 font-semibold text-[var(--color-on-surface)] text-center w-32 cursor-pointer hover:bg-[var(--color-surface-container-highest)] transition-colors">
                  <div class="flex items-center justify-center gap-1">
                    <span>LATENCY</span>
                    <span v-if="sortKey === 'avg_latency_ms'" class="material-symbols-outlined text-sm">{{ sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</span>
                  </div>
                </th>
                <th @click="setSort('last_accessed_at')" class="p-4 font-semibold text-[var(--color-on-surface)] text-right w-48 cursor-pointer hover:bg-[var(--color-surface-container-highest)] transition-colors">
                  <div class="flex items-center justify-end gap-1">
                    <span>LAST ACCESS</span>
                    <span v-if="sortKey === 'last_accessed_at'" class="material-symbols-outlined text-sm">{{ sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody class="bg-[var(--color-surface-container)] divide-y divide-[var(--color-outline-variant)]">
              
              <tr v-if="!isConnected && processedEndpoints.length === 0">
                 <td colspan="5" class="py-12 text-center">
                    <div class="flex flex-col items-center justify-center">
                        <span class="material-symbols-outlined animate-spin text-3xl mb-2 text-[var(--color-primary)]">sensors</span>
                        <span class="text-sm font-medium text-[var(--color-on-surface-variant)]">Menghubungkan ke Live Stream...</span>
                    </div>
                 </td>
              </tr>

              <tr v-else-if="processedEndpoints.length === 0">
                 <td colspan="5" class="py-12 text-center text-[var(--color-on-surface-variant)]">
                    <div class="flex flex-col items-center justify-center opacity-60">
                        <span class="material-symbols-outlined text-5xl mb-2">dns</span>
                        <span class="text-sm font-medium">Belum ada endpoint yang tercatat.</span>
                        <p class="text-xs mt-1">Coba akses fitur lain di aplikasi untuk memicu log.</p>
                    </div>
                 </td>
              </tr>

              <tr v-for="ep in processedEndpoints" :key="ep.id" class="hover:bg-[var(--color-surface-container-high)] transition-colors group">
                <td class="p-4 align-middle">
                  <span :class="['px-2 py-1 rounded text-[10px] font-black border tracking-wide uppercase', getMethodBadge(ep.method)]">
                    {{ ep.method }}
                  </span>
                </td>
                
                <td class="p-4 align-middle">
                  <div class="font-mono text-sm font-medium text-[var(--color-on-surface)] truncate max-w-md" :title="ep.path">
                    {{ ep.path }}
                  </div>
                  <div v-if="ep.description" class="text-xs text-[var(--color-on-surface-variant)] mt-1 line-clamp-1">
                    {{ ep.description }}
                  </div>
                </td>

                <td class="p-4 align-middle text-center">
                  <span :class="['inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border', getStatusColor(ep.last_status_code)]">
                    {{ ep.last_status_code || '-' }}
                  </span>
                </td>

                <td class="p-4 align-middle text-center">
                  <span class="text-sm font-mono" :class="getLatencyClass(ep.avg_latency_ms)">
                    {{ ep.avg_latency_ms !== null ? ep.avg_latency_ms + 'ms' : '-' }}
                  </span>
                </td>

                <td class="p-4 align-middle text-right">
                  <span class="text-xs text-[var(--color-on-surface-variant)] font-medium">
                    {{ formatLastAccess(ep.last_accessed_at) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div class="p-4 bg-[var(--color-surface-container-high)] border-t border-[var(--color-outline-variant)] flex justify-between items-center text-xs text-[var(--color-on-surface-variant)] font-medium">
            <span class="flex items-center gap-2">
               <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
               Live Monitoring
            </span>
            <span>Total: <b class="text-[var(--color-on-surface)]">{{ endpoints.length }}</b> | Menampilkan: <b class="text-[var(--color-on-surface)]">{{ processedEndpoints.length }}</b></span>
        </div>

      </main>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: var(--color-outline-variant);
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: var(--color-outline);
}
</style>
