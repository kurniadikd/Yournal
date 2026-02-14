<script setup lang="ts">
import { ref, computed, onMounted, type Ref } from 'vue';
import {
  TabGroup,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  TransitionRoot,
  TransitionChild,
  Dialog,
  DialogPanel,
  DialogTitle,
} from '@headlessui/vue';
import { api, API_BASE_URL } from '@/utils/api';
import { useTimeAgo, useDateFormat } from '@vueuse/core';

const emit = defineEmits(['back']);

interface FeedbackMetadata {
  email?: string;
  platform?: string;
  ip_address?: string;
  support_category?: string;
  support_subject?: string;
}

interface FeedbackItem {
  id: string;
  timestamp: string;
  status: 'new' | 'in_review' | 'resolved' | 'dismissed';
  feedback_type?: string;
  reason?: string;
  details?: string;
  reporter_username?: string;
  attachment_url?: string;
  metadata?: FeedbackMetadata;
}

const selectedTab = ref(0);
const isLoading = ref(false);
const rawItems = ref<FeedbackItem[]>([]);
const totalCount = ref(0);
const page = ref(1);
const limit = ref(50);

// Modal state
const selectedItem = ref<FeedbackItem | null>(null);
const showDetailModal = ref(false);

const fetchData = async () => {
  isLoading.value = true;
  try {
    const response = await api.get('/feedback/', {
      params: { page: page.value, limit: limit.value },
    });
    if (response.data && response.data.results) {
      rawItems.value = response.data.results;
      totalCount.value = response.data.count;
    } else {
      rawItems.value = [];
    }
  } catch (error) {
    console.error('Error fetching feedback:', error);
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => fetchData());

const isSupportItem = (item: FeedbackItem) => item.metadata && item.metadata.support_category;

const supportItems = computed(() =>
  rawItems.value.filter((item) => isSupportItem(item)),
);
const feedbackItems = computed(() =>
  rawItems.value.filter((item) => !isSupportItem(item)),
);

// VueUse: Replace moment.js with reactive time formatting
const formatDate = (dateString: string) => {
  const timeAgo = useTimeAgo(new Date(dateString), {
    messages: {
      justNow: 'baru saja',
      past: '{0} lalu',
      future: '{0} lagi',
      second: '{0} detik',
      minute: '{0} menit',
      hour: '{0} jam',
      day: '{0} hari',
      week: '{0} minggu',
      month: '{0} bulan',
      year: '{0} tahun',
      invalid: 'Tanggal tidak valid',
    },
  });
  return timeAgo.value;
};
const formatFullDate = (dateString: string) => {
  const formatted = useDateFormat(
    new Date(dateString),
    'dddd, D MMMM YYYY HH:mm',
    { locales: 'id-ID' },
  );
  return formatted.value;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'new':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    case 'in_review':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    case 'resolved':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    case 'dismissed':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const updateStatus = async (item: FeedbackItem, newStatus: string) => {
  try {
    await api.patch(`/feedback/${item.id}/status/`, { status: newStatus });
    // Safe assignment assuming API success means status is valid or just string update for UI
    item.status = newStatus as any; 
  } catch (error) {
    console.error('Failed to update status:', error);
    alert('Gagal mengupdate status');
  }
};

const getAttachmentUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const baseUrl = API_BASE_URL;
  const origin = baseUrl.replace(/\/api\/?$/, '');
  return `${origin}${url}`;
};

const openDetail = (item: FeedbackItem) => {
  selectedItem.value = item;
  showDetailModal.value = true;
};

const closeDetail = () => {
  showDetailModal.value = false;
  selectedItem.value = null;
};
</script>

<template>
  <div class="px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8 bg-[var(--color-surface-container)] min-h-screen rounded-3xl w-full h-full flex flex-col">
    
    <!-- Header -->
    <header class="flex items-center mb-6 flex-shrink-0">
      <button @click="emit('back')" class="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-highest)] transition-colors" aria-label="Kembali">
        <span class="material-symbols-outlined">arrow_back</span>
      </button>
      <div class="flex-grow text-center">
        <h1 class="text-xl font-bold text-[var(--color-on-background)]">Umpan Balik Pengguna</h1>
      </div>
      <div class="w-10"></div> <!-- Spacer for centering title -->
    </header>

    <!-- Tab Toggle -->
    <TabGroup :selectedIndex="selectedTab" @change="selectedTab = $event">
      <TabList class="flex items-center justify-center gap-2 mb-6">
        <Tab v-slot="{ selected }" as="template">
          <button
            :class="[
              'flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all',
              selected
                ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow'
                : 'bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-highest)]'
            ]"
          >
            <span class="material-symbols-outlined text-base">support_agent</span>
            Dukungan
            <span class="text-xs py-0.5 px-2 rounded-full" :class="selected ? 'bg-white/20' : 'bg-[var(--color-surface)]'">{{ supportItems.length }}</span>
          </button>
        </Tab>
        <Tab v-slot="{ selected }" as="template">
          <button
            :class="[
              'flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all',
              selected
                ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow'
                : 'bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-highest)]'
            ]"
          >
            <span class="material-symbols-outlined text-base">feedback</span>
            Masukan & Laporan
            <span class="text-xs py-0.5 px-2 rounded-full" :class="selected ? 'bg-white/20' : 'bg-[var(--color-surface)]'">{{ feedbackItems.length }}</span>
          </button>
        </Tab>
      </TabList>

      <!-- Loading & Empty States -->
      <div v-if="isLoading" class="text-center py-12 flex-grow flex items-center justify-center">
        <div class="flex flex-col items-center gap-3">
          <span class="material-symbols-outlined text-5xl text-[var(--color-outline)] animate-spin">sync</span>
          <p class="text-[var(--color-on-surface-variant)]">Memuat data...</p>
        </div>
      </div>

      <TabPanels v-else class="flex-grow flex flex-col overflow-hidden">

        <!-- PANEL DUKUNGAN -->
        <TabPanel class="flex-grow flex flex-col overflow-hidden">
          <div v-if="supportItems.length === 0" class="text-center py-12 bg-[var(--color-surface-container)] rounded-2xl border border-[var(--color-outline-variant)] flex-grow flex items-center justify-center">
            <div>
              <span class="material-symbols-outlined text-5xl text-[var(--color-outline)]">support_agent</span>
              <p class="mt-2 font-semibold text-[var(--color-on-surface-variant)]">Belum ada tiket dukungan.</p>
            </div>
          </div>
          <main v-else class="flex-1 bg-[var(--color-surface-container)] rounded-2xl overflow-hidden flex flex-col">
            <div class="overflow-x-auto flex-1">
              <table class="w-full text-left" style="min-width: 800px;">
                <thead class="sticky top-0 bg-[var(--color-surface-container-high)] z-10">
                  <tr>
                    <th class="p-4 font-semibold text-[var(--color-on-surface)]">Waktu</th>
                    <th class="p-4 font-semibold text-[var(--color-on-surface)]">Pengirim</th>
                    <th class="p-4 font-semibold text-[var(--color-on-surface)]">Subjek</th>
                    <th class="p-4 font-semibold text-[var(--color-on-surface)]">Kategori</th>
                    <th class="p-4 font-semibold text-[var(--color-on-surface)]">Status</th>
                  </tr>
                </thead>
                <tbody class="bg-[var(--color-surface-container)]">
                  <tr v-for="item in supportItems" :key="item.id" @click="openDetail(item)" class="border-b border-[var(--color-outline-variant)] last:border-b-0 hover:bg-[var(--color-surface-container-high)] transition-colors cursor-pointer">
                    <td class="p-4 text-sm text-[var(--color-on-surface-variant)]">{{ formatDate(item.timestamp) }}</td>
                    <td class="p-4 text-sm">{{ item.metadata?.email || item.reporter_username || 'Guest' }}</td>
                    <td class="p-4 text-sm font-medium max-w-xs truncate" :title="item.metadata?.support_subject">{{ item.metadata?.support_subject || 'Tanpa Subjek' }}</td>
                    <td class="p-4 text-sm">
                      <span class="px-2 py-1 rounded text-xs bg-[var(--color-surface-container-highest)] border border-[var(--color-outline-variant)]">
                        {{ item.metadata?.support_category || '-' }}
                      </span>
                    </td>
                    <td class="p-4 text-sm">
                      <span :class="['px-2 py-1 rounded text-xs font-bold uppercase', getStatusColor(item.status)]">{{ item.status }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </main>
        </TabPanel>

        <!-- PANEL MASUKAN & LAPORAN -->
        <TabPanel class="flex-grow flex flex-col overflow-hidden">
          <div v-if="feedbackItems.length === 0" class="text-center py-12 bg-[var(--color-surface-container)] rounded-2xl border border-[var(--color-outline-variant)] flex-grow flex items-center justify-center">
            <div>
              <span class="material-symbols-outlined text-5xl text-[var(--color-outline)]">feedback</span>
              <p class="mt-2 font-semibold text-[var(--color-on-surface-variant)]">Belum ada masukan atau laporan.</p>
            </div>
          </div>
          <main v-else class="flex-1 bg-[var(--color-surface-container)] rounded-2xl overflow-hidden flex flex-col">
            <div class="overflow-x-auto flex-1">
              <table class="w-full text-left" style="min-width: 900px;">
                <thead class="sticky top-0 bg-[var(--color-surface-container-high)] z-10">
                  <tr>
                    <th class="p-4 font-semibold text-[var(--color-on-surface)]">Waktu</th>
                    <th class="p-4 font-semibold text-[var(--color-on-surface)]">Tipe</th>
                    <th class="p-4 font-semibold text-[var(--color-on-surface)]">Pengirim</th>
                    <th class="p-4 font-semibold text-[var(--color-on-surface)]">Detail</th>
                    <th class="p-4 font-semibold text-[var(--color-on-surface)]">Status</th>
                  </tr>
                </thead>
                <tbody class="bg-[var(--color-surface-container)]">
                  <tr v-for="item in feedbackItems" :key="item.id" @click="openDetail(item)" class="border-b border-[var(--color-outline-variant)] last:border-b-0 hover:bg-[var(--color-surface-container-high)] transition-colors cursor-pointer">
                    <td class="p-4 text-sm text-[var(--color-on-surface-variant)]">{{ formatDate(item.timestamp) }}</td>
                    <td class="p-4 text-sm">
                      <span class="uppercase font-bold text-xs tracking-wider px-2 py-1 rounded bg-[var(--color-surface-container-highest)] border border-[var(--color-outline-variant)]">{{ item.feedback_type }}</span>
                      <span v-if="item.reason" class="ml-2 text-xs text-red-500 font-medium">({{ item.reason }})</span>
                    </td>
                    <td class="p-4 text-sm">{{ item.reporter_username || item.metadata?.email || 'Guest' }}</td>
                    <td class="p-4 text-sm max-w-xs truncate" :title="item.details">{{ item.details }}</td>
                    <td class="p-4 text-sm">
                      <span :class="['px-2 py-1 rounded text-xs font-bold uppercase', getStatusColor(item.status)]">{{ item.status }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </main>
        </TabPanel>
      </TabPanels>
    </TabGroup>

    <!-- Detail Modal -->
    <TransitionRoot :show="showDetailModal" as="template">
      <Dialog @close="closeDetail" class="relative z-50">
        <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100" leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
          <div class="fixed inset-0 bg-black/60" />
        </TransitionChild>
        <div class="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
          <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95">
            <DialogPanel class="w-full max-w-2xl transform overflow-hidden rounded-3xl bg-[var(--color-surface-container-high)] p-6 shadow-xl transition-all">
              <div v-if="selectedItem" class="space-y-6">
                <div class="flex justify-between items-start">
                  <DialogTitle as="h3" class="text-xl font-bold text-[var(--color-on-background)]">
                    {{ selectedItem.metadata?.support_subject || (selectedItem.feedback_type ? `Laporan: ${selectedItem.feedback_type}` : 'Detail') }}
                  </DialogTitle>
                  <button @click="closeDetail" class="p-1 text-[var(--color-outline)] hover:text-[var(--color-on-background)] transition-colors">
                    <span class="material-symbols-outlined">close</span>
                  </button>
                </div>

                <div class="flex items-center gap-4 pb-4 border-b border-[var(--color-outline-variant)]">
                  <div class="w-12 h-12 rounded-full bg-[var(--color-primary-container)] flex items-center justify-center text-[var(--color-on-primary-container)] font-bold text-xl">
                    {{ (selectedItem.metadata?.email?.[0] || selectedItem.reporter_username?.[0] || '?').toUpperCase() }}
                  </div>
                  <div>
                    <div class="font-semibold text-[var(--color-on-background)]">
                      {{ selectedItem.reporter_username ? `${selectedItem.reporter_username} (${selectedItem.metadata?.email})` : (selectedItem.metadata?.email || 'Anonymous') }}
                    </div>
                    <div class="text-sm text-[var(--color-on-surface-variant)]">
                      {{ formatFullDate(selectedItem.timestamp) }}
                    </div>
                  </div>
                </div>
                
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm bg-[var(--color-surface-container-low)] rounded-xl p-4">
                  <div><span class="block text-xs text-[var(--color-outline)] uppercase mb-1">Platform</span><span class="font-medium">{{ selectedItem.metadata?.platform || '-' }}</span></div>
                  <div><span class="block text-xs text-[var(--color-outline)] uppercase mb-1">IP Address</span><span class="font-medium">{{ selectedItem.metadata?.ip_address || '-' }}</span></div>
                  <div><span class="block text-xs text-[var(--color-outline)] uppercase mb-1">Status</span>
                    <select :value="selectedItem.status" @change="(e: Event) => selectedItem && updateStatus(selectedItem, (e.target as HTMLSelectElement).value)" class="text-sm border-none bg-transparent font-medium cursor-pointer focus:ring-0 text-[var(--color-primary)] -ml-1">
                      <option value="new">New</option>
                      <option value="in_review">In Review</option>
                      <option value="resolved">Resolved</option>
                      <option value="dismissed">Dismissed</option>
                    </select>
                  </div>
                  <div><span class="block text-xs text-[var(--color-outline)] uppercase mb-1">ID</span><span class="font-mono text-xs">{{ selectedItem.id.split('-')[0] }}...</span></div>
                </div>

                <div class="prose dark:prose-invert max-w-none text-[var(--color-on-surface)] whitespace-pre-wrap leading-relaxed bg-[var(--color-surface-container)] rounded-xl p-4 max-h-64 overflow-y-auto">
                  {{ selectedItem.details }}
                  <img v-if="selectedItem.attachment_url" :src="getAttachmentUrl(selectedItem.attachment_url)" class="mt-4 rounded-lg max-w-full h-auto border border-[var(--color-outline-variant)]" alt="Lampiran" />
                </div>
                
                <div v-if="selectedItem.metadata?.email" class="flex justify-end">
                    <a :href="`mailto:${selectedItem.metadata?.email}?subject=Re: ${selectedItem.metadata?.support_subject || 'Your Feedback'}`" target="_blank" class="flex items-center gap-2 bg-[var(--color-primary)] text-[var(--color-on-primary)] font-medium py-2 px-4 rounded-xl hover:bg-[var(--color-primary-fixed-dim)] transition-colors shadow-sm">
                        <span class="material-symbols-outlined text-base">reply</span>
                        <span>Balas via Email</span>
                    </a>
                </div>

              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </TransitionRoot>

  </div>
</template>

<style scoped>
/* Custom Scrollbar */
::-webkit-scrollbar {
    width: 6px;
    height: 6px;
}
::-webkit-scrollbar-track {
    background: transparent;
}
::-webkit-scrollbar-thumb {
    background: var(--color-outline-variant);
    border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
    background: var(--color-outline);
}
</style>
