<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick } from 'vue';
import { useUIStore } from '@/stores/ui';
import { useSentencesStore } from '@/stores/sentences';
import { useLanguageStore } from '@/stores/language';
import {
  fetchSentenceGroupByIdAPI,
  createOrUpdateSentenceGroup,
  deactivateSentenceGroupAPI,
  activateSentenceGroupAPI,
} from '@/composables/useSentences';
import {
  TransitionRoot,
  TransitionChild,
  Dialog,
  DialogPanel,
  DialogTitle,
} from '@headlessui/vue';
import { cloneDeep, isEqual } from 'lodash-es';
import { api } from '@/utils/api';

// Fungsi formatter untuk kapitalisasi kalimat
const formatSentenceCapitalization = (text: string) => {
  if (!text) return '';
  return text.replace(/(^\w|(?:\.\s*)\w)/g, (c) => c.toUpperCase());
};

// Fungsi pengecekan form
const checkFormIsDirty = (initialData: Record<string, string>, currentData: Record<string, string>) => {
  return !isEqual(cloneDeep(initialData), cloneDeep(currentData));
};

const props = defineProps<{
  modelValue: boolean;
  sentenceId?: string | number | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'close'): void;
  (e: 'open-narasi-editor', id: number | null): void;
}>();

const uiStore = useUIStore();
const sentencesStore = useSentencesStore();
const languageStore = useLanguageStore();
const isLoading = ref(false);
const isSaving = ref(false);
const isDeactivating = ref(false);
const isActivating = ref(false);
const isCompleting = ref(false);
const error = ref<string | null>(null);

interface SentenceGroupData {
  id: number | null;
  sentences: Record<string, string>;
  is_active: boolean;
}

const sentenceGroupData = reactive<SentenceGroupData>({
  id: null,
  sentences: {},
  is_active: true,
});

const isConfirmDeactivateDialogOpen = ref(false);
const isConfirmCloseDialogOpen = ref(false);
const showJsonModal = ref(false);
// const showNarasiModal = ref(false); // Unused
const jsonInput = ref('');
const jsonError = ref<string | null>(null);

const initialSentences = ref<Record<string, string>>({});
const textareaRefs = ref<Record<string, HTMLTextAreaElement | null>>({});

const isModalOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const isNewMode = computed(() => !props.sentenceId);
const allAvailableLanguages = computed(() => languageStore.opsiBahasa);

const isFormValid = computed(() => {
  return Object.values(sentenceGroupData.sentences).some(
    (text) => text && text.trim() !== '',
  );
});

const isFormDirty = computed(() => {
  return checkFormIsDirty(initialSentences.value, sentenceGroupData.sentences);
});

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      if (props.sentenceId) {
        fetchSentenceGroupData();
      } else {
        initializeNewSentence();
      }
    } else {
      resetState();
    }
  },
);

const initializeNewSentence = async () => {
  await languageStore.init();
  const completeSentences: Record<string, string> = {};
  allAvailableLanguages.value.forEach((langInfo: any) => {
    completeSentences[langInfo.kodeBahasa] = '';
  });
  sentenceGroupData.id = null;
  sentenceGroupData.is_active = true;
  sentenceGroupData.sentences = completeSentences;
  initialSentences.value = JSON.parse(JSON.stringify(completeSentences));
  await nextTick();
  Object.keys(textareaRefs.value).forEach((lang) => {
    resizeTextarea(textareaRefs.value[lang]);
  });
};

const resizeTextarea = (el: HTMLTextAreaElement | null) => {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
};

const handleTextareaInput = (event: Event, lang: string) => {
  const target = event.target as HTMLTextAreaElement;
  const formattedValue = formatSentenceCapitalization(target.value);
  sentenceGroupData.sentences[lang] = formattedValue;

  if (target.value !== formattedValue) {
    const start = target.selectionStart;
    const end = target.selectionEnd;
    target.value = formattedValue;
    target.setSelectionRange(start, end);
  }

  nextTick(() => {
    resizeTextarea(textareaRefs.value[lang]);
  });
};

const fetchSentenceGroupData = async () => {
  isLoading.value = true;
  error.value = null;
  try {
    await languageStore.init();
    const data = await fetchSentenceGroupByIdAPI(props.sentenceId!);
    const sentencesFromApi = data.sentences || {};
    const completeSentences: Record<string, string> = {};
    if (allAvailableLanguages.value) {
      allAvailableLanguages.value.forEach((langInfo: any) => {
        const langCode = langInfo.kodeBahasa;
        completeSentences[langCode] = Object.prototype.hasOwnProperty.call(sentencesFromApi, langCode)
          ? sentencesFromApi[langCode]
          : '';
      });
    }
    sentenceGroupData.id = data.id;
    sentenceGroupData.is_active = data.is_active;
    sentenceGroupData.sentences = completeSentences;
    initialSentences.value = JSON.parse(JSON.stringify(completeSentences));
    await nextTick();
    Object.keys(textareaRefs.value).forEach((lang) => {
      resizeTextarea(textareaRefs.value[lang]);
    });
  } catch (err) {
    console.error('Gagal memuat data grup kalimat:', err);
    error.value = 'Gagal memuat data. Mohon coba lagi.';
  } finally {
    isLoading.value = false;
  }
};

const handleSave = async () => {
  if (!isFormValid.value || !isFormDirty.value) return;
  isSaving.value = true;
  error.value = null;
  try {
    const payload = { sentences: sentenceGroupData.sentences };
    const id = sentenceGroupData.id;
    const updatedData = await createOrUpdateSentenceGroup({ id, payload });
    if (id) {
      sentencesStore.setUpdatedSentence(updatedData);
    }
    forceCloseModal();
    uiStore.startCooldown('edit-kalimat');
  } catch (err) {
    console.error('Gagal menyimpan grup kalimat:', err);
    error.value = 'Gagal menyimpan. Periksa koneksi Anda.';
  } finally {
    isSaving.value = false;
  }
};

const handleDeactivateGroup = () => {
  isConfirmDeactivateDialogOpen.value = true;
};

const confirmDeactivateGroup = async () => {
  if (isDeactivating.value) return;
  isDeactivating.value = true;
  error.value = null;
  try {
    const deactivatedId = props.sentenceId!;
    await deactivateSentenceGroupAPI(deactivatedId);
    sentencesStore.setDeactivatedSentence(deactivatedId);
    isConfirmDeactivateDialogOpen.value = false;
    forceCloseModal();
  } catch (err) {
    console.error('Gagal menonaktifkan grup kalimat:', err);
    error.value = 'Gagal menonaktifkan. Mohon coba lagi.';
  } finally {
    isDeactivating.value = false;
  }
};

const handleActivateGroup = async () => {
  if (isActivating.value) return;
  isActivating.value = true;
  error.value = null;
  try {
    const activatedId = props.sentenceId!;
    await activateSentenceGroupAPI(activatedId);
    sentencesStore.setActivatedSentence(activatedId);
    forceCloseModal();
  } catch (err) {
    console.error('Gagal mengaktifkan grup kalimat:', err);
    error.value = 'Gagal mengaktifkan. Mohon coba lagi.';
  } finally {
    isActivating.value = false;
  }
};

const handleCompleteSentences = async () => {
  isCompleting.value = true;
  error.value = null;
  try {
    // Panggil endpoint PATCH dengan action 'ai_preview'
    // Backend akan mengurus sisanya (mengambil data saat ini & memanggil AI)
    const response = await api.patch(
      `/admin/sentences/groups/${sentenceGroupData.id}/`,
      { action: 'ai_preview' },
    );

    // Respons dari action 'ai_preview' adalah data pratinjau itu sendiri
    const completedData = response.data;

    if (!completedData || !completedData.sentences) {
      throw new Error('Respons AI tidak berisi data kalimat yang valid.');
    }

    const newSentences = completedData.sentences;
    for (const langCode in newSentences) {
      if (Object.prototype.hasOwnProperty.call(newSentences, langCode)) {
        // Hanya perbarui jika kolom di UI masih kosong atau hanya berisi spasi
        if (
          !sentenceGroupData.sentences[langCode] ||
          sentenceGroupData.sentences[langCode].trim() === ''
        ) {
          sentenceGroupData.sentences[langCode] = newSentences[langCode];
        }
      }
    }

    await nextTick();
    Object.keys(textareaRefs.value).forEach((lang) => {
      resizeTextarea(textareaRefs.value[lang]);
    });
  } catch (err: any) {
    console.error(
      'Gagal melengkapi kalimat:',
      err.response?.data || err.message,
    );
    error.value =
      err.response?.data?.detail || 'Gagal melengkapi kalimat dengan AI.';
  } finally {
    isCompleting.value = false;
  }
};

const processJsonInput = () => {
  jsonError.value = null;
  try {
    const data = JSON.parse(jsonInput.value);
    if (data && typeof data.sentences === 'object') {
      for (const langCode in sentenceGroupData.sentences) {
        if (data.sentences[langCode]) {
          sentenceGroupData.sentences[langCode] = data.sentences[langCode];
        }
      }
      showJsonModal.value = false;
      jsonInput.value = '';
      nextTick(() => {
        Object.values(textareaRefs.value).forEach((el) => resizeTextarea(el));
      });
    } else {
      jsonError.value =
        "Format JSON tidak valid. Harus ada properti 'sentences'.";
    }
  } catch (e: any) {
    jsonError.value = `Gagal memproses JSON: ${e.message}`;
  }
};

const resetState = () => {
  isLoading.value = false;
  isSaving.value = false;
  isDeactivating.value = false;
  isActivating.value = false;
  isCompleting.value = false;
  error.value = null;
  sentenceGroupData.id = null;
  sentenceGroupData.sentences = {};
  sentenceGroupData.is_active = true;
  initialSentences.value = {};
  isConfirmCloseDialogOpen.value = false;
};

const closeModal = () => {
  // Headless UI akan otomatis mencegah close jika ada child Dialog terbuka
  if (isFormDirty.value) {
    isConfirmCloseDialogOpen.value = true;
  } else {
    forceCloseModal();
  }
};

const forceCloseModal = () => {
  emit('update:modelValue', false);
  emit('close');
};
</script>

<template>
  <TransitionRoot :show="isModalOpen" as="template">
    <Dialog @close="closeModal" class="relative z-50">
      <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100" leave="duration-300 ease-in" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-black/50" />
      </TransitionChild>
      <div class="fixed inset-0 flex items-center justify-center p-4">
        <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95">
          <DialogPanel class="mx-4 w-full max-w-xl rounded-4xl bg-[var(--color-surface-container-high)] p-6 shadow-2xl flex flex-col max-h-[90vh]">
            <div class="relative flex-shrink-0 flex items-center justify-center mb-6">
              <h2 class="text-2xl font-bold text-[var(--color-on-background)]">
                {{ isNewMode ? 'Buat Kalimat Baru' : 'Edit Kalimat' }}
                <span v-if="!isNewMode" class="ml-2 text-lg font-mono text-[var(--color-outline)]">#{{ sentenceGroupData.id }}</span>
              </h2>
              <button @click="closeModal" class="absolute right-0 top-0 p-1 text-[var(--color-outline)] hover:text-[var(--color-on-background)] transition-colors">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>
            <hr class="my-4 border-[var(--color-outline-variant)] flex-shrink-0" />
            
            <div v-if="error" class="flex-shrink-0 flex items-center space-x-4 rounded-2xl border border-[var(--color-error)] bg-[var(--color-error-container)] px-4 py-4 mb-4">
              <span class="material-symbols-outlined text-[var(--color-on-error-container)]">error</span>
              <p class="font-medium text-[var(--color-on-error-container)]">{{ error }}</p>
            </div>
            
            <form @submit.prevent="handleSave" class="flex-1 overflow-y-auto space-y-4 px-1 pt-1 pb-2">
              <div v-for="langInfo in allAvailableLanguages" :key="langInfo.kodeBahasa">
                <label :for="`lang-${langInfo.kodeBahasa}`" class="mb-1 block text-sm font-medium text-[var(--color-on-surface-variant)]">Teks Bahasa {{ langInfo.nama }}</label>
                <div class="relative">
                  <textarea
                    :ref="(el) => textareaRefs[langInfo.kodeBahasa] = el as HTMLTextAreaElement"
                    :id="`lang-${langInfo.kodeBahasa}`"
                    :value="sentenceGroupData.sentences[langInfo.kodeBahasa]"
                    @input="(event: Event) => handleTextareaInput(event, langInfo.kodeBahasa)"
                    rows="1"
                    :placeholder="isLoading ? 'Memuat...' : `Tulis terjemahan dalam Bahasa ${langInfo.nama}...`"
                    class="w-full p-3 pr-10 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-colors duration-300 text-[var(--color-on-surface)] resize-none overflow-hidden"
                    :class="[
                      initialSentences[langInfo.kodeBahasa] !== sentenceGroupData.sentences[langInfo.kodeBahasa]
                        ? 'bg-[var(--color-surface-container-highest)] border-[var(--color-primary)]'
                        : 'border-[var(--color-outline-variant)] bg-[var(--color-surface-container)]'
                    ]"
                  ></textarea>
                  <button
                    v-if="sentenceGroupData.sentences[langInfo.kodeBahasa] && sentenceGroupData.sentences[langInfo.kodeBahasa].length > 0"
                    @click="sentenceGroupData.sentences[langInfo.kodeBahasa] = ''"
                    type="button"
                    class="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--color-outline)] hover:text-[var(--color-primary)] transition-colors"
                    aria-label="Hapus teks"
                  >
                    <span class="material-symbols-outlined text-base">close</span>
                  </button>
                </div>
              </div>
            </form>

            <div class="mt-8 pt-6 border-t border-[var(--color-outline-variant)] flex-shrink-0 flex justify-between items-center gap-3">
              <div class="flex gap-2">
                 <button type="button" @click="handleDeactivateGroup" v-if="!isNewMode && sentenceGroupData.is_active" :disabled="isDeactivating" class="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[var(--color-on-error)] bg-[var(--color-error)] hover:bg-[var(--color-error-container)] rounded-xl transition-colors disabled:opacity-50">
                    <span class="material-symbols-outlined text-base">visibility_off</span>
                    <span>{{ isDeactivating ? 'Memproses...' : 'Nonaktifkan' }}</span>
                 </button>
                 <button type="button" @click="handleActivateGroup" v-if="!isNewMode && !sentenceGroupData.is_active" :disabled="isActivating" class="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)] bg-[var(--color-primary)] hover:bg-[var(--color-primary-fixed-dim)] rounded-xl transition-colors disabled:opacity-50">
                    <span class="material-symbols-outlined text-base" :class="{'animate-spin': isActivating}">{{ isActivating ? 'sync' : 'visibility' }}</span>
                    <span>{{ isActivating ? 'Mengaktifkan...' : 'Aktifkan' }}</span>
                 </button>
              </div>
              <div class="flex justify-end gap-2">
                <button type="button" @click="showJsonModal = true" title="Impor dari JSON" class="flex items-center justify-center h-10 w-10 text-sm font-semibold text-[var(--color-on-primary)] bg-[var(--color-primary)] hover:bg-[var(--color-primary-fixed-dim)] rounded-xl transition-colors">
 <span class="material-symbols-outlined text-base">file_json</span>
                </button>
                <button type="button" @click="$emit('open-narasi-editor', sentenceGroupData.id)" title="Manajemen Narasi" class="flex items-center justify-center h-10 w-10 text-sm font-semibold text-[var(--color-on-primary)] bg-[var(--color-secondary)] hover:bg-[var(--color-secondary-fixed-dim)] rounded-xl transition-colors">
                    <span class="material-symbols-outlined text-base">auto_stories</span>
                </button>
                <button type="button" @click="handleCompleteSentences" :disabled="isCompleting" title="Pelengkap Kalimat AI" class="flex items-center justify-center h-10 w-10 text-sm font-semibold text-[var(--color-on-primary)] bg-[var(--color-primary)] hover:bg-[var(--color-primary-fixed-dim)] rounded-xl transition-colors disabled:opacity-50">
                    <span class="material-symbols-outlined text-base" :class="{'animate-spin': isCompleting}">{{ isCompleting ? 'sync' : 'magic_button' }}</span>
                </button>
                <button type="button" @click="closeModal" class="px-4 py-2 h-10 text-sm font-semibold text-[var(--color-on-surface)] bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container-high)] rounded-xl transition-colors border border-[var(--color-outline-variant)]">
                  Batal
                </button>
                <button type="submit" @click="handleSave" :disabled="isSaving || !isFormValid || !isFormDirty" class="px-4 py-2 h-10 text-sm font-semibold text-[var(--color-on-primary)] bg-[var(--color-primary)] hover:bg-[var(--color-primary-fixed-dim)] rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  <span v-if="isSaving">Menyimpan...</span>
                  <span v-else>Simpan</span>
                </button>
              </div>
            </div>

            <TransitionRoot :show="isConfirmDeactivateDialogOpen" as="template">
              <Dialog @close="isConfirmDeactivateDialogOpen = false" class="relative z-[60]">
                <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100" leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
                  <div class="fixed inset-0 bg-black/60" />
                </TransitionChild>
                <div class="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
                  <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95">
                    <DialogPanel class="w-full max-w-sm transform overflow-hidden rounded-3xl bg-[var(--color-surface-container-high)] p-6 text-center align-middle shadow-xl transition-all">
                      <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-error-container)]">
                        <span class="material-symbols-outlined text-4xl text-[var(--color-on-error-container)]">visibility_off</span>
                      </div>
                      <DialogTitle as="h3" class="mt-4 text-2xl font-bold text-[var(--color-on-background)]">Nonaktifkan Grup?</DialogTitle>
                      <p class="mt-2 text-sm text-[var(--color-on-surface-variant)]">Grup kalimat ini tidak akan muncul di aplikasi utama, tetapi tidak akan dihapus permanen.</p>
                      <div v-if="error" class="mt-4 text-sm text-[var(--color-error)]">{{ error }}</div>
                      <div class="mt-6 grid grid-cols-2 gap-3">
                        <button type="button" @click="isConfirmDeactivateDialogOpen = false" class="w-full rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] px-4 py-2 font-semibold text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-surface-container-low]">Batal</button>
                        <button @click="confirmDeactivateGroup" :disabled="isDeactivating" class="w-full rounded-xl bg-[var(--color-error)] px-4 py-2 font-semibold text-[var(--color-on-error)] transition-colors hover:bg-[var(--color-on-error-container)] disabled:opacity-50">
                          <span v-if="isDeactivating">Memproses...</span>
                          <span v-else>Ya, Nonaktifkan</span>
                        </button>
                      </div>
                    </DialogPanel>
                  </TransitionChild>
                </div>
              </Dialog>
            </TransitionRoot>
            
            <TransitionRoot :show="isConfirmCloseDialogOpen" as="template">
              <Dialog @close="isConfirmCloseDialogOpen = false" class="relative z-[70]">
                <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100" leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
                  <div class="fixed inset-0 bg-black/60" />
                </TransitionChild>
                <div class="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
                  <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95">
                    <DialogPanel class="w-full max-w-sm transform overflow-hidden rounded-3xl bg-[var(--color-surface-container-high)] p-6 text-center align-middle shadow-xl transition-all">
                      <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-error-container)]">
                        <span class="material-symbols-outlined text-4xl text-[var(--color-on-error-container)]">warning</span>
                      </div>
                      <DialogTitle as="h3" class="mt-4 text-2xl font-bold text-[var(--color-on-background)]">Tutup Tanpa Menyimpan?</DialogTitle>
                      <p class="mt-2 text-sm text-[var(--color-on-surface-variant)]">Anda memiliki perubahan yang belum disimpan. Apakah Anda yakin ingin keluar?</p>
                      <div class="mt-6 grid grid-cols-2 gap-3">
                        <button type="button" @click="isConfirmCloseDialogOpen = false" class="w-full rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] px-4 py-2 font-semibold text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-surface-container-low)]">Batal</button>
                        <button @click="forceCloseModal" class="w-full rounded-xl bg-[var(--color-error)] px-4 py-2 font-semibold text-[var(--color-on-error)] transition-colors hover:bg-[var(--color-error-container)]">Ya, Keluar</button>
                      </div>
                    </DialogPanel>
                  </TransitionChild>
                </div>
              </Dialog>
            </TransitionRoot>

            <TransitionRoot :show="showJsonModal" as="template">
              <Dialog as="div" @close="showJsonModal = false" class="relative z-[80]">
                <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100" leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
                  <div class="fixed inset-0 bg-black/60" />
                </TransitionChild>
                <div class="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
                  <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95">
                    <DialogPanel class="w-full max-w-xl rounded-4xl bg-[var(--color-surface-container-high)] p-6 shadow-2xl">
                      <DialogTitle as="h3" class="text-2xl font-bold text-[var(--color-on-background)]">Impor dari JSON</DialogTitle>
                      <p class="mt-4 text-sm text-[var(--color-on-surface-variant)]">Tempelkan JSON. Teks yang ada saat ini akan ditimpa.</p>
                      <textarea v-model="jsonInput" class="mt-2 w-full h-48 p-2 border border-[var(--color-outline-variant)] rounded-xl bg-[var(--color-surface-container)] text-[var(--color-on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm font-mono"></textarea>
                      <p v-if="jsonError" class="mt-2 text-sm text-[var(--color-error)]">{{ jsonError }}</p>
                      <div class="mt-6 flex justify-end space-x-2">
                        <button @click="showJsonModal = false" class="px-4 py-2 text-sm font-semibold rounded-xl bg-[var(--color-surface-container)] text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-surface-container-high)]">Batal</button>
                        <button @click="processJsonInput" class="px-4 py-2 text-sm font-semibold rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-fixed-dim)] text-[var(--color-on-primary)] transition-colors">Terapkan</button>
                      </div>
                    </DialogPanel>
                  </TransitionChild>
                </div>
              </Dialog>
            </TransitionRoot>
            
          </DialogPanel>
        </TransitionChild>
      </div>
    </Dialog>

  </TransitionRoot>


</template>
