<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '@/utils/api';

interface Email {
    id: number | string;
    sender: string;
    subject: string;
    body_snippet: string;
    received_at: string;
    [key: string]: any;
}

interface EmailLog {
    id: number | string;
    recipient: string;
    subject: string;
    status: string;
    sent_at: string;
    [key: string]: any;
}

const emit = defineEmits<{
  (e: 'back'): void;
}>();

const activeTab = ref<'inbox' | 'logs'>('inbox'); 
const loading = ref(false);
const error = ref<string | null>(null);

// Data
const inboxItems = ref<Email[]>([]);
const logItems = ref<EmailLog[]>([]);
const totalLogs = ref(0);

// Reply Modal
const showReplyModal = ref(false);
const replyTo = ref('');
const replySubject = ref('');
const replyBody = ref('');
const sendingReply = ref(false);

// Fetch Inbox
async function fetchInbox() {
  loading.value = true;
  error.value = null;
  try {
    const res = await api.patch('/admin/email/', {
      op: 'get_inbox',
      limit: 50,
    });
    inboxItems.value = res.data || [];
  } catch (e: any) {
    error.value = e.response?.data?.error || e.message;
    inboxItems.value = [];
  } finally {
    loading.value = false;
  }
}

// Fetch Logs
async function fetchLogs() {
  loading.value = true;
  error.value = null;
  try {
    const res = await api.patch('/admin/email/', {
      op: 'get_logs',
      limit: 100,
    });
    logItems.value = res.data?.logs || [];
    totalLogs.value = res.data?.total || 0;
  } catch (e: any) {
    error.value = e.response?.data?.error || e.message;
    logItems.value = [];
  } finally {
    loading.value = false;
  }
}

// Open Reply Modal
function openReply(email: Email) {
  replyTo.value = email.sender;
  replySubject.value = `Re: ${email.subject}`;
  replyBody.value = '';
  showReplyModal.value = true;
}

// Send Reply
async function sendReply() {
  if (!replyTo.value || !replySubject.value || !replyBody.value) return;
  sendingReply.value = true;
  try {
    await api.patch('/admin/email/', {
      op: 'send_reply',
      to: replyTo.value,
      subject: replySubject.value,
      body: replyBody.value,
    });
    showReplyModal.value = false;
    replyTo.value = '';
    replySubject.value = '';
    replyBody.value = '';
    // Refresh logs to show sent email
    fetchLogs();
  } catch (e: any) {
    error.value = e.response?.data?.error || e.message;
  } finally {
    sendingReply.value = false;
  }
}

// Format Date
function formatDate(dateStr: string) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Tab Change
function switchTab(tab: 'inbox' | 'logs') {
  activeTab.value = tab;
  if (tab === 'inbox') fetchInbox();
  else fetchLogs();
}

onMounted(() => {
  fetchInbox();
});
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="flex items-center justify-between p-4 border-b border-[var(--color-outline-variant)]">
      <div class="flex items-center gap-4">
        <button @click="emit('back')" class="p-2 rounded-full hover:bg-[var(--color-surface-container-highest)] transition-colors">
          <span class="material-symbols-outlined text-[var(--color-on-background)]">arrow_back</span>
        </button>
        <h1 class="text-xl font-bold text-[var(--color-on-background)]">Manajemen Email</h1>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex border-b border-[var(--color-outline-variant)]">
      <button 
        @click="switchTab('inbox')" 
        :class="['flex-1 py-3 font-medium transition-colors', activeTab === 'inbox' ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]' : 'text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)]']"
      >
        <span class="material-symbols-outlined text-lg">inbox</span> Inbox (contact@)
      </button>
      <button 
        @click="switchTab('logs')" 
        :class="['flex-1 py-3 font-medium transition-colors', activeTab === 'logs' ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]' : 'text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)]']"
      >
        <span class="material-symbols-outlined text-lg">outgoing_mail</span> Sent Logs (noreply@)
      </button>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-auto p-4">
      <!-- Error -->
      <div v-if="error" class="bg-[var(--color-error-container)] text-[var(--color-on-error-container)] p-4 rounded-lg mb-4">
        {{ error }}
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
      </div>

      <!-- Inbox Tab -->
      <div v-else-if="activeTab === 'inbox'">
        <div v-if="inboxItems.length === 0" class="text-center py-8 text-[var(--color-on-surface-variant)]">
          Tidak ada email di inbox atau gagal mengambil data IMAP.
        </div>
        <div v-else class="space-y-3">
          <div 
            v-for="item in inboxItems" 
            :key="item.id" 
            class="bg-[var(--color-surface-container)] p-4 rounded-xl hover:bg-[var(--color-surface-container-high)] transition-colors cursor-pointer"
            @click="openReply(item)"
          >
            <div class="flex justify-between items-start mb-2">
              <span class="font-medium text-[var(--color-on-surface)]">{{ item.sender }}</span>
              <span class="text-xs text-[var(--color-on-surface-variant)]">{{ formatDate(item.received_at) }}</span>
            </div>
            <div class="font-semibold text-[var(--color-on-background)] mb-1">{{ item.subject }}</div>
            <div class="text-sm text-[var(--color-on-surface-variant)] line-clamp-2">{{ item.body_snippet }}</div>
          </div>
        </div>
      </div>

      <!-- Logs Tab -->
      <div v-else-if="activeTab === 'logs'">
        <div class="mb-4 text-sm text-[var(--color-on-surface-variant)]">Total: {{ totalLogs }} email terkirim</div>
        <div v-if="logItems.length === 0" class="text-center py-8 text-[var(--color-on-surface-variant)]">
          Belum ada log email yang tersimpan.
        </div>
        <div v-else class="space-y-2">
          <div 
            v-for="log in logItems" 
            :key="log.id" 
            class="bg-[var(--color-surface-container)] p-3 rounded-lg flex items-center gap-4"
          >
            <div :class="['w-2 h-2 rounded-full', log.status === 'sent' ? 'bg-green-500' : 'bg-red-500']"></div>
            <div class="flex-1 min-w-0">
              <div class="font-medium text-[var(--color-on-surface)] truncate">{{ log.recipient }}</div>
              <div class="text-sm text-[var(--color-on-surface-variant)] truncate">{{ log.subject }}</div>
            </div>
            <div class="text-xs text-[var(--color-on-surface-variant)] whitespace-nowrap">{{ formatDate(log.sent_at) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Reply Modal -->
    <div v-if="showReplyModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div class="bg-[var(--color-surface)] w-full max-w-lg mx-4 rounded-2xl p-6 shadow-xl">
        <h2 class="text-lg font-bold text-[var(--color-on-background)] mb-4">Balas Email</h2>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">Kepada</label>
            <input v-model="replyTo" type="email" 
              class="w-full px-4 py-2 rounded-lg bg-[var(--color-surface-container)] text-[var(--color-on-surface)] border border-[var(--color-outline-variant)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" 
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">Subjek</label>
            <input v-model="replySubject" type="text" 
              class="w-full px-4 py-2 rounded-lg bg-[var(--color-surface-container)] text-[var(--color-on-surface)] border border-[var(--color-outline-variant)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" 
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">Isi Pesan (HTML)</label>
            <textarea v-model="replyBody" rows="6" 
              class="w-full px-4 py-2 rounded-lg bg-[var(--color-surface-container)] text-[var(--color-on-surface)] border border-[var(--color-outline-variant)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
            ></textarea>
          </div>
        </div>

        <div class="flex justify-end gap-3 mt-6">
          <button @click="showReplyModal = false" class="px-4 py-2 rounded-lg text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)]">
            Batal
          </button>
          <button 
            @click="sendReply" 
            :disabled="sendingReply"
            class="px-6 py-2 rounded-lg bg-[var(--color-primary)] text-[var(--color-on-primary)] font-medium hover:bg-[var(--color-primary-fixed-dim)] disabled:opacity-50"
          >
            {{ sendingReply ? 'Mengirim...' : 'Kirim' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
