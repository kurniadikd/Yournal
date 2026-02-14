<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '@/utils/api';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();

interface Settings {
  default_ui_theme: string;
  default_selected_font: string;
  default_show_virtual_keyboard: boolean;
  maintenance_mode: boolean;
  allow_new_registrations: boolean;
  is_auto_ai_enrichment_enabled: boolean;
  is_ai_via_browser_enabled: boolean;
  is_ai_via_telegram_enabled: boolean;
  telegram_bot_token: string;
  telegram_chat_id: string;
  backup_frequency_days: number;
}

const settings = ref<Settings>({
  default_ui_theme: 'system',
  default_selected_font: 'Roboto',
  default_show_virtual_keyboard: false,
  maintenance_mode: false,
  allow_new_registrations: true,
  is_auto_ai_enrichment_enabled: false,
  is_ai_via_browser_enabled: false,
  is_ai_via_telegram_enabled: false,
  telegram_bot_token: '',
  telegram_chat_id: '',
  backup_frequency_days: 7,
});

const isLoading = ref(false);
const isSaving = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

const UI_THEME_CHOICES = [
  { value: 'light', label: 'Terang' },
  { value: 'dark', label: 'Gelap' },
  { value: 'system', label: 'Sistem' },
];

const fetchSettings = async () => {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    const response = await api.get('/admin/app-settings/');
    Object.assign(settings.value, response.data);
  } catch (error) {
    console.error('Error fetching app settings:', error);
    errorMessage.value = 'Gagal mengambil pengaturan aplikasi.';
  } finally {
    isLoading.value = false;
  }
};

const saveSettings = async () => {
  isSaving.value = true;
  errorMessage.value = '';
  successMessage.value = '';
  try {
    const payload = {
      default_ui_theme: settings.value.default_ui_theme,
      default_selected_font: settings.value.default_selected_font,
      default_show_virtual_keyboard:
        settings.value.default_show_virtual_keyboard,
      maintenance_mode: settings.value.maintenance_mode,
      allow_new_registrations: settings.value.allow_new_registrations,
      is_auto_ai_enrichment_enabled:
        settings.value.is_auto_ai_enrichment_enabled,
      is_ai_via_browser_enabled: settings.value.is_ai_via_browser_enabled,
      is_ai_via_telegram_enabled: settings.value.is_ai_via_telegram_enabled,
      telegram_bot_token: settings.value.telegram_bot_token,
      telegram_chat_id: settings.value.telegram_chat_id,
      backup_frequency_days: settings.value.backup_frequency_days,
    };
    await api.patch('/admin/app-settings/', payload);
    successMessage.value = 'Pengaturan berhasil disimpan!';
  } catch (error) {
    console.error('Error saving app settings:', error);
    errorMessage.value = 'Gagal menyimpan pengaturan aplikasi.';
  } finally {
    isSaving.value = false;
  }
};

onMounted(() => {
  fetchSettings();
});

const emit = defineEmits<{
  (e: 'back'): void;
}>();
</script>

<template>
  <div class="px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8 bg-[var(--color-surface-container)] min-h-screen rounded-3xl w-full h-full flex flex-col">
    <header class="flex items-center mb-6 flex-shrink-0">
      <button @click="emit('back')" class="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-highest)] transition-colors" aria-label="Kembali">
        <span class="material-symbols-outlined">arrow_back</span>
      </button>
      <div class="flex-grow text-center">
        <h1 class="text-xl font-bold text-[var(--color-on-background)]">Pengaturan Aplikasi Global</h1>
      </div>
      <div class="w-10"></div> <!-- Placeholder for alignment -->
    </header>

    <div v-if="isLoading" class="text-center text-[var(--color-on-surface-variant)]">Memuat pengaturan...</div>
    <div v-else-if="errorMessage" class="text-center text-[var(--color-error)]">{{ errorMessage }}</div>
    <form v-else @submit.prevent="saveSettings" class="space-y-6 bg-[var(--color-surface-container)] p-6 rounded-2xl shadow-lg">
      
      <!-- Global UI Defaults -->
      <h3 class="text-xl font-semibold text-[var(--color-on-background)]">Default UI</h3>
      <div class="form-group">
        <label for="default_ui_theme" class="block text-sm font-medium text-[var(--color-on-surface-variant)]">Tema UI Default</label>
        <select id="default_ui_theme" v-model="settings.default_ui_theme" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)] bg-[var(--color-surface)] text-[var(--color-on-surface)]">
          <option v-for="theme in UI_THEME_CHOICES" :key="theme.value" :value="theme.value">{{ theme.label }}</option>
        </select>
      </div>
      <div class="form-group">
        <label for="default_selected_font" class="block text-sm font-medium text-[var(--color-on-surface-variant)]">Font Default</label>
        <input type="text" id="default_selected_font" v-model="settings.default_selected_font" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)] bg-[var(--color-surface)] text-[var(--color-on-surface)]" />
      </div>
      <div class="flex items-center justify-between">
        <label for="default_show_virtual_keyboard" class="text-sm font-medium text-[var(--color-on-surface-variant)]">Tampilkan Virtual Keyboard Default</label>
        <input type="checkbox" id="default_show_virtual_keyboard" v-model="settings.default_show_virtual_keyboard" class="h-5 w-5 text-[var(--color-primary)] rounded border-gray-300 focus:ring-[var(--color-primary)]" />
      </div>

      <hr class="my-4 border-[var(--color-outline-variant)]" />

      <!-- Application Control -->
      <h3 class="text-xl font-semibold text-[var(--color-on-background)]">Kontrol Aplikasi</h3>
      <div class="flex items-center justify-between">
        <label for="maintenance_mode" class="text-sm font-medium text-[var(--color-on-surface-variant)]">Mode Pemeliharaan</label>
        <input type="checkbox" id="maintenance_mode" v-model="settings.maintenance_mode" class="h-5 w-5 text-[var(--color-primary)] rounded border-gray-300 focus:ring-[var(--color-primary)]" />
      </div>
      <div class="flex items-center justify-between">
        <label for="allow_new_registrations" class="text-sm font-medium text-[var(--color-on-surface-variant)]">Izinkan Pendaftaran Baru</label>
        <input type="checkbox" id="allow_new_registrations" v-model="settings.allow_new_registrations" class="h-5 w-5 text-[var(--color-primary)] rounded border-gray-300 focus:ring-[var(--color-primary)]" />
      </div>

      <hr class="my-4 border-[var(--color-outline-variant)]" />

      <!-- AI Settings -->
      <h3 class="text-xl font-semibold text-[var(--color-on-background)]">Pengaturan AI</h3>
      <div class="flex flex-col gap-4">
        <!-- Auto Enrichment -->
        <div class="flex items-center justify-between">
          <div>
            <label for="is_auto_ai_enrichment_enabled" class="text-sm font-medium text-[var(--color-on-surface-variant)]">Auto AI Enrichment</label>
            <p class="text-xs text-[var(--color-on-surface-variant)] opacity-70">Otomatis generate definisi & terjemahan AI saat user melihat kata yang belum lengkap</p>
          </div>
          <input type="checkbox" id="is_auto_ai_enrichment_enabled" v-model="settings.is_auto_ai_enrichment_enabled" class="h-5 w-5 text-[var(--color-primary)] rounded border-gray-300 focus:ring-[var(--color-primary)]" />
        </div>
      </div>
      
      <hr class="my-4 border-[var(--color-outline-variant)]" />

      <!-- Backup Settings -->
      <h3 class="text-xl font-semibold text-[var(--color-on-background)]">Pengaturan Backup</h3>
      <div class="form-group">
        <label for="telegram_bot_token" class="block text-sm font-medium text-[var(--color-on-surface-variant)]">Telegram Bot Token</label>
        <input type="text" id="telegram_bot_token" v-model="settings.telegram_bot_token" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)] bg-[var(--color-surface)] text-[var(--color-on-surface)]" />
      </div>
      <div class="form-group">
        <label for="telegram_chat_id" class="block text-sm font-medium text-[var(--color-on-surface-variant)]">Telegram Chat ID</label>
        <input type="text" id="telegram_chat_id" v-model="settings.telegram_chat_id" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)] bg-[var(--color-surface)] text-[var(--color-on-surface)]" />
      </div>
      <div class="form-group">
        <label for="backup_frequency_days" class="block text-sm font-medium text-[var(--color-on-surface-variant)]">Frekuensi Backup (hari)</label>
        <input type="number" id="backup_frequency_days" v-model="settings.backup_frequency_days" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)] bg-[var(--color-surface)] text-[var(--color-on-surface)]" />
      </div>

      <div v-if="successMessage" class="text-green-600 text-sm mt-2">{{ successMessage }}</div>
      <div v-if="errorMessage" class="text-red-600 text-sm mt-2">{{ errorMessage }}</div>

      <button type="submit" :disabled="isSaving" class="w-full bg-[var(--color-primary)] text-[var(--color-on-primary)] font-medium py-2 rounded-lg hover:bg-[var(--color-primary-fixed-dim)] transition-colors">
        <span v-if="isSaving">Menyimpan...</span>
        <span v-else>Simpan Pengaturan</span>
      </button>
    </form>
  </div>
</template>
