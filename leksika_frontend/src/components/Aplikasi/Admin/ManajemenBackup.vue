<template>
  <div class="px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8 bg-[var(--color-surface-container)] min-h-screen rounded-3xl w-full h-full flex flex-col">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
    
    <header class="flex items-center justify-between mb-6 flex-shrink-0">
      <button @click="handleBack" class="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-highest)] transition-colors">
        <span class="material-symbols-outlined">arrow_back</span>
      </button>
      <h1 class="text-xl font-bold text-[var(--color-on-background)]">Pengaturan Backup</h1>
      <div class="w-10 h-10"></div> </header>

    <div class="space-y-6 flex-grow overflow-y-auto">
      <div class="p-6 bg-[var(--color-surface-container-high)] rounded-2xl shadow-sm">
          <h3 class="text-lg font-semibold text-[var(--color-primary)] mb-2">Pengaturan Backup</h3>
          <form @submit.prevent="saveBackupSettings" class="space-y-4">
              <div>
                  <label for="telegramBotToken" class="block text-sm font-medium text-[var(--color-on-surface-variant)]">Telegram Bot Token</label>
                  <input type="text" id="telegramBotToken" v-model="backupForm.telegram_bot_token" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[var(--color-primary)] focus:ring focus:ring-[var(--color-primary)] focus:ring-opacity-50 bg-[var(--color-surface-container)] text-[var(--color-on-surface)]">
              </div>
              <div>
                  <label for="telegramChatId" class="block text-sm font-medium text-[var(--color-on-surface-variant)]">Telegram Chat ID</label>
                  <input type="text" id="telegramChatId" v-model="backupForm.telegram_chat_id" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[var(--color-primary)] focus:ring focus:ring-[var(--color-primary)] focus:ring-opacity-50 bg-[var(--color-surface-container)] text-[var(--color-on-surface)]">
              </div>
              <div>
                  <label for="backupFrequency" class="block text-sm font-medium text-[var(--color-on-surface-variant)]">Frekuensi Backup (Hari)</label>
                  <input type="number" id="backupFrequency" v-model.number="backupForm.backup_frequency_days" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[var(--color-primary)] focus:ring focus:ring-[var(--color-primary)] focus:ring-opacity-50 bg-[var(--color-surface-container)] text-[var(--color-on-surface)]" min="1">
              </div>
              <p v-if="formError" class="text-sm text-[var(--color-error)]">{{ formError }}</p>
              <button type="submit" :disabled="isSaving" class="px-5 py-2 text-md font-semibold text-[var(--color-on-primary)] bg-[var(--color-primary)] rounded-xl hover:bg-[var(--color-primary-fixed-dim)] transition-colors flex items-center justify-center space-x-2">
                  <span v-if="!isSaving" class="material-symbols-outlined">save</span>
                  <span v-else class="material-symbols-outlined animate-spin">sync</span>
                  <span>{{ isSaving ? 'Menyimpan...' : 'Simpan Pengaturan Backup' }}</span>
              </button>
          </form>
      </div>

      <div class="p-6 bg-[var(--color-surface-container-high)] rounded-2xl shadow-sm">
        <h3 class="text-lg font-semibold text-[var(--color-primary)] mb-2">Backup Telegram</h3>
        <p class="text-sm text-[var(--color-on-surface-variant)] mb-4">
          Memicu backup database dan mengirimkannya ke channel Telegram yang sudah dikonfigurasi.
        </p>
        
        <div class="flex flex-col space-y-4">
          <button
            @click="triggerTelegramBackup"
            class="px-5 py-2 text-md font-semibold text-[var(--color-on-primary)] bg-[var(--color-primary)] rounded-xl hover:bg-[var(--color-primary-fixed-dim)] transition-colors flex items-center justify-center space-x-2"
            :disabled="isProcessingBackupAction"
          >
            <span v-if="!isProcessingBackupAction" class="material-symbols-outlined">cloud_upload</span>
            <span v-else class="material-symbols-outlined animate-spin">sync</span>
            <span>{{ isProcessingBackupAction ? 'Memulai Backup...' : 'Mulai Backup Telegram Sekarang' }}</span>
          </button>

          <button
            @click="testTelegramConnection"
            class="px-5 py-2 text-md font-semibold text-[var(--color-on-surface)] bg-[var(--color-surface-container)] rounded-xl hover:bg-[var(--color-surface-container-high)] transition-colors flex items-center justify-center space-x-2"
            :disabled="isProcessingBackupAction"
          >
            <span v-if="!isProcessingBackupAction" class="material-symbols-outlined">telegram</span>
            <span v-else class="material-symbols-outlined animate-spin">sync</span>
            <span>{{ isProcessingBackupAction ? 'Menguji Koneksi...' : 'Uji Koneksi Telegram' }}</span>
          </button>
        </div>
      </div>

      <div v-if="statusMessage" class="bg-[var(--color-surface-container)] p-6 rounded-2xl shadow-sm border border-[var(--color-outline-variant)]">
        <h3 class="text-lg font-semibold text-[var(--color-on-background)] mb-2">Status Proses</h3>
        <div class="space-y-2">
          <div v-for="(log, index) in logEntries" :key="index" class="text-sm flex items-center space-x-2" :class="log.type === 'error' ? 'text-[var(--color-error)]' : 'text-[var(--color-on-surface-variant)]'">
            <span class="material-symbols-outlined text-base" :class="{ 'text-[var(--color-tertiary)]': log.type === 'success', 'text-[var(--color-error)]': log.type === 'error', 'text-[var(--color-outline)]': log.type === 'info' }">
              {{ getIcon(log.type) }}
            </span>
            <p>{{ log.message }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { api } from '@/utils/api';

interface AppSettings {
  telegram_bot_token?: string;
  telegram_chat_id?: string;
  backup_frequency_days?: number;
  [key: string]: any;
}

interface BackupForm {
  telegram_bot_token: string;
  telegram_chat_id: string;
  backup_frequency_days: number;
}

interface LogEntry {
  type: 'success' | 'error' | 'info';
  message: string;
}

const emit = defineEmits<{
  (e: 'back'): void;
}>();

const isSaving = ref(false);
const isProcessingBackupAction = ref(false); // New loading state for backup/test actions
const logEntries = ref<LogEntry[]>([]);
const statusMessage = computed(() => logEntries.value.length > 0);

const appSettings = ref<AppSettings>({});
const backupForm = ref<BackupForm>({
  telegram_bot_token: '',
  telegram_chat_id: '',
  backup_frequency_days: 7,
});
const formError = ref<string | null>(null);

const addLog = (type: LogEntry['type'], message: string) => {
  logEntries.value.push({ type, message });
};

const fetchAppSettings = async () => {
  try {
    const response = await api.get('/admin/app-settings/');
    appSettings.value = response.data;
    backupForm.value = {
      telegram_bot_token: response.data.telegram_bot_token || '',
      telegram_chat_id: response.data.telegram_chat_id || '',
      backup_frequency_days: response.data.backup_frequency_days || 7,
    };
  } catch (err) {
    console.error('Gagal mengambil pengaturan aplikasi:', err);
    // Handle error
  }
};

const saveBackupSettings = async () => {
  isSaving.value = true;
  formError.value = null;
  try {
    await api.patch('/admin/app-settings/', backupForm.value);
    await fetchAppSettings(); // Refresh settings after saving
    addLog('success', '✅ Pengaturan backup berhasil disimpan.');
  } catch (err: any) {
    console.error('Gagal menyimpan pengaturan backup:', err);
    formError.value =
      err.response?.data?.detail ||
      'Terjadi kesalahan saat menyimpan pengaturan.';
    addLog('error', '❌ Gagal menyimpan pengaturan backup.');
  } finally {
    isSaving.value = false;
  }
};

onMounted(() => {
  fetchAppSettings();
});

const triggerTelegramBackup = async () => {
  isProcessingBackupAction.value = true;
  logEntries.value = []; // Bersihkan log lama

  addLog('info', `Memulai proses backup Telegram...`);

  try {
    const response = await api.post('/admin/backup/', {
      action: 'trigger_telegram_backup',
    });
    addLog('success', `✅ ${response.data.message}`);
  } catch (err: any) {
    console.error('Gagal memicu backup Telegram:', err);
    addLog(
      'error',
      `❌ Backup Telegram gagal: ${err.response?.data?.message || err.message}`,
    );
  } finally {
    isProcessingBackupAction.value = false;
  }
};

const testTelegramConnection = async () => {
  isProcessingBackupAction.value = true;
  logEntries.value = []; // Clear old logs
  addLog('info', 'Menguji koneksi Telegram API...');
  try {
    const response = await api.post('/admin/backup/', {
      action: 'test_telegram_connection',
    });
    if (response.data.status === 'success') {
      addLog('success', `✅ ${response.data.message}`);
    } else {
      addLog('error', `❌ ${response.data.message}`);
    }
  } catch (err: any) {
    console.error('Gagal menguji koneksi Telegram:', err);
    addLog(
      'error',
      `❌ Gagal menguji koneksi Telegram: ${err.response?.data?.message || err.message}`,
    );
  } finally {
    isProcessingBackupAction.value = false;
  }
};

const getIcon = (type: LogEntry['type']) => {
  switch (type) {
    case 'success':
      return 'check_circle';
    case 'error':
      return 'cancel';
    default:
      return 'info';
  }
};

const handleBack = () => {
  emit('back');
};
</script>

<style lang="postcss" scoped>
/* Anda bisa menambahkan gaya kustom di sini jika diperlukan */
</style>
