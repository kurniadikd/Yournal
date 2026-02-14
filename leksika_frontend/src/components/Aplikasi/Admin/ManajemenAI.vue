<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { api } from '@/utils/api';
import { useUIStore } from '@/stores/ui';
import {
  TransitionRoot,
  TransitionChild,
  Dialog,
  DialogPanel,
  DialogTitle,
  RadioGroup,
  RadioGroupLabel,
  RadioGroupOption,
} from '@headlessui/vue';
import draggable from 'vuedraggable';
import LoadingSpinner from '@/components/LoadingSpinner.vue';

const emit = defineEmits(['back']);
const uiStore = useUIStore();

// --- INTERFACES ---
interface AiKey {
  id: number;
  masked_key: string;
  cooldown_until?: number | null;
  last_executed?: number | null;
  model_cooldowns?: Array<{ model: string; cooldown_until: number }>;
  model_last_executed?: Record<string, number>;
}

interface AiMonitorData {
  mode: string;
  total_requests: number;
  default_tts_model?: string;
  completion_models?: string[];
  server_time: number;
  api_keys: AiKey[];
}

  interface AppSettings {
  is_scraper_enabled?: boolean;
  is_ai_via_browser_enabled?: boolean;
  is_ai_via_telegram_enabled?: boolean;
  is_ai_via_groq_enabled?: boolean;
  browser_ai_provider?: string;
  [key: string]: any;
}

interface AiModel {
  id: number | null;
  name: string;
  model_string: string;
  type: 'completion' | 'tts';
  is_active: boolean;
}

const aiMonitorData = ref<AiMonitorData | null>(null);
const isLoading = ref(false);
const isError = ref(false);
const appSettings = ref<AppSettings | null>(null);

// --- TELEGRAM LOGIN STATE ---
const telegramStatus = ref('Checking...');
const loginStep = ref<'start' | 'code' | 'password'>('start'); 
const telegramPhone = ref('');
const telegramCode = ref('');
const telegramPassword = ref('');
const telegramMsg = ref('');
const telegramChats = ref<string[][]>([]); // Array of [name, id] tuples
const connectedGroup = ref<string | null>(null);

const configurableAiModels = ref<AiModel[]>([]);
const showEditModal = ref(false);
const showDeleteModal = ref(false);
const currentModel = ref<AiModel | null>(null);
const form = ref<AiModel>({
  id: null,
  name: '',
  model_string: '',
  type: 'completion',
  is_active: true,
});
const formError = ref<string | null>(null);
const isCompletionOrderDirty = ref(false);
const isTtsOrderDirty = ref(false);
const originalCompletionModels = ref<AiModel[]>([]);
const originalTtsModels = ref<AiModel[]>([]);

const modelTypes = [
  { id: 'completion', label: 'Completion' },
  { id: 'tts', label: 'Text-to-Speech (TTS)' },
] as const;

const computedCompletionModels = computed({
  get: () =>
    configurableAiModels.value.filter((model) => model.type === 'completion'),
  set: (newOrder: AiModel[]) => {
    const ttsModels = configurableAiModels.value.filter(
      (model) => model.type === 'tts',
    );
    configurableAiModels.value = [...newOrder, ...ttsModels];
  },
});

const computedTtsModels = computed({
  get: () => configurableAiModels.value.filter((model) => model.type === 'tts'),
  set: (newOrder: AiModel[]) => {
    const completionModels = configurableAiModels.value.filter(
      (model) => model.type === 'completion',
    );
    configurableAiModels.value = [...completionModels, ...newOrder];
  },
});

const fetchAiMonitorData = async () => {
  isError.value = false;
  try {
    const response = await api.get('/admin/ai/monitor/');
    aiMonitorData.value = response.data;
  } catch (err) {
    console.error(err);
    isError.value = true;
  }
};

const fetchConfigurableAiModels = async () => {
  isLoading.value = true;
  try {
    const response = await api.get('/admin/ai-models/');
    configurableAiModels.value = response.data;
    originalCompletionModels.value = JSON.parse(
      JSON.stringify(computedCompletionModels.value),
    );
    originalTtsModels.value = JSON.parse(
      JSON.stringify(computedTtsModels.value),
    );
  } catch (err) {
    console.error(err);
  } finally {
    isLoading.value = false;
  }
};

const fetchAppSettings = async () => {
  try {
    const response = await api.get('/admin/app-settings/');
    appSettings.value = response.data as AppSettings;

    if (
      appSettings.value &&
      appSettings.value.is_ai_via_browser_enabled === undefined
    ) {
      appSettings.value.is_ai_via_browser_enabled =
        aiMonitorData.value?.mode?.toLowerCase().includes('browser') || false;
    }
  } catch (err) {
    console.error(err);
  }
};

const updateAppSettings = async (payload: Partial<AppSettings>) => {
  try {
    const response = await api.patch('/admin/app-settings/', payload);
    appSettings.value = { ...appSettings.value, ...response.data };

    if (payload.hasOwnProperty('is_ai_via_browser_enabled')) {
      setTimeout(fetchAiMonitorData, 1000);
    }
  } catch (err) {
    console.error(err);
  }
};

// --- TELEGRAM LOGIN FUNCTIONS ---
const checkTelegramStatus = async () => {
  try {
    const res = await api.get('/admin/telegram/status');
    const status = res.data.status;
    telegramStatus.value = status;

    // Auto-fetch chats if connected
    if (status.startsWith('Connected')) {
      fetchTelegramChats();
    }
  } catch (e) {
    if (e.response && e.response.status === 500) {
      // Backend throw 500 on auth restart needed
      telegramStatus.value = 'Authorization Required (Session Invalid)';
      telegramMsg.value = ''; // Clear stale success messages
    } else {
      telegramStatus.value = 'Connection Error: ' + (e.message || 'Unknown');
      telegramMsg.value = '';
    }
  }
};

const fetchTelegramChats = async () => {
  try {
    const res = await api.get('/admin/telegram/chats');
    telegramChats.value = res.data.chats;
  } catch (e) {
    console.error('Failed to fetch chats', e);
  }
};

const startTelegramLogin = async () => {
  telegramMsg.value = 'Mengirim request...';
  try {
    await api.post('/admin/telegram/login/start', {
      phone: telegramPhone.value,
    });
    loginStep.value = 'code';
    telegramMsg.value = 'Kode terkirim ke Telegram Anda.';
  } catch (e) {
    telegramMsg.value = 'Gagal: ' + (e.response?.data?.error || e.message);
  }
};

const verifyTelegramCode = async () => {
  telegramMsg.value = 'Memverifikasi kode...';
  try {
    const res = await api.post('/admin/telegram/login/verify-code', {
      code: telegramCode.value,
    });
    if (res.data.status === 'PasswordRequired') {
      loginStep.value = 'password';
      telegramMsg.value = '2FA aktif. Masukkan password.';
    } else {
      await checkTelegramStatus();
      telegramMsg.value = 'Berhasil Login!';
      loginStep.value = 'start';
    }
  } catch (e: any) {
    telegramMsg.value = 'Gagal kode: ' + (e.response?.data?.error || e.message);
  }
};

const verifyTelegramPassword = async () => {
  telegramMsg.value = 'Memverifikasi password...';
  try {
    await api.post('/admin/telegram/login/verify-password', {
      password: telegramPassword.value,
    });
    await checkTelegramStatus();
    telegramMsg.value = 'Berhasil Login!';
    loginStep.value = 'start';
  } catch (e: any) {
    telegramMsg.value =
      'Gagal password: ' + (e.response?.data?.error || e.message);
  }
};

const logoutTelegram = async () => {
  if (!confirm('Yakin ingin logout dari Telegram session ini?')) return;
  try {
    await api.post('/admin/telegram/logout');
    await checkTelegramStatus();
    telegramMsg.value = 'Anda telah logout.';
  } catch (e) {
    telegramMsg.value = 'Gagal logout';
  }
};

const wiktionaryTestWord = ref('run');
const wiktionaryTestLang = ref('en');
const wiktionaryTestResult = ref<string | null>(null);
const isTestingWiktionary = ref(false);

const testWiktionary = async () => {
  isTestingWiktionary.value = true;
  wiktionaryTestResult.value = null;
  try {
    const res = await api.post('/ai/test_wiktionary', {
      word: wiktionaryTestWord.value,
      lang_code: wiktionaryTestLang.value,
    });
    wiktionaryTestResult.value = res.data ? JSON.stringify(res.data, null, 2) : 'No result (None)';
  } catch (e: any) {
    wiktionaryTestResult.value =
      'Error: ' + (e.response?.data?.error || e.message);
  } finally {
    isTestingWiktionary.value = false;
  }
};

const saveModelOrder = async (type: 'completion' | 'tts') => {
  try {
    let orderedIds: Array<number | null>;
    if (type === 'completion') {
      orderedIds = computedCompletionModels.value.map((model) => model.id);
      await api.post('/admin/ai-models/reorder/', {
        ordered_ids: orderedIds,
        type: 'completion',
      });
      originalCompletionModels.value = JSON.parse(
        JSON.stringify(computedCompletionModels.value),
      );
      isCompletionOrderDirty.value = false;
    } else if (type === 'tts') {
      orderedIds = computedTtsModels.value.map((model) => model.id);
      await api.post('/admin/ai-models/reorder/', {
        ordered_ids: orderedIds,
        type: 'tts',
      });
      originalTtsModels.value = JSON.parse(
        JSON.stringify(computedTtsModels.value),
      );
      isTtsOrderDirty.value = false;
    }
  } catch (err) {
    console.error(err);
  }
};

watch(
  computedCompletionModels,
  (newValue) => {
    isCompletionOrderDirty.value =
      JSON.stringify(newValue.map((m) => m.id)) !==
      JSON.stringify(originalCompletionModels.value.map((m) => m.id));
  },
  { deep: true },
);

watch(
  computedTtsModels,
  (newValue) => {
    isTtsOrderDirty.value =
      JSON.stringify(newValue.map((m) => m.id)) !==
      JSON.stringify(originalTtsModels.value.map((m) => m.id));
  },
  { deep: true },
);

onMounted(() => {
  fetchAiMonitorData();
  fetchConfigurableAiModels();
  fetchAppSettings();
  checkTelegramStatus();
});

const formatTime = (timestamp: number | undefined | null) => {
  if (!timestamp || timestamp === 0) return 'N/A';
  const date = new Date(timestamp * 1000);
  return date.toLocaleString();
};

const getCooldownStatus = (cooldownUntil: number | undefined | null) => {
  if (
    !aiMonitorData.value?.server_time ||
    !cooldownUntil ||
    cooldownUntil <= aiMonitorData.value.server_time
  ) {
    return { text: 'Siap', active: false };
  }
  const remaining = Math.ceil(cooldownUntil - aiMonitorData.value.server_time);
  return { text: `Cooldown (${remaining}s)`, active: true };
};

const getModelCooldownStatus = (modelCooldowns: Array<{ model: string; cooldown_until: number }> | undefined, modelName: string) => {
  if (!aiMonitorData.value?.server_time || !modelCooldowns) {
    return { text: 'Siap', active: false };
  }
  const modelCooldown = modelCooldowns.find((m) => m.model === modelName);
  if (!modelCooldown) {
    return { text: 'Siap', active: false };
  }
  const cooldownUntil = modelCooldown.cooldown_until;
  if (cooldownUntil <= aiMonitorData.value.server_time) {
    return { text: 'Siap', active: false };
  }
  const remaining = Math.ceil(cooldownUntil - aiMonitorData.value.server_time);
  return { text: `Cooldown (${remaining}s)`, active: true };
};

const getModelLastExecuted = (modelLastExecuted: Record<string, number> | undefined, modelName: string) => {
  if (!modelLastExecuted || !modelLastExecuted[modelName]) return 'N/A';
  return formatTime(modelLastExecuted[modelName]);
};

const allModels = computed(() => {
  if (!aiMonitorData.value) return [];
  const completion = aiMonitorData.value.completion_models || [];
  const tts = aiMonitorData.value.default_tts_model;

  const models = [...completion];
  if (tts) models.push(tts);

  return [...new Set(models)];
});

const openEditModal = (model: AiModel | null = null, defaultType: 'completion' | 'tts' = 'completion') => {
  formError.value = null;
  if (model) {
    currentModel.value = model;
    form.value = { ...model };
  } else {
    currentModel.value = null;
    form.value = {
      id: null,
      name: '',
      model_string: '',
      type: defaultType,
      is_active: true,
    };
  }
  showEditModal.value = true;
};

const saveModel = async () => {
  formError.value = null;
  try {
    if (form.value.id) {
      await api.put(`/admin/ai-models/${form.value.id}/`, {
        name: form.value.name,
        model_string: form.value.model_string,
        is_active: form.value.is_active,
        type: form.value.type,
      });
    } else {
      await api.post('/admin/ai-models/', form.value);
    }
    showEditModal.value = false;
    await fetchConfigurableAiModels();
  } catch (err: any) {
    console.error(err);
    formError.value =
      err.response?.data?.detail || 'Terjadi kesalahan saat menyimpan model.';
  }
};

const openDeleteModal = (model: AiModel) => {
  currentModel.value = model;
  showDeleteModal.value = true;
};

const confirmDelete = async () => {
  if (!currentModel.value?.id) return;
  try {
    await api.delete(`/admin/ai-models/${currentModel.value.id}/`);
    showDeleteModal.value = false;
    await fetchConfigurableAiModels();
  } catch (err) {
    console.error(err);
  }
};

const copyToClipboard = (text: string) => {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
  }
};
</script>

<style>
.ghost-model {
  opacity: 0.5;
  background: var(--color-outline-variant);
}
</style>

<template>
  <div class="px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8 bg-[var(--color-surface-container)] min-h-screen rounded-3xl w-full h-full flex flex-col">
    <header class="flex items-center mb-6 flex-shrink-0">
      <button @click="emit('back')" class="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-highest)] transition-colors" aria-label="Kembali">
        <span class="material-symbols-outlined">arrow_back</span>
      </button>
      <div class="flex-grow text-center">
        <h1 class="text-xl font-bold text-[var(--color-on-background)]">Manajemen AI</h1>
      </div>
      <div class="w-10 flex items-center justify-center space-x-2">
        <button @click="fetchAiMonitorData" :disabled="isLoading" class="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-highest)] transition-colors" title="Refresh Data">
          <span class="material-symbols-outlined" :class="{ 'animate-spin': isLoading, 'rotate-180': isLoading }">refresh</span>
        </button>
      </div>
    </header>

    <div v-if="isLoading && !aiMonitorData" class="text-center py-12 flex-grow flex items-center justify-center">
      <div class="flex flex-col items-center gap-3">
        <LoadingSpinner size="xl" color="outline" />
        <p class="text-[var(--color-on-surface-variant)]">Memuat data monitoring AI...</p>
      </div>
    </div>
    <div v-else-if="isError" class="text-center text-[var(--color-error)] py-12 flex-grow flex items-center justify-center bg-[var(--color-error-container)] rounded-2xl p-4">
      <p class="text-[var(--color-on-error-container)]">Gagal memuat data monitoring AI.</p>
    </div>

    <div v-else-if="aiMonitorData" class="flex-grow flex flex-col overflow-hidden">
      <main class="flex-1 overflow-y-auto p-4 space-y-6">
        
        <div>
            <h2 class="text-lg font-semibold text-[var(--color-on-background)] mb-4">Statistik Global</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="bg-[var(--color-surface-container-high)] p-4 rounded-lg shadow">
                <p class="text-[var(--color-on-surface-variant)]">Total Permintaan AI:</p>
                <p class="text-2xl font-bold text-[var(--color-primary)]">{{ aiMonitorData.total_requests }}</p>
              </div>
              <div class="bg-[var(--color-surface-container-high)] p-4 rounded-lg shadow">
                <p class="text-[var(--color-on-surface-variant)]">Status Mode Saat Ini:</p>
                <p class="text-2xl font-bold" :class="aiMonitorData.mode?.includes('BROWSER') ? 'text-[var(--color-tertiary)]' : 'text-[var(--color-secondary)]'">
                    {{ aiMonitorData.mode || 'Unknown' }}
                </p>
              </div>
            </div>
        </div>

        <div class="bg-[var(--color-surface-container-high)] p-4 rounded-2xl shadow">
            <h2 class="text-lg font-semibold text-[var(--color-on-background)] mb-4">Pengaturan Aplikasi Global</h2>
            <div v-if="appSettings" class="space-y-6">
                
                <div class="flex items-center justify-between">
                    <div>
                        <span class="block text-sm font-medium text-[var(--color-on-background)]">Aktifkan Scraper/Fetch Data</span>
                        <span class="block text-xs text-[var(--color-on-surface-variant)]">Mengambil data konteks dari Wiktionary.</span>
                    </div>
                    <div
                      class="md-switch group relative inline-flex items-center flex-shrink-0"
                      :class="{ 'selected': appSettings.is_scraper_enabled }"
                      @click="updateAppSettings({ is_scraper_enabled: !appSettings.is_scraper_enabled })"
                      role="switch"
                      :aria-checked="appSettings.is_scraper_enabled"
                      aria-label="Aktifkan Scraper/Fetch Data"
                      tabindex="0"
                      @keydown.space.prevent="updateAppSettings({ is_scraper_enabled: !appSettings.is_scraper_enabled })"
                      @keydown.enter.prevent="updateAppSettings({ is_scraper_enabled: !appSettings.is_scraper_enabled })"
                    >
                      <div
                          class="track h-[32px] w-[52px] rounded-full border-2 transition-colors duration-200 ease-in-out cursor-pointer relative"
                          :class="[
                              appSettings.is_scraper_enabled
                              ? 'bg-[var(--color-primary)] border-[var(--color-primary)] group-hover:bg-[var(--color-primary-fixed-dim)]'
                              : 'bg-[var(--color-surface-container-highest)] border-[var(--color-outline)] group-hover:bg-[var(--color-surface-container-high)] group-hover:border-[var(--color-outline)]'
                          ]"
                      >
                          <div class="handle-container absolute top-0 left-0 h-full w-full pointer-events-none">
                              <div
                                  class="handle absolute top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)] shadow-sm"
                                  :class="[
                                      appSettings.is_scraper_enabled
                                          ? 'h-[24px] w-[24px] bg-[var(--color-on-primary)] left-[calc(100%-24px-4px)]' 
                                          : 'h-[16px] w-[16px] bg-[var(--color-outline)] left-[6px] group-hover:bg-[var(--color-on-surface-variant)]',
                                      'group-active:h-[28px] group-active:w-[28px]',
                                      appSettings.is_scraper_enabled ? 'group-active:left-[calc(100%-28px-2px)]' : 'group-active:left-[2px]'
                                  ]"
                              >
                                  <svg v-if="appSettings.is_scraper_enabled" xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 -960 960 960" width="16" class="fill-[var(--color-primary)] opacity-100"><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/></svg>
                                  <svg v-if="!appSettings.is_scraper_enabled" xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 -960 960 960" width="16" class="fill-[var(--color-surface-container-highest)] opacity-100"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>
                              </div>
                          </div>
                      </div>
                    </div>
                </div>

                <!-- Wiktionary Test Tool -->
                <div v-if="appSettings.is_scraper_enabled" class="mt-2 bg-[var(--color-surface)] p-3 rounded-lg border border-[var(--color-outline-variant)]">
                    <p class="text-xs font-bold mb-2 text-[var(--color-on-surface)]">Test Wiktionary Fetch:</p>
                    <div class="flex gap-2 mb-2">
                        <input v-model="wiktionaryTestWord" class="p-1 text-xs border border-[var(--color-outline)] rounded bg-[var(--color-surface-container)] text-[var(--color-on-surface)] w-24" placeholder="Word (e.g. run)">
                        <input v-model="wiktionaryTestLang" class="p-1 text-xs border border-[var(--color-outline)] rounded bg-[var(--color-surface-container)] text-[var(--color-on-surface)] w-16" placeholder="Lang (e.g. en)">
                        <button @click="testWiktionary" :disabled="isTestingWiktionary" class="px-2 py-1 bg-[var(--color-primary)] text-[var(--color-on-primary)] text-xs rounded hover:opacity-90">
                            {{ isTestingWiktionary ? 'Fetching...' : 'Test' }}
                        </button>
                    </div>
                    <div v-if="wiktionaryTestResult" class="text-xs bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface)] p-2 rounded max-h-32 overflow-y-auto whitespace-pre-wrap font-mono border border-[var(--color-outline-variant)]">
                        {{ wiktionaryTestResult }}
                    </div>
                </div>


                <hr class="border-[var(--color-outline-variant)]">

                <div class="flex items-center justify-between">
                    <div>
                        <span class="block text-sm font-medium text-[var(--color-on-background)]">Mode Browser AI (ChatGPT)</span>
                        <span class="block text-xs text-[var(--color-on-surface-variant)] mt-1">
                            <span v-if="appSettings.is_ai_via_browser_enabled" class="text-[var(--color-tertiary)] font-bold">AKTIF:</span>
                            <span v-else class="text-[var(--color-secondary)] font-bold">MATI:</span>
                            {{ appSettings.is_ai_via_browser_enabled 
                                ? 'Menggunakan Browser Otomatis (Selenium) di Port 9222. Backend restart mungkin diperlukan.' 
                                : 'Menggunakan API Resmi (Google Gemini/OpenAI). Lebih cepat & stabil.' 
                            }}
                        </span>
                    </div>
                    <div
                      class="md-switch group relative inline-flex items-center flex-shrink-0"
                      :class="{ 'selected': appSettings.is_ai_via_browser_enabled }"
                      @click="updateAppSettings({ is_ai_via_browser_enabled: !appSettings.is_ai_via_browser_enabled })"
                      role="switch"
                      :aria-checked="appSettings.is_ai_via_browser_enabled"
                      aria-label="Mode Browser AI"
                      tabindex="0"
                      @keydown.space.prevent="updateAppSettings({ is_ai_via_browser_enabled: !appSettings.is_ai_via_browser_enabled })"
                      @keydown.enter.prevent="updateAppSettings({ is_ai_via_browser_enabled: !appSettings.is_ai_via_browser_enabled })"
                    >
                      <div
                          class="track h-[32px] w-[52px] rounded-full border-2 transition-colors duration-200 ease-in-out cursor-pointer relative"
                          :class="[
                              appSettings.is_ai_via_browser_enabled
                                ? 'bg-[var(--color-tertiary)] border-[var(--color-tertiary)] group-hover:bg-[var(--color-tertiary-fixed-dim)]'
                                : 'bg-[var(--color-surface-container-highest)] border-[var(--color-outline)] group-hover:bg-[var(--color-surface-container-high)] group-hover:border-[var(--color-outline)]'
                          ]"
                      >
                          <div class="handle-container absolute top-0 left-0 h-full w-full pointer-events-none">
                              <div
                                  class="handle absolute top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)] shadow-sm"
                                  :class="[
                                      appSettings.is_ai_via_browser_enabled
                                          ? 'h-[24px] w-[24px] bg-[var(--color-on-tertiary)] left-[calc(100%-24px-4px)]'
                                          : 'h-[16px] w-[16px] bg-[var(--color-outline)] left-[6px] group-hover:bg-[var(--color-on-surface-variant)]',
                                      'group-active:h-[28px] group-active:w-[28px]',
                                      appSettings.is_ai_via_browser_enabled ? 'group-active:left-[calc(100%-28px-2px)]' : 'group-active:left-[2px]'
                                  ]"
                              >
                                  <svg v-if="appSettings.is_ai_via_browser_enabled" xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 -960 960 960" width="16" class="fill-[var(--color-tertiary)] opacity-100"><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/></svg>
                                  <svg v-if="!appSettings.is_ai_via_browser_enabled" xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 -960 960 960" width="16" class="fill-[var(--color-surface-container-highest)] opacity-100"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>
                              </div>
                          </div>
                      </div>
                    </div>
                </div>

                <!-- Browser AI Provider Selection -->
                <div v-if="appSettings.is_ai_via_browser_enabled" class="mt-4 p-4 bg-[var(--color-surface-container-highest)] rounded-xl border border-[var(--color-outline-variant)]">
                    <p class="text-sm font-medium text-[var(--color-on-background)] mb-3">Pilih Provider Browser AI:</p>
                    <div class="flex gap-3">
                        <button 
                            @click="updateAppSettings({ browser_ai_provider: 'chatgpt' })"
                            class="flex-1 py-3 px-4 rounded-xl border-2 transition-all flex flex-col items-center gap-1"
                            :class="[
                                appSettings.browser_ai_provider === 'chatgpt' || !appSettings.browser_ai_provider
                                ? 'bg-[var(--color-primary-container)] border-[var(--color-primary)] text-[var(--color-on-primary-container)] shadow-md'
                                : 'bg-[var(--color-surface)] border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)] hover:border-[var(--color-outline)]'
                            ]"
                        >
                            <span class="font-bold">ChatGPT</span>
                            <span class="text-[10px] opacity-70">chatgpt.com</span>
                        </button>
                        <button 
                            @click="updateAppSettings({ browser_ai_provider: 'gemini' })"
                            class="flex-1 py-3 px-4 rounded-xl border-2 transition-all flex flex-col items-center gap-1"
                            :class="[
                                appSettings.browser_ai_provider === 'gemini'
                                ? 'bg-[var(--color-tertiary-container)] border-[var(--color-tertiary)] text-[var(--color-on-tertiary-container)] shadow-md'
                                : 'bg-[var(--color-surface)] border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)] hover:border-[var(--color-outline)]'
                            ]"
                        >
                            <span class="font-bold">Gemini Chat</span>
                            <span class="text-[10px] opacity-70">gemini.google.com</span>
                        </button>
                        <button 
                            @click="updateAppSettings({ browser_ai_provider: 'google_ai' })"
                            class="flex-1 py-3 px-4 rounded-xl border-2 transition-all flex flex-col items-center gap-1"
                            :class="[
                                appSettings.browser_ai_provider === 'google_ai'
                                ? 'bg-[var(--color-secondary-container)] border-[var(--color-secondary)] text-[var(--color-on-secondary-container)] shadow-md'
                                : 'bg-[var(--color-surface)] border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)] hover:border-[var(--color-outline)]'
                            ]"
                        >
                            <span class="font-bold">Google AI</span>
                            <span class="text-[10px] opacity-70">AI Mode (Search)</span>
                        </button>
                    </div>
                    <p class="text-[10px] mt-3 text-[var(--color-on-surface-variant)] text-center italic">
                        * Mode ini memerlukan Browser (Chrome) berjalan di Background dengan Remote Debugging aktif.
                    </p>
                </div>

                <hr class="border-[var(--color-outline-variant)]">

                <!-- Telegram AI Service Mode -->
                <div class="flex items-center justify-between">
                    <div>
                        <span class="block text-sm font-medium text-[var(--color-on-background)]">AI Service via Telegram (Copilot Bot)</span>
                        <span class="block text-xs text-[var(--color-on-surface-variant)] mt-1">
                            <span v-if="appSettings.is_ai_via_telegram_enabled" class="text-[var(--color-tertiary)] font-bold">AKTIF:</span>
                            <span v-else class="text-[var(--color-secondary)] font-bold">MATI:</span>
                            {{ appSettings.is_ai_via_telegram_enabled 
                                ? 'Menggunakan akun Telegram untuk chat ke Copilot Bot.' 
                                : 'Telegram AI Service dinonaktifkan.' 
                            }}
                        </span>
                    </div>
                    <div
                      class="md-switch group relative inline-flex items-center flex-shrink-0"
                      :class="{ 'selected': appSettings.is_ai_via_telegram_enabled }"
                      @click="updateAppSettings({ is_ai_via_telegram_enabled: !appSettings.is_ai_via_telegram_enabled })"
                      role="switch"
                      :aria-checked="appSettings.is_ai_via_telegram_enabled"
                      aria-label="Mode Telegram AI"
                      tabindex="0"
                      @keydown.space.prevent="updateAppSettings({ is_ai_via_telegram_enabled: !appSettings.is_ai_via_telegram_enabled })"
                      @keydown.enter.prevent="updateAppSettings({ is_ai_via_telegram_enabled: !appSettings.is_ai_via_telegram_enabled })"
                    >
                      <div
                          class="track h-[32px] w-[52px] rounded-full border-2 transition-colors duration-200 ease-in-out cursor-pointer relative"
                          :class="[
                              appSettings.is_ai_via_telegram_enabled
                              ? 'bg-[var(--color-tertiary)] border-[var(--color-tertiary)] group-hover:bg-[var(--color-tertiary-fixed-dim)]'
                              : 'bg-[var(--color-surface-container-highest)] border-[var(--color-outline)] group-hover:bg-[var(--color-surface-container-high)] group-hover:border-[var(--color-outline)]'
                          ]"
                      >
                          <div class="handle-container absolute top-0 left-0 h-full w-full pointer-events-none">
                              <div
                                  class="handle absolute top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)] shadow-sm"
                                  :class="[
                                      appSettings.is_ai_via_telegram_enabled
                                          ? 'h-[24px] w-[24px] bg-[var(--color-on-tertiary)] left-[calc(100%-24px-4px)]' 
                                          : 'h-[16px] w-[16px] bg-[var(--color-outline)] left-[6px] group-hover:bg-[var(--color-on-surface-variant)]',
                                      'group-active:h-[28px] group-active:w-[28px]',
                                      appSettings.is_ai_via_telegram_enabled ? 'group-active:left-[calc(100%-28px-2px)]' : 'group-active:left-[2px]'
                                  ]"
                              >
                                  <svg v-if="appSettings.is_ai_via_telegram_enabled" xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 -960 960 960" width="16" class="fill-[var(--color-tertiary)] opacity-100"><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/></svg>
                                  <svg v-if="!appSettings.is_ai_via_telegram_enabled" xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 -960 960 960" width="16" class="fill-[var(--color-surface-container-highest)] opacity-100"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>
                              </div>
                          </div>
                      </div>
                    </div>
                </div>

                <!-- Telegram Login Wizard -->
                <div v-if="appSettings.is_ai_via_telegram_enabled" class="mt-4 bg-[var(--color-surface-container)] p-4 rounded-xl border border-[var(--color-outline-variant)]">
                   <div class="flex items-center justify-between mb-2">
                     <span :class="{'text-green-500': telegramStatus.startsWith('Connected'), 'text-red-500': !telegramStatus.startsWith('Connected')}" class="text-xs font-bold">{{ telegramStatus }}</span>
                   </div>

                   <!-- State: Error/Auth Required (Reset Button) -->
                   <div v-if="telegramStatus.includes('Error') || telegramStatus.includes('Required') || telegramStatus.includes('Invalid')" class="mb-4 text-right bg-red-50 p-2 rounded border border-red-200">
                       <p class="text-red-600 text-xs mb-2 text-left">Terjadi kesalahan sesi. Silakan reset koneksi untuk login ulang.</p>
                       <button @click="logoutTelegram" class="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 font-bold">Reset & Hapus Sesi</button>
                   </div>

                   <!-- Connected Info (Chats) -->
                   <div v-if="telegramStatus.startsWith('Connected')" class="mb-4 p-3 bg-[var(--color-surface)] rounded-lg text-xs border border-[var(--color-outline-variant)]">
                        <div class="flex justify-between items-center mb-2">
                             <span class="font-bold text-[var(--color-on-surface)]">Available Group Chats (Top 10):</span>
                             <button @click="fetchTelegramChats" class="text-[var(--color-primary)] hover:underline">Refresh</button>
                        </div>
                        <ul class="space-y-1 max-h-32 overflow-y-auto">
                            <li v-for="chat in telegramChats" :key="chat[1]" class="flex justify-between items-center p-1 hover:bg-[var(--color-surface-container-high)] rounded">
                                <span class="truncate max-w-[60%]">{{ chat[0] }}</span>
                                <code class="bg-[var(--color-surface-container-highest)] px-1 rounded select-all cursor-pointer" @click="copyToClipboard(chat[1])" title="Click to copy">{{ chat[1] }}</code>
                            </li>
                        </ul>
                        <p class="mt-2 text-[var(--color-secondary)] italic">
                            * Copy ID grup yang berisi @CopilotOfficialBot dan masukkan ke .env: <br>
                            <code>TELEGRAM_COPILOT_GROUP_ID=-100xxxx</code>
                        </p>
                        <div class="mt-2 text-right">
                             <button @click="logoutTelegram" class="text-red-500 hover:underline text-xs">Logout Telegram Session</button>
                        </div>
                   </div>
                   
                   <!-- State: Not Connected -->
                   <div v-if="loginStep === 'start' && !telegramStatus.startsWith('Connected')" class="flex gap-2">
                      <input v-model="telegramPhone" placeholder="+62..." class="flex-1 text-sm rounded bg-[var(--color-surface)] border-gray-300 p-2" />
                      <button @click="startTelegramLogin" class="bg-[var(--color-primary)] text-[var(--color-on-primary)] px-3 py-1 rounded text-sm hover:opacity-90">Kirim Kode</button>
                   </div>

                   <!-- State: Enter Code -->
                   <div v-if="loginStep === 'code'" class="flex gap-2">
                      <input v-model="telegramCode" placeholder="Masukkan Kode Login..." class="flex-1 text-sm rounded bg-[var(--color-surface)] border-gray-300 p-2" />
                      <button @click="verifyTelegramCode" class="bg-[var(--color-primary)] text-[var(--color-on-primary)] px-3 py-1 rounded text-sm hover:opacity-90">Verifikasi</button>
                   </div>

                   <!-- State: Enter Password (2FA) -->
                   <div v-if="loginStep === 'password'" class="flex gap-2">
                      <input type="password" v-model="telegramPassword" placeholder="Masukkan Password 2FA..." class="flex-1 text-sm rounded bg-[var(--color-surface)] border-gray-300 p-2" />
                      <button @click="verifyTelegramPassword" class="bg-[var(--color-primary)] text-[var(--color-on-primary)] px-3 py-1 rounded text-sm hover:opacity-90">Login</button>
                   </div>
                   
                   <!-- State: Connected -->
                   <div v-if="telegramStatus.startsWith('Connected')" class="mt-2 text-right">
                      <button @click="logoutTelegram" class="text-red-500 text-xs hover:underline">Putuskan Koneksi (Logout)</button>
                   </div>

                   <div v-if="telegramMsg" class="mt-2 text-xs text-[var(--color-tertiary)]">{{ telegramMsg }}</div>
                </div>

                <hr class="border-[var(--color-outline-variant)]">

                <!-- Groq API Service Mode -->
                <div class="flex items-center justify-between">
                    <div>
                        <span class="block text-sm font-medium text-[var(--color-on-background)]">AI Service via Groq API</span>
                        <span class="block text-xs text-[var(--color-on-surface-variant)] mt-1">
                            <span v-if="appSettings.is_ai_via_groq_enabled" class="text-[var(--color-tertiary)] font-bold">AKTIF:</span>
                            <span v-else class="text-[var(--color-secondary)] font-bold">MATI:</span>
                            {{ appSettings.is_ai_via_groq_enabled 
                                ? 'Menggunakan Groq API sebagai utama. Fallback ke Google jika rate-limited.' 
                                : 'Groq AI Service dinonaktifkan. Menggunakan Google API.' 
                            }}
                        </span>
                    </div>
                    <div
                      class="md-switch group relative inline-flex items-center flex-shrink-0"
                      :class="{ 'selected': appSettings.is_ai_via_groq_enabled }"
                      @click="updateAppSettings({ is_ai_via_groq_enabled: !appSettings.is_ai_via_groq_enabled })"
                      role="switch"
                      :aria-checked="appSettings.is_ai_via_groq_enabled"
                      aria-label="Mode Groq AI"
                      tabindex="0"
                      @keydown.space.prevent="updateAppSettings({ is_ai_via_groq_enabled: !appSettings.is_ai_via_groq_enabled })"
                      @keydown.enter.prevent="updateAppSettings({ is_ai_via_groq_enabled: !appSettings.is_ai_via_groq_enabled })"
                    >
                      <div
                          class="track h-[32px] w-[52px] rounded-full border-2 transition-colors duration-200 ease-in-out cursor-pointer relative"
                          :class="[
                              appSettings.is_ai_via_groq_enabled
                              ? 'bg-[var(--color-tertiary)] border-[var(--color-tertiary)] group-hover:bg-[var(--color-tertiary-fixed-dim)]'
                              : 'bg-[var(--color-surface-container-highest)] border-[var(--color-outline)] group-hover:bg-[var(--color-surface-container-high)] group-hover:border-[var(--color-outline)]'
                          ]"
                      >
                          <div class="handle-container absolute top-0 left-0 h-full w-full pointer-events-none">
                              <div
                                  class="handle absolute top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)] shadow-sm"
                                  :class="[
                                      appSettings.is_ai_via_groq_enabled
                                          ? 'h-[24px] w-[24px] bg-[var(--color-on-tertiary)] left-[calc(100%-24px-4px)]' 
                                          : 'h-[16px] w-[16px] bg-[var(--color-outline)] left-[6px] group-hover:bg-[var(--color-on-surface-variant)]',
                                      'group-active:h-[28px] group-active:w-[28px]',
                                      appSettings.is_ai_via_groq_enabled ? 'group-active:left-[calc(100%-28px-2px)]' : 'group-active:left-[2px]'
                                  ]"
                              >
                                  <svg v-if="appSettings.is_ai_via_groq_enabled" xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 -960 960 960" width="16" class="fill-[var(--color-tertiary)] opacity-100"><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/></svg>
                                  <svg v-if="!appSettings.is_ai_via_groq_enabled" xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 -960 960 960" width="16" class="fill-[var(--color-surface-container-highest)] opacity-100"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>
                              </div>
                          </div>
                      </div>
                    </div>
                </div>

            </div>
            <div v-else class="text-center text-[var(--color-on-surface-variant)] py-4">
                Memuat pengaturan aplikasi...
            </div>
        </div>

        <div class="bg-[var(--color-surface-container-high)] p-4 rounded-2xl shadow">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-lg font-semibold text-[var(--color-on-background)]">Model AI Completion</h2>
            <div class="flex items-center space-x-2">
              <button v-if="isCompletionOrderDirty" @click="saveModelOrder('completion')" class="px-3 py-2 bg-[var(--color-tertiary)] text-[var(--color-on-tertiary)] rounded-xl font-medium hover:bg-[var(--color-tertiary-fixed-dim)] transition-colors flex items-center space-x-2 shadow-sm">
                <span class="material-symbols-outlined text-base">save</span>
                <span>Simpan Urutan</span>
              </button>
              <button @click="openEditModal(null, 'completion')" class="px-3 py-2 bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-xl font-medium hover:bg-[var(--color-primary-fixed-dim)] transition-colors flex items-center space-x-2 shadow-sm">
                <span class="material-symbols-outlined text-base">add</span>
                <span>Tambah Model</span>
              </button>
            </div>
          </div>
          <div v-if="computedCompletionModels.length === 0" class="text-center text-[var(--color-on-surface-variant)] py-4">
            Tidak ada model AI Completion yang dikonfigurasi.
          </div>
          <div v-else class="overflow-x-auto">
            <table class="min-w-full divide-y divide-[var(--color-outline-variant)]">
              <thead class="bg-[var(--color-surface-container-highest)]">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider w-16"></th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">Nama</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">Model String</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider w-20">Aktif</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider w-32">Aksi</th>
                </tr>
              </thead>
              <draggable v-model="computedCompletionModels" tag="tbody" item-key="id" handle=".drag-handle" ghost-class="ghost-model" class="divide-y divide-[var(--color-outline-variant)]">
                <template #item="{ element: model }">
                  <tr class="bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-container-highest)] transition-colors">
                    <td class="px-2 py-4 whitespace-nowrap text-sm text-[var(--color-on-surface-variant)] drag-handle cursor-grab">
                      <span class="material-symbols-outlined text-base">drag_indicator</span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--color-on-background)]">{{ model.name }}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-on-surface-variant)] font-mono">{{ model.model_string }}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                      <span :class="[model.is_active ? 'bg-[var(--color-tertiary-container)] text-[var(--color-on-tertiary-container)]' : 'bg-[var(--color-error-container)] text-[var(--color-on-error-container)]', 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full']">
                        {{ model.is_active ? 'Ya' : 'Tidak' }}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button @click.stop="openEditModal(model)" class="text-[var(--color-primary)] hover:text-[var(--color-primary-fixed-dim)] mr-3 transition-colors disabled:opacity-50" title="Edit"><span class="material-symbols-outlined text-lg">edit</span></button>
                      <button @click.stop="openDeleteModal(model)" class="text-[var(--color-error)] hover:text-[var(--color-error-container)] transition-colors disabled:opacity-50" title="Hapus"><span class="material-symbols-outlined text-lg">delete</span></button>
                    </td>
                  </tr>
                </template>
              </draggable>
            </table>
          </div>
        </div>

        <div class="bg-[var(--color-surface-container-high)] p-4 rounded-2xl shadow">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-lg font-semibold text-[var(--color-on-background)]">Model AI TTS</h2>
            <div class="flex items-center space-x-2">
              <button v-if="isTtsOrderDirty" @click="saveModelOrder('tts')" class="px-3 py-2 bg-[var(--color-tertiary)] text-[var(--color-on-tertiary)] rounded-xl font-medium hover:bg-[var(--color-tertiary-fixed-dim)] transition-colors flex items-center space-x-2 shadow-sm">
                <span class="material-symbols-outlined text-base">save</span>
                <span>Simpan Urutan</span>
              </button>
              <button @click="openEditModal(null, 'tts')" class="px-3 py-2 bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-xl font-medium hover:bg-[var(--color-primary-fixed-dim)] transition-colors flex items-center space-x-2 shadow-sm">
                <span class="material-symbols-outlined text-base">add</span>
                <span>Tambah Model</span>
              </button>
            </div>
          </div>
          <div v-if="computedTtsModels.length === 0" class="text-center text-[var(--color-on-surface-variant)] py-4">
            Tidak ada model AI TTS yang dikonfigurasi.
          </div>
          <div v-else class="overflow-x-auto">
            <table class="min-w-full divide-y divide-[var(--color-outline-variant)]">
              <thead class="bg-[var(--color-surface-container-highest)]">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider w-16"></th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">Nama</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">Model String</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider w-20">Aktif</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider w-32">Aksi</th>
                </tr>
              </thead>
              <draggable v-model="computedTtsModels" tag="tbody" item-key="id" handle=".drag-handle" ghost-class="ghost-model" class="divide-y divide-[var(--color-outline-variant)]">
                <template #item="{ element: model }">
                  <tr class="bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-container-highest)] transition-colors">
                    <td class="px-2 py-4 whitespace-nowrap text-sm text-[var(--color-on-surface-variant)] drag-handle cursor-grab">
                      <span class="material-symbols-outlined text-base">drag_indicator</span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--color-on-background)]">{{ model.name }}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-on-surface-variant)] font-mono">{{ model.model_string }}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                      <span :class="[model.is_active ? 'bg-[var(--color-tertiary-container)] text-[var(--color-on-tertiary-container)]' : 'bg-[var(--color-error-container)] text-[var(--color-on-error-container)]', 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full']">
                        {{ model.is_active ? 'Ya' : 'Tidak' }}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button @click.stop="openEditModal(model)" class="text-[var(--color-primary)] hover:text-[var(--color-primary-fixed-dim)] mr-3 transition-colors disabled:opacity-50" title="Edit"><span class="material-symbols-outlined text-lg">edit</span></button>
                      <button @click.stop="openDeleteModal(model)" class="text-[var(--color-error)] hover:text-[var(--color-error-container)] transition-colors disabled:opacity-50" title="Hapus"><span class="material-symbols-outlined text-lg">delete</span></button>
                    </td>
                  </tr>
                </template>
              </draggable>
            </table>
          </div>
        </div>

        <div class="bg-[var(--color-surface-container-high)] p-4 rounded-2xl shadow">
            <h2 class="text-lg font-semibold text-[var(--color-on-background)] mb-4">Status Kunci API</h2>
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-[var(--color-outline-variant)]">
                <thead class="bg-[var(--color-surface-container-highest)]">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">ID</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">Kunci (Masked)</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">Status Cooldown</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">Terakhir Dieksekusi</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[var(--color-outline-variant)]">
                  <tr v-for="key in aiMonitorData.api_keys" :key="key.id" class="bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-container-highest)] transition-colors">
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--color-on-background)]">{{ key.id }}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-on-surface-variant)] font-mono">{{ key.masked_key }}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold" :class="getCooldownStatus(key.cooldown_until).active ? 'text-[var(--color-error)]' : 'text-[var(--color-tertiary)]'">
                      {{ getCooldownStatus(key.cooldown_until).text }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-on-surface-variant)]">{{ formatTime(key.last_executed) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
        </div>

        <div class="bg-[var(--color-surface-container-high)] p-4 rounded-2xl shadow">
            <h2 class="text-lg font-semibold text-[var(--color-on-background)] mb-4">Status Cooldown Model</h2>
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-[var(--color-outline-variant)]">
                <thead class="bg-[var(--color-surface-container-highest)]">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">Model</th>
                    <th v-for="key in aiMonitorData.api_keys" :key="key.id" class="px-6 py-3 text-center text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">
                      Kunci #{{ key.id }}
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[var(--color-outline-variant)]">
                  <tr v-for="modelName in allModels" :key="modelName" class="bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-container-highest)] transition-colors">
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--color-on-background)]">{{ modelName }}</td>
                    <td v-for="key in aiMonitorData.api_keys" :key="key.id" class="px-6 py-4 whitespace-nowrap text-center text-sm">
                        <div>
                            <div class="font-semibold" :class="getModelCooldownStatus(key.model_cooldowns, modelName).active ? 'text-[var(--color-error)]' : 'text-[var(--color-primary)]'">
                               {{ getModelCooldownStatus(key.model_cooldowns, modelName).text }}
                            </div>
                            <div class="text-xs text-[var(--color-on-surface-variant)] mt-1">
                               Terakhir: {{ getModelLastExecuted(key.model_last_executed, modelName) }}
                            </div>
                        </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
        </div>
      </main>
    </div>
    
    <TransitionRoot appear :show="showEditModal" as="template">
      <Dialog as="div" @close="showEditModal = false" class="relative z-50">
        <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100" leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
          <div class="fixed inset-0 bg-black/50" />
        </TransitionChild>
        <div class="fixed inset-0 flex items-center justify-center p-4">
          <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95">
            <DialogPanel class="mx-4 w-full max-w-md rounded-4xl bg-[var(--color-surface-container-high)] p-6 shadow-2xl flex flex-col max-h-[90vh]">
              
              <div class="relative flex-shrink-0 flex items-center justify-center mb-6">
                <h2 class="text-2xl font-bold text-[var(--color-on-background)]">
                  {{ form.id ? 'Edit Model AI' : 'Tambah Model AI Baru' }}
                  <span v-if="form.id" class="ml-2 text-lg font-mono text-[var(--color-outline)]">#{{ form.id }}</span>
                </h2>
                <button @click="showEditModal = false" class="absolute right-0 top-0 p-1 text-[var(--color-outline)] hover:text-[var(--color-on-background)] transition-colors" aria-label="Tutup">
                  <span class="material-symbols-outlined">close</span>
                </button>
              </div>
              <hr class="my-4 border-[var(--color-outline-variant)] flex-shrink-0" />
              
              <div class="flex-1 overflow-y-auto space-y-4 px-1 pt-1 pb-2">
                <form @submit.prevent="saveModel">
                  
                  <div class="mb-4">
                    <label for="modelName" class="block text-sm font-medium text-[var(--color-on-surface-variant)]">Nama Model</label>
                    <input type="text" id="modelName" v-model="form.name" class="mt-1 block w-full rounded-xl border border-[var(--color-outline)] focus:border-transparent focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-surface-container)] text-[var(--color-on-surface)] p-2 transition" required>
                  </div>
                  
                  <div class="mb-4">
                    <label for="modelString" class="block text-sm font-medium text-[var(--color-on-surface-variant)]">Model String (e.g., gemini-pro)</label>
                    <input type="text" id="modelString" v-model="form.model_string" class="mt-1 block w-full rounded-xl border border-[var(--color-outline)] focus:border-transparent focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-surface-container)] text-[var(--color-on-surface)] p-2 font-mono transition" required>
                  </div>
                  
                  <div class="mb-4">
                    <RadioGroup v-if="!form.id" v-model="form.type">
                      <RadioGroupLabel class="block text-sm font-medium text-[var(--color-on-surface-variant)]">Tipe Model</RadioGroupLabel>
                      <div class="mt-2 grid grid-cols-2 gap-3">
                        <RadioGroupOption
                          v-for="type in modelTypes" :key="type.id" :value="type.id" v-slot="{ active, checked }">
                          <div
                            :class="[
                              'relative flex cursor-pointer rounded-xl border p-3 shadow-sm transition h-full',
                              checked ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)] bg-[var(--color-surface-container-highest)]' : 'bg-[var(--color-surface-container)] border-[var(--color-outline-variant)] hover:bg-[var(--color-surface-container-high)]',
                              active && !checked ? 'ring-2 ring-offset-2 ring-[var(--color-primary)]' : ''
                            ]">
                            <span class="flex flex-1">
                              <span class="flex flex-col">
                                <RadioGroupLabel as="span" class="block text-sm font-medium text-[var(--color-on-background)]">{{ type.label }}</RadioGroupLabel>
                              </span>
                            </span>
                          </div>
                        </RadioGroupOption>
                      </div>
                    </RadioGroup>

                    <div v-else>
                        <label class="block text-sm font-medium text-[var(--color-on-surface-variant)]">Tipe Model</label>
                        <div class="mt-1 p-3 rounded-xl bg-[var(--color-surface-container)] border border-[var(--color-outline)] text-[var(--color-on-background)] font-semibold transition">
                            {{ form.type === 'completion' ? 'Completion' : 'Text-to-Speech (TTS)' }}
                        </div>
                    </div>
                  </div>
                  
                  <div class="mb-4 flex items-center justify-between pt-2">
                    <span class="text-sm font-medium text-[var(--color-on-background)]">Aktifkan Model</span>
                    <div
                      class="md-switch group relative inline-flex items-center"
                      :class="{ 'selected': form.is_active }"
                      @click="form.is_active = !form.is_active"
                      role="switch"
                      :aria-checked="form.is_active"
                      aria-label="Aktifkan Model"
                      tabindex="0"
                      @keydown.space.prevent="form.is_active = !form.is_active"
                      @keydown.enter.prevent="form.is_active = !form.is_active"
                    >
                      <div
                          class="track h-[32px] w-[52px] rounded-full border-2 transition-colors duration-200 ease-in-out cursor-pointer relative"
                          :class="[
                              form.is_active
                              ? 'bg-[var(--color-primary)] border-[var(--color-primary)] group-hover:bg-[var(--color-primary-fixed-dim)]'
                              : 'bg-[var(--color-surface-container-highest)] border-[var(--color-outline)] group-hover:bg-[var(--color-surface-container-high)] group-hover:border-[var(--color-outline)]'
                          ]"
                      >
                          <div class="handle-container absolute top-0 left-0 h-full w-full pointer-events-none">
                              <div
                                  class="handle absolute top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)] shadow-sm"
                                  :class="[
                                      form.is_active
                                          ? 'h-[24px] w-[24px] bg-[var(--color-on-primary)] left-[calc(100%-24px-4px)]' 
                                          : 'h-[16px] w-[16px] bg-[var(--color-outline)] left-[6px] group-hover:bg-[var(--color-on-surface-variant)]',
                                      'group-active:h-[28px] group-active:w-[28px]',
                                      form.is_active ? 'group-active:left-[calc(100%-28px-2px)]' : 'group-active:left-[2px]'
                                  ]"
                              >
                                  <svg v-if="form.is_active" xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 -960 960 960" width="16" class="fill-[var(--color-primary)] opacity-100"><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/></svg>
                                  <svg v-if="!form.is_active" xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 -960 960 960" width="16" class="fill-[var(--color-surface-container-highest)] opacity-100"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>
                              </div>
                          </div>
                      </div>
                    </div>
                  </div>
                  
                  <p v-if="formError" class="text-sm text-[var(--color-error)] mb-4">{{ formError }}</p>

                  <div class="mt-6 pt-6 border-t border-[var(--color-outline-variant)] flex-shrink-0 flex justify-end space-x-2">
                    <button type="button" @click="showEditModal = false" class="px-4 py-2 text-sm font-semibold rounded-xl bg-[var(--color-surface-container)] text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)]">Batal</button>
                    <button type="submit" class="px-4 py-2 text-sm font-semibold rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-fixed-dim)] text-[var(--color-on-primary)] transition-colors">Simpan</button>
                  </div>
                </form>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </TransitionRoot>

    <TransitionRoot appear :show="showDeleteModal" as="template">
      <Dialog as="div" @close="showDeleteModal = false" class="relative z-50">
        <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100" leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
          <div class="fixed inset-0 bg-black/60" />
        </TransitionChild>
        <div class="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
          <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100" leave="duration-300 ease-in" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95">
            <DialogPanel class="w-full max-w-sm transform overflow-hidden rounded-3xl bg-[var(--color-surface-container-high)] p-6 text-center align-middle shadow-xl transition-all">
              
              <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-error-container)]">
                <span class="material-symbols-outlined text-4xl text-[var(--color-on-error-container)]">delete</span>
              </div>
              
              <DialogTitle as="h3" class="mt-4 text-2xl font-bold text-[var(--color-on-background)]">Konfirmasi Hapus</DialogTitle>
              <div class="mt-2">
                <p class="text-sm text-center text-[var(--color-on-surface-variant)]">
                  Anda yakin ingin menghapus model AI <span class="font-semibold">{{ currentModel?.name }}</span>? Tindakan ini tidak dapat diurungkan.
                </p>
              </div>
              
              <div class="mt-6 grid grid-cols-2 gap-3">
                <button type="button" @click="showDeleteModal = false" class="w-full rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] px-4 py-2 font-semibold text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-surface-container-low)]">Batal</button>
                <button @click="confirmDelete" class="w-full rounded-xl bg-[var(--color-error)] px-4 py-2 font-semibold text-[var(--color-on-error)] transition-colors hover:bg-[var(--color-on-error-container)]">Hapus</button>
              </div>
              
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </TransitionRoot>
  </div>
</template>
