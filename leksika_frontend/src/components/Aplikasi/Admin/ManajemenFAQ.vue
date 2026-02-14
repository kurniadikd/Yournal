<template>
  <div class="w-full h-full flex flex-col bg-[var(--color-background)]">
    <!-- --- HEADER --- -->
    <header class="flex-shrink-0 bg-[var(--color-surface)] border-b border-[var(--color-outline-variant)] shadow-sm z-20">
      <div class="px-4 md:px-6 py-4 flex items-center justify-between">
        <!-- Title & Back -->
        <div class="flex items-center gap-3">
          <button @click="$emit('back')" class="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)] transition-colors border border-[var(--color-outline-variant)]">
            <span class="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 class="text-xl md:text-2xl font-bold text-[var(--color-on-background)]">Manajemen FAQ</h1>
        </div>

        <!-- Global Actions -->
        <div class="flex items-center gap-2">
           <!-- AI Translate -->
           <button 
            @click="performGlobalTranslation" 
            class="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-secondary)] hover:bg-[var(--color-secondary-fixed-dim)] text-[var(--color-on-secondary)] transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="isSaving || isTranslating || faqs.length === 0"
            title="AI Translate"
          >
            <span v-if="isTranslating" class="material-symbols-outlined animate-spin">sync</span>
            <span v-else class="material-symbols-outlined">translate</span>
          </button>

          <!-- Source Code -->
          <button 
            @click="openSourceModal" 
            class="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface-variant)] transition-all shadow-md border border-[var(--color-outline-variant)]"
            :disabled="isSaving || isTranslating || faqs.length === 0"
            title="Lihat/Edit Source JSON"
          >
            <span class="material-symbols-outlined">code</span>
          </button>

          <!-- Add FAQ -->
          <button 
            @click="addFaqBox" 
            class="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-tertiary)] hover:bg-[var(--color-tertiary-fixed-dim)] text-[var(--color-on-tertiary)] transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="isSaving || isTranslating"
            title="Tambah FAQ Baru"
          >
            <span class="material-symbols-outlined">add</span>
          </button>

          <!-- Save All -->
          <button 
            @click="saveAll" 
            class="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-fixed-dim)] text-[var(--color-on-primary)] transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="isSaving || isTranslating"
            title="Simpan Semua"
          >
            <span v-if="isSaving" class="material-symbols-outlined animate-spin">sync</span>
            <span v-else class="material-symbols-outlined">save</span>
          </button>
        </div>
      </div>

      <!-- Language Tabs (Global) -->
      <div class="px-4 md:px-6 flex overflow-x-auto no-scrollbar">
        <button 
          v-for="lang in availableLanguages" 
          :key="lang.lang_code"
          @click="switchLanguage(lang.lang_code)"
          class="py-3 px-4 border-b-2 transition-all font-medium text-sm flex items-center gap-2 whitespace-nowrap focus:outline-none"
          :class="activeLang === lang.lang_code ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] hover:border-[var(--color-outline-variant)]'"
        >
          <span v-if="translatingLanguages.includes(lang.lang_code)" class="material-symbols-outlined text-[16px] animate-spin text-[var(--color-primary)]">sync</span>
          <span>{{ lang.name }}</span>
          <span v-if="lang.lang_code === 'id'" class="text-[10px] bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)] px-1.5 py-0.5 rounded-full font-bold">DEFAULT</span>
        </button>
      </div>
    </header>

    <!-- --- ERROR MESSAGE --- -->
    <div v-if="error" class="mx-4 md:mx-6 mt-4 bg-[var(--color-error-container)] border border-[var(--color-error)] text-[var(--color-on-error-container)] px-4 py-3 rounded-2xl flex items-center gap-3">
       <span class="material-symbols-outlined">error</span>
       <span class="flex-grow">{{ error }}</span>
       <button @click="error = null" class="hover:bg-black/10 rounded-full p-1"><span class="material-symbols-outlined">close</span></button>
    </div>

    <!-- --- CONTENT --- -->
    <div class="flex-grow overflow-y-auto p-4 md:p-6">
       <!-- Loading State -->
      <div v-if="isLoading" class="h-full flex flex-col items-center justify-center gap-3">
        <LoadingSpinner size="xl" />
        <p class="text-[var(--color-outline)]">Memuat data...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="faqs.length === 0" class="h-full flex flex-col items-center justify-center gap-4 opacity-60">
        <span class="material-symbols-outlined text-6xl text-[var(--color-outline-variant)]">quiz</span>
        <p class="text-[var(--color-on-surface-variant)] text-lg">Belum ada FAQ.</p>
        <button @click="addFaqBox" class="text-[var(--color-primary)] font-bold hover:underline">Tambah item pertama</button>
      </div>

      <!-- FAQ Grid/List -->
      <div v-else class="flex flex-col gap-4 max-w-4xl mx-auto pb-20">
        <div 
          v-for="(faq, index) in faqs" 
          :key="faq.tempId || faq.id"
          class="group bg-[var(--color-surface-container-high)] rounded-2xl p-4 md:p-5 border border-transparent hover:border-[var(--color-outline-variant)] transition-all duration-200 relative"
          :class="{'ring-2 ring-[var(--color-primary)] ring-offset-2 ring-offset-[var(--color-background)]': faq.isModified}"
        >
          <!-- Controls (Left) -->
          <div class="absolute left-2 md:left-3 top-4 flex flex-col items-center gap-0.5 opacity-50 group-hover:opacity-100 transition-opacity">
            <button @click="moveFaq(index, -1)" class="p-0.5 hover:text-[var(--color-primary)] hover:bg-[var(--color-surface)] rounded-full transition-colors disabled:opacity-30" :disabled="index === 0">
              <span class="material-symbols-outlined text-lg">keyboard_arrow_up</span>
            </button>
            <span class="text-[10px] font-mono font-bold text-[var(--color-outline)]">{{ index + 1 }}</span>
            <button @click="moveFaq(index, 1)" class="p-0.5 hover:text-[var(--color-primary)] hover:bg-[var(--color-surface)] rounded-full transition-colors disabled:opacity-30" :disabled="index === faqs.length - 1">
              <span class="material-symbols-outlined text-lg">keyboard_arrow_down</span>
            </button>
          </div>

          <div class="pl-8 md:pl-10 pr-24 md:pr-28 space-y-2">
            <!-- Question Input -->
            <textarea 
              ref="questionRefs"
              v-model="faq.question[activeLang]"
              @input="markModified(faq); autoResize($event)"
              class="w-full bg-transparent text-base md:text-lg font-bold text-[var(--color-on-surface)] placeholder-[var(--color-outline)] border-none focus:ring-0 p-0 resize-none leading-snug transition-colors focus:text-[var(--color-primary)] overflow-hidden"
              placeholder="Tulis Pertanyaan..."
              rows="1"
            ></textarea>

            <!-- Answer Input -->
            <textarea 
              ref="answerRefs"
              v-model="faq.answer[activeLang]"
              @input="markModified(faq); autoResize($event)"
              class="w-full bg-transparent text-sm text-[var(--color-on-surface-variant)] placeholder-[var(--color-outline)] border-none focus:ring-0 p-0 resize-none leading-relaxed transition-colors focus:text-[var(--color-on-surface)] overflow-hidden"
              placeholder="Tulis Jawaban..."
              rows="1"
            ></textarea>
          </div>

          <!-- Actions (Top Right) -->
          <div class="absolute right-2 md:right-3 top-3 flex items-center gap-1">
             <!-- Status Toggles -->
             <button 
              @click="faq.is_top = !faq.is_top; markModified(faq)" 
              class="w-8 h-8 rounded-full flex items-center justify-center transition-colors border"
              :class="faq.is_top ? 'text-[var(--color-on-tertiary-container)] bg-[var(--color-tertiary-container)] border-[var(--color-tertiary)]' : 'text-[var(--color-outline)] bg-[var(--color-surface-container)] border-transparent hover:bg-[var(--color-surface-container-high)]'"
              title="Tampilkan di Utama"
            >
              <span class="material-symbols-outlined text-lg" :class="faq.is_top ? 'filled' : ''">star</span>
             </button>

             <button 
              @click="faq.is_active = !faq.is_active; markModified(faq)" 
              class="w-8 h-8 rounded-full flex items-center justify-center transition-colors border"
              :class="faq.is_active ? 'text-[var(--color-on-primary-container)] bg-[var(--color-primary-container)] border-[var(--color-primary)]' : 'text-[var(--color-outline)] bg-[var(--color-surface-container)] border-transparent hover:bg-[var(--color-surface-container-high)]'"
              title="Status Aktif"
            >
              <span class="material-symbols-outlined text-lg">{{ faq.is_active ? 'visibility' : 'visibility_off' }}</span>
             </button>

             <!-- Remove -->
             <button 
              @click="removeFaq(index)" 
              class="w-8 h-8 rounded-full flex items-center justify-center transition-colors border text-[var(--color-on-error-container)] bg-[var(--color-error-container)] border-[var(--color-error)] hover:bg-[var(--color-error)] hover:text-[var(--color-on-error)]"
              title="Hapus"
            >
              <span class="material-symbols-outlined text-lg">delete</span>
             </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- --- APP MODAL (Alert/Confirm) --- -->
    <TransitionRoot appear :show="appModalOpen" as="template">
      <Dialog as="div" @close="closeAppModal" class="relative z-[9999]">
        <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100" leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
          <div class="fixed inset-0 bg-black/50" />
        </TransitionChild>
        <div class="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
          <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95">
            <DialogPanel class="w-full max-w-sm transform overflow-hidden rounded-3xl bg-[var(--color-surface-container-high)] p-6 text-center align-middle shadow-xl transition-all">
              <div v-if="appModalConfig.type === 'error'" class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-error-container)]">
                <span class="material-symbols-outlined text-4xl text-[var(--color-on-error-container)]">error</span>
              </div>
              <div v-else-if="appModalConfig.type === 'success'" class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-primary-container)]">
                <span class="material-symbols-outlined text-4xl text-[var(--color-on-primary-container)]">check_circle</span>
              </div>
              <div v-else-if="appModalConfig.type === 'confirm'" class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-secondary-container)]">
                <span class="material-symbols-outlined text-4xl text-[var(--color-on-secondary-container)]">help</span>
              </div>
              <div v-else class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-surface-container-highest)]">
                <span class="material-symbols-outlined text-4xl text-[var(--color-on-surface-variant)]">info</span>
              </div>

              <DialogTitle as="h3" class="mt-4 text-2xl font-bold text-[var(--color-on-background)]">{{ appModalConfig.title }}</DialogTitle>
              <p class="mt-2 text-sm text-[var(--color-on-surface-variant)]">{{ appModalConfig.message }}</p>

              <div class="mt-6 flex gap-3 justify-center">
                <template v-if="appModalConfig.type === 'confirm'">
                  <button type="button" @click="closeAppModal" class="flex-1 rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] px-4 py-2 font-semibold text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-surface-container-low)]">Batal</button>
                  <button type="button" @click="handleAppModalConfirm" class="flex-1 rounded-xl bg-[var(--color-primary)] px-4 py-2 font-semibold text-[var(--color-on-primary)] transition-colors hover:bg-[var(--color-primary-fixed-dim)]">{{ appModalConfig.actionLabel }}</button>
                </template>
                <template v-else>
                  <button type="button" @click="closeAppModal" class="w-full rounded-xl bg-[var(--color-primary)] px-4 py-2 font-semibold text-[var(--color-on-primary)] transition-colors hover:bg-[var(--color-primary-fixed-dim)]">{{ appModalConfig.actionLabel }}</button>
                </template>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </TransitionRoot>

    <!-- --- SOURCE CODE MODAL --- -->
    <TransitionRoot appear :show="showSourceModal" as="template">
      <Dialog as="div" @close="closeSourceModal" class="relative z-[9999]">
        <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100" leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
          <div class="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </TransitionChild>
        <div class="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
          <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95">
            <DialogPanel class="w-full max-w-4xl transform overflow-hidden rounded-3xl bg-[var(--color-surface-container-high)] p-6 shadow-2xl flex flex-col max-h-[90vh]">
              <div class="flex items-center justify-between mb-4 flex-shrink-0">
                <h2 class="text-2xl font-bold text-[var(--color-on-background)]">
                  Source Code (JSON) - ID
                </h2>
                <button @click="closeSourceModal" class="p-2 text-[var(--color-outline)] hover:text-[var(--color-on-background)] transition-colors rounded-full hover:bg-[var(--color-surface-container)]">
                  <span class="material-symbols-outlined">close</span>
                </button>
              </div>
              
              <p class="text-sm text-[var(--color-on-surface-variant)] mb-4">
                Edit konten FAQ dalam format JSON untuk bahasa <strong>Indonesia (Default)</strong>. Perubahan akan langsung diterapkan.
              </p>
              
              <textarea 
                v-model="sourceJsonInput" 
                class="w-full flex-grow p-4 border border-[var(--color-outline-variant)] rounded-xl bg-[var(--color-surface-container)] text-[var(--color-on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-xs font-mono resize-none overflow-y-auto mb-4 min-h-[400px] whitespace-pre" 
                spellcheck="false"
              ></textarea>
              
              <!-- Error Message -->
              <div v-if="sourceJsonError" class="text-xs text-[var(--color-error)] mb-4 font-mono bg-[var(--color-error-container)]/20 p-3 rounded-lg">
                <span class="font-bold">❌ Error:</span> {{ sourceJsonError }}
              </div>
              
              <div class="flex justify-end gap-3 flex-shrink-0">
                <button @click="copySourceToClipboard" class="px-4 py-2 text-sm font-semibold rounded-xl border border-[var(--color-outline)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container)] transition-colors flex items-center gap-2">
                  <span class="material-symbols-outlined text-lg">content_copy</span>
                  Salin
                </button>
                <button @click="closeSourceModal" class="px-4 py-2 text-sm font-semibold rounded-xl border border-[var(--color-outline-variant)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container)] transition-colors">
                  Batal
                </button>
                <button @click="applySourceChanges" class="px-4 py-2 text-sm font-semibold rounded-xl bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-fixed-dim)] transition-colors flex items-center gap-2">
                  <span class="material-symbols-outlined text-lg">check</span>
                  Terapkan
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </TransitionRoot>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch, computed } from 'vue';
import { api } from '@/utils/api';
import { useLanguageStore } from '@/stores/language';
import {
  TransitionRoot,
  TransitionChild,
  Dialog,
  DialogPanel,
  DialogTitle,
} from '@headlessui/vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import { useClipboard } from '@vueuse/core';

// --- INTERFACES ---
interface FAQ {
  id?: number | string | null;
  tempId?: number | null;
  question: Record<string, string>;
  answer: Record<string, string>;
  is_top: boolean;
  is_active: boolean;
  sort_order: number;
  isModified?: boolean;
}

interface Language {
  lang_code: string;
  name: string;
}

interface ModalConfig {
  title: string;
  message: string;
  type?: 'info' | 'success' | 'error' | 'confirm';
  actionLabel?: string;
  onConfirm?: (() => void | Promise<void>) | null;
}

// --- STATE ---
const faqs = ref<FAQ[]>([]);
const isLoading = ref(false);
const isSaving = ref(false);
const isTranslating = ref(false);
const translatingLanguages = ref<string[]>([]);
const error = ref<string | null>(null);
const activeLang = ref('id');
const languageStore = useLanguageStore();

const availableLanguages = computed<Language[]>(() => {
  // Map store languages to format expected by UI
  return (
    languageStore.opsiBahasa?.map((l: any) => ({
      lang_code: l.kodeBahasa,
      name: l.nama,
    })) || [
      { lang_code: 'id', name: 'Indonesia' },
      { lang_code: 'en', name: 'English' },
    ]
  );
});

// App Modal
const appModalOpen = ref(false);
const appModalConfig = ref<ModalConfig>({
  title: '',
  message: '',
  type: 'info',
  actionLabel: 'OK',
  onConfirm: null,
});

// Source Modal
const showSourceModal = ref(false);
const sourceJsonInput = ref('');
const sourceJsonError = ref<string | null>(null);
const pendingDeletions = ref<Array<number | string>>([]); // IDs to delete on save

// --- LIFECYCLE ---
onMounted(async () => {
  await languageStore.fetchAdminLanguages();
  await fetchFaqs();
});

// Watch for language changes to resize textareas
watch(activeLang, async () => {
  await nextTick();
  resizeAllTextareas();
});

// --- ACTIONS ---

const autoResize = (event: Event) => {
  const el = event.target as HTMLTextAreaElement;
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
};

const resizeAllTextareas = () => {
  // Use setTimeout to ensure DOM is fully rendered
  setTimeout(() => {
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach((ta) => {
      ta.style.height = 'auto';
      ta.style.height = ta.scrollHeight + 'px';
    });
  }, 50);
};

const fetchFaqs = async () => {
  isLoading.value = true;
  try {
    const res = await api.get('/admin/faq');
    faqs.value = (res.data || []).map((f: any) => ({
      ...f,
      question: f.question || {},
      answer: f.answer || {},
      isModified: false,
    }));
    await nextTick();
    resizeAllTextareas();
  } catch (err) {
    error.value = 'Gagal memuat FAQ';
  } finally {
    isLoading.value = false;
  }
};

const switchLanguage = (lang: string) => {
  activeLang.value = lang;
};

const addFaqBox = async () => {
  faqs.value.push({
    tempId: Date.now(),
    id: null,
    question: {},
    answer: {},
    sort_order: faqs.value.length + 1,
    is_top: false,
    is_active: true,
    isModified: true,
  });
  await nextTick();
  resizeAllTextareas();
  // Scroll to bottom
  const list = document.querySelector('.overflow-y-auto');
  if (list) list.scrollTop = list.scrollHeight;
};

const markModified = (faq: FAQ) => {
  faq.isModified = true;
};

const removeFaq = (index: number) => {
  const faq = faqs.value[index];
  if (faq.id) {
    openAppModal({
      title: 'Hapus FAQ?',
      message: 'Tindakan ini akan menghapus FAQ secara permanen dari database.',
      type: 'confirm',
      actionLabel: 'Hapus',
      action: async () => {
        try {
          await api.delete(`/admin/faq/${faq.id}`);
          faqs.value.splice(index, 1);
        } catch (e: any) {
          error.value = 'Gagal menghapus: ' + e.message;
        }
      },
    });
  } else {
    faqs.value.splice(index, 1);
  }
};

const moveFaq = (index: number, dir: number) => {
  const newIndex = index + dir;
  if (newIndex < 0 || newIndex >= faqs.value.length) return;

  const temp = faqs.value[index];
  faqs.value[index] = faqs.value[newIndex];
  faqs.value[newIndex] = temp;

  faqs.value.forEach((f, idx) => {
    if (f.sort_order !== idx + 1) {
      f.sort_order = idx + 1;
      markModified(f);
    }
  });
};

const saveAll = async () => {
  const modifiedFaqs = faqs.value.filter((f) => f.isModified || !f.id);
  const hasChanges =
    modifiedFaqs.length > 0 || pendingDeletions.value.length > 0;

  if (!hasChanges) {
    openAppModal({
      title: 'Info',
      message: 'Tidak ada perubahan untuk disimpan.',
    });
    return;
  }

  isSaving.value = true;
  error.value = null;
  let successCount = 0;
  let failCount = 0;
  let deletedCount = 0;

  try {
    // 1. Process deletions first
    for (const deleteId of pendingDeletions.value) {
      try {
        await api.delete(`/admin/faq/${deleteId}`);
        deletedCount++;
      } catch (e) {
        console.error(`Failed to delete FAQ ${deleteId}`, e);
      }
    }
    pendingDeletions.value = []; // Clear after processing

    // 2. Validate new/modified items
    for (const faq of modifiedFaqs) {
      if (!faq.question['id'])
        throw new Error('Pertanyaan (ID) wajib diisi untuk semua item.');
      if (!faq.answer['id'])
        throw new Error('Jawaban (ID) wajib diisi untuk semua item.');
    }

    // 3. Process creates/updates
    await Promise.all(
      modifiedFaqs.map(async (faq) => {
        const payload = {
          question: faq.question,
          answer: faq.answer,
          sort_order: faq.sort_order,
          is_top: faq.is_top,
          is_active: faq.is_active,
        };

        try {
          if (faq.id) {
            await api.put(`/admin/faq/${faq.id}`, payload);
          } else {
            const res = await api.post('/admin/faq', payload);
            faq.id = res.data.id;
            delete faq.tempId;
          }
          faq.isModified = false;
          successCount++;
        } catch (e) {
          console.error(e);
          failCount++;
        }
      }),
    );

    // Build result message
    let resultMsg = '';
    if (deletedCount > 0) resultMsg += `${deletedCount} dihapus. `;
    if (successCount > 0) resultMsg += `${successCount} disimpan.`;
    if (failCount > 0) resultMsg += ` ${failCount} gagal.`;

    if (failCount > 0) {
      error.value = resultMsg;
    } else {
      openAppModal({
        title: 'Berhasil',
        message: resultMsg || 'Semua perubahan disimpan.',
        type: 'success',
      });
    }
  } catch (e) {
    error.value = e.message;
  } finally {
    isSaving.value = false;
  }
};

const performGlobalTranslation = () => {
  // Check if there are unsaved FAQs
  const unsavedFaqs = faqs.value.filter((f) => !f.id);
  if (unsavedFaqs.length > 0) {
    openAppModal({
      title: 'Ada FAQ Belum Tersimpan',
      message: `${unsavedFaqs.length} FAQ belum disimpan ke database. Silakan simpan dulu sebelum menerjemahkan.`,
      type: 'error',
    });
    return;
  }

  const eligibleFaqs = faqs.value.filter((f) => f.id);
  if (eligibleFaqs.length === 0) {
    openAppModal({
      title: 'Tidak Ada FAQ',
      message: 'Tidak ada FAQ yang bisa diterjemahkan.',
      type: 'info',
    });
    return;
  }

  const targetLangs = availableLanguages.value
    .filter((l) => l.lang_code !== 'id')
    .map((l) => l.lang_code);
  if (targetLangs.length === 0) return;

  openAppModal({
    title: 'Terjemahkan Semua?',
    message: `Ini akan menerjemahkan ${eligibleFaqs.length} FAQ ke ${targetLangs.length} bahasa lain menggunakan AI.`,
    type: 'confirm',
    actionLabel: 'Terjemahkan',
    action: () => executeTranslation(eligibleFaqs, targetLangs),
  });
};

const executeTranslation = async (eligibleFaqs: FAQ[], targetLangs: string[]) => {
  isTranslating.value = true;
  translatingLanguages.value = [...targetLangs];

  let successCount = 0;
  let failedLangs: string[] = [];

  // Call bulk-translate endpoint once per target language
  for (const targetLang of targetLangs) {
    try {
      await api.patch('/admin/faq', {
        op: 'bulk_translate',
        target_language: targetLang,
      });
      successCount++;
      // Remove from translating list once done
      translatingLanguages.value = translatingLanguages.value.filter(
        (l) => l !== targetLang,
      );
    } catch (e) {
      console.error(`Failed to translate to ${targetLang}`, e);
      failedLangs.push(targetLang);
    }
  }

  // Refresh all FAQs to get updated translations
  await fetchFaqs();

  isTranslating.value = false;
  translatingLanguages.value = [];

  if (failedLangs.length > 0) {
    openAppModal({
      title: 'Selesai dengan Error',
      message: `${successCount} bahasa berhasil. Gagal: ${failedLangs.join(', ')}`,
      type: 'error',
    });
  } else {
    openAppModal({
      title: 'Selesai',
      message: `Semua FAQ berhasil diterjemahkan ke ${successCount} bahasa.`,
      type: 'success',
    });
  }
};

// --- SOURCE MODAL ---
const openSourceModal = () => {
  // Build JSON for Indonesian only
  const data = faqs.value.map((faq) => ({
    id: faq.id,
    question: faq.question['id'] || '',
    answer: faq.answer['id'] || '',
    is_top: faq.is_top,
    is_active: faq.is_active,
    sort_order: faq.sort_order,
  }));
  sourceJsonInput.value = JSON.stringify(data, null, 2);
  sourceJsonError.value = null;
  showSourceModal.value = true;
};

const closeSourceModal = () => {
  showSourceModal.value = false;
};

const { copy } = useClipboard({ legacy: true });

const copySourceToClipboard = () => {
  copy(sourceJsonInput.value);
};

const applySourceChanges = () => {
  try {
    const parsed = JSON.parse(sourceJsonInput.value);
    if (!Array.isArray(parsed)) {
      throw new Error('Data harus berupa array.');
    }

    // Get current DB IDs
    const currentDbIds = faqs.value.filter((f) => f.id).map((f) => f.id);

    // Process parsed items
    const newFaqs = parsed.map((item, index) => {
      // If item has ID and it exists in DB, keep it (UPDATE)
      // Otherwise treat as NEW (CREATE)
      const existingFaq = item.id
        ? faqs.value.find((f) => f.id === item.id)
        : null;

      return {
        id: existingFaq ? existingFaq.id : null,
        tempId: existingFaq ? null : Date.now() + index,
        question: { id: item.question || '' },
        answer: { id: item.answer || '' },
        is_top: item.is_top ?? false,
        is_active: item.is_active ?? true,
        sort_order: item.sort_order ?? index + 1,
        isModified: true,
      };
    });

    // Find deleted IDs (IDs in DB but not in parsed JSON)
    const parsedIds = parsed.filter((p) => p.id).map((p) => p.id);
    const deletedIds = currentDbIds.filter((dbId) => !parsedIds.includes(dbId));

    // Store deleted IDs for later deletion on save
    pendingDeletions.value = deletedIds;

    faqs.value = newFaqs;

    sourceJsonError.value = null;
    closeSourceModal();
    nextTick(() => resizeAllTextareas());

    // Notify user about pending deletions
    if (deletedIds.length > 0) {
      error.value = `${deletedIds.length} FAQ akan dihapus saat Simpan.`;
    }
  } catch (e) {
    sourceJsonError.value = e.message;
  }
};

// --- HELPERS ---
const openAppModal = ({
  title,
  message,
  type = 'info',
  actionLabel = 'OK',
  action = null,
}: {
  title: string;
  message: string;
  type?: 'info' | 'success' | 'error' | 'confirm';
  actionLabel?: string;
  action?: (() => void | Promise<void>) | null;
}) => {
  appModalConfig.value = {
    title,
    message,
    type,
    actionLabel,
    onConfirm: action,
  };
  appModalOpen.value = true;
};

const closeAppModal = () => {
  appModalOpen.value = false;
};

const handleAppModalConfirm = async () => {
  const action = appModalConfig.value.onConfirm;
  closeAppModal(); // Close immediately
  if (action) {
    await action();
  }
};
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
