<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, type PropType } from 'vue';
import { useLanguageStore } from '@/stores/language';
import { isFormDirty as checkFormDirty } from '@/utils/dirtyForm';
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
  Popover,
  PopoverButton,
  PopoverPanel,
} from '@headlessui/vue';
import { cloneDeep, isEqual } from 'lodash-es';
import { api } from '@/utils/api';
import { useClipboard } from '@vueuse/core';
import { useI18n } from 'vue-i18n';

// Helper untuk membuat ID unik yang kompatibel
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Props dan Emits
const props = defineProps({
  modelValue: { type: Boolean, required: true },
  word: { type: Object as PropType<any>, required: true },
});
const { t } = useI18n();
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'close'): void;
  (e: 'translations-saved', payload: any): void;
}>();

// Stores
const languageStore = useLanguageStore();

// State Komponen
const isSaving = ref(false);
const isAiCompleting = ref(false);
const isCheckingAccuracy = ref(false);
const accuracyScore = ref<number | null>(null);
const accuracyError = ref<string | null>(null);
const aiReport = ref<any>(null);
const showAiCommentModal = ref(false);
const aiPrompt = ref('');
const aiContext = ref('');
const showPromptModal = ref(false);
const showContextModal = ref(false);
const error = ref<string | null>(null);
const localTranslations = ref<any[]>([]);
const initialTranslations = ref<any[]>([]);
const isConfirmCloseDialogOpen = ref(false);
const textareaRefs = ref<Record<string, HTMLElement | null>>({});
const infoVisibility = ref<Record<string, boolean>>({});
const selectedTabIndex = ref(0);

// State untuk Modal JSON
const showJsonModal = ref(false);
const jsonInput = ref('');
const jsonError = ref(null);


const appSettings = ref(null);

const getScoreColor = (score: number | null | undefined) => {
  if (score === null || score === undefined)
    return 'text-[var(--color-on-surface-variant)]';
  if (score >= 90) return 'text-[var(--color-primary)]';
  if (score >= 70) return 'text-[var(--color-tertiary)]';
  return 'text-[var(--color-error)]';
};

const fetchAppSettings = async () => {
  try {
    const response = await api.get('/admin/app-settings/');
    appSettings.value = response.data;
  } catch (err) {
    console.error('Gagal mengambil pengaturan aplikasi:', err);
  }
};

const updateAppSettings = async (payload: any) => {
  try {
    const response = await api.patch('/admin/app-settings/', payload);
    appSettings.value = response.data;
  } catch (err) {
    console.error('Gagal memperbarui pengaturan aplikasi:', err);
    // Optionally revert the switch state on error
    if (appSettings.value && payload.is_scraper_enabled !== undefined) {
      appSettings.value.is_scraper_enabled = !payload.is_scraper_enabled;
    }
  }
};

// Computed Properties
const isOpen = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
});

const targetLanguages = computed(() => {
  if (!props.word.language_code) {
    return languageStore.opsiBahasa;
  }
  return languageStore.opsiBahasa.filter(
    (lang: any) => lang.kodeBahasa !== props.word.language_code,
  );
});

const isFormDirty = computed(() => {
  return checkFormDirty(initialTranslations.value, localTranslations.value);
});

const areAllTranslationsComplete = computed(() => {
  if (!targetLanguages.value.length) return false; // No target languages, so not "complete"

  return targetLanguages.value.every((lang: any) => {
    return localTranslations.value.some(
      (trans) =>
        trans.language_code === lang.kodeBahasa &&
        trans.tl &&
        trans.tl.trim() !== '',
    );
  });
});

// === PERUBAHAN 2: Fungsi untuk menghitung data 'dirty' per tab ===
const getDirtyCountForLang = (langCode: string) => {
  // 1. Dapatkan semua terjemahan lokal untuk bahasa ini
  const localTransForLang = localTranslations.value.filter(
    (t) => t.language_code === langCode,
  );

  let dirtyCount = 0;
  for (const localTrans of localTransForLang) {
    // 2. Temukan state awal-nya
    const initialTrans = initialTranslations.value.find(
      (t) => t._id === localTrans._id,
    );

    // 3. Bandingkan
    if (!isEqual(localTrans, initialTrans)) {
      dirtyCount++;
    }
  }
  return dirtyCount;
};
// ========================================================

// Watchers
watch(isOpen, (isOpening) => {
  if (isOpening) {
    initializeData();
  }
});

watch(showJsonModal, (isShowing) => {
  if (isShowing) {
    // Get all definitions for this word to map IDs to indices
    const allDefs = props.word.definitions || [];

    const dataToDisplay = localTranslations.value.map(({ _id, ...rest }) => {
      // Convert definition_ids to 1-indexed indices
      const indices = (rest.definition_ids || [])
        .map((defId) => {
          const idx = allDefs.findIndex((d) => d.id === defId);
          return idx !== -1 ? idx + 1 : null; // 1-indexed
        })
        .filter((i) => i !== null);

      return {
        id: rest.id,
        language_code: rest.language_code,
        tl: rest.tl,
        info: rest.info,
        definition_indices: indices,
      };
    });
    jsonInput.value = JSON.stringify(dataToDisplay, null, 2);
    jsonError.value = null;

  }
});

// Fungsi-fungsi
// Fungsi-fungsi
const resizeTextarea = (el: any) => {
  if (!el) return;
  if (el.tagName === 'TEXTAREA') {
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  } else if (Array.isArray(el) && el.length > 0) {
    el[0].style.height = 'auto';
    el[0].style.height = `${el[0].scrollHeight}px`;
  }
};

const setTextareaRef = (el: any, key: string) => {
  if (el) {
    textareaRefs.value[key] = el as HTMLElement;
    nextTick(() => resizeTextarea(el));
  }
};

const initializeData = async () => {
  try {
    await languageStore.init();
    await fetchAppSettings();
    const initialData = (props.word.translations || []).map((t: any) => ({
      id: t.id,
      _id: generateUUID(),
      language_code: t.language_code,
      tl: t.target_word || '',
      info: t.notes || '',
      position: t.position || 0,
      definition_ids: t.definition_ids || [],
    }));

    localTranslations.value = cloneDeep(initialData);
    initialTranslations.value = cloneDeep(initialData);

    accuracyScore.value = null;
    accuracyError.value = null;
    aiReport.value = null;
    aiPrompt.value = '';
    aiContext.value = '';

    const userSelectedLangCode = languageStore.selectedTarget?.kodeBahasa;
    const targetIndex = targetLanguages.value.findIndex(
      (lang: any) => lang.kodeBahasa === userSelectedLangCode,
    );

    if (targetIndex !== -1) {
      selectedTabIndex.value = targetIndex;
    } else if (targetLanguages.value.length > 0) {
      selectedTabIndex.value = 0;
    } else {
      selectedTabIndex.value = 0;
    }

    infoVisibility.value = {};
    localTranslations.value.forEach((trans) => {
      infoVisibility.value[trans._id] = !!trans.info;
    });

    nextTick(() => {
      Object.values(textareaRefs.value)
        .flat()
        .forEach((el: any) => resizeTextarea(el));
    });
  } catch (e) {
    console.error('Gagal menginisialisasi data dialog:', e);
    error.value = t('admin.error_load_data');
  }
};

const resetState = () => {
  isSaving.value = false;
  isAiCompleting.value = false;
  error.value = null;
  localTranslations.value = [];
  initialTranslations.value = [];
  isConfirmCloseDialogOpen.value = false;
  infoVisibility.value = {};
  showJsonModal.value = false;
  jsonInput.value = '';
  jsonError.value = null;
  textareaRefs.value = {}; // Reset ref saat menutup
  aiReport.value = null; // Changed from aiComment
  showAiCommentModal.value = false;
  aiPrompt.value = '';
  aiContext.value = '';
  showPromptModal.value = false;
  showContextModal.value = false;
  appSettings.value = null;
};

const handleCloseIntent = () => {
  if (isFormDirty.value) {
    isConfirmCloseDialogOpen.value = true;
  } else {
    forceCloseModal();
  }
};

const forceCloseModal = () => {
  isConfirmCloseDialogOpen.value = false;
  isOpen.value = false;
  emit('close');
};

const handleSave = async () => {
  if (!isFormDirty.value || !props.word?.id) return;

  isSaving.value = true;
  error.value = null;

  const translationSet = new Set();
  for (const trans of localTranslations.value) {
    const tl = trans.tl || '';
    const key = `${trans.language_code}|${tl.trim().toLowerCase()}`;
    if (tl.trim() && translationSet.has(key)) {
      const langName =
        targetLanguages.value.find((l) => l.kodeBahasa === trans.language_code)
          ?.nama || trans.language_code;
      error.value = t('admin.error_duplicate_definition', { lang: langName, text: tl });
      isSaving.value = false;
      return;
    }
    if (tl.trim()) {
      translationSet.add(key);
    }
  }

  const cleanedTranslations = localTranslations.value.map(
    ({ _id, ...rest }) => ({
      language_code: rest.language_code,
      target_word: (rest.tl || '').trim(),
      notes: rest.info?.trim() || null,
      id: rest.id || null,
      position: rest.position || 0,
      definition_ids: rest.definition_ids || [], // [UPDATED] Send definition_ids array
    }),
  );

  try {
    const response = await api.patch(`/admin/words/${props.word.id}/`, {
      translations: cleanedTranslations,
    });

    emit('translations-saved', response.data);
    forceCloseModal();
  } catch (err) {
    console.error(
      'Gagal menyimpan terjemahan:',
      err.response?.data || err.message,
    );
    error.value =
      err.response?.data?.error ||
      err.response?.data?.detail ||
      'Gagal menyimpan. Silakan coba lagi.';
  } finally {
    isSaving.value = false;
  }
};

const handleAiComplete = async () => {
  isAiCompleting.value = true;
  error.value = null;
  try {
    if (!props.word.id) throw new Error('Word ID is required.');
    const response = await api.patch(`/admin/words/${props.word.id}/`, {
      action: 'ai_preview',
    });
    const aiGeneratedTranslations = response.data;

    if (!aiGeneratedTranslations || aiGeneratedTranslations.length === 0) {
      error.value =
        'AI tidak dapat menghasilkan terjemahan baru atau memperbarui yang sudah ada.';
      localTranslations.value = [];
    } else {
      // [UPDATED] Map definition_indices to definition_ids using LANGUAGE-FILTERED definitions
      localTranslations.value = aiGeneratedTranslations.map((aiTrans) => {
        // The AI returns indices corresponding to the list of definitions FOR THAT LANGUAGE.
        // So we must filter the props.word.definitions to match what the AI saw.
        const langDefs = props.word.definitions.filter(
          (d) => d.language_code === aiTrans.language_code,
        );

        const mappedDefIds = (aiTrans.definition_indices || [])
          .map((idx) => langDefs[idx]?.id) // Use the filtered list!
          .filter((id) => id !== undefined);

        return {
          _id: generateUUID(),
          language_code: aiTrans.language_code,
          tl: aiTrans.translation,
          info: aiTrans.info || '',
          definition_ids: mappedDefIds,
        };
      });
    }

    // Re-initialize infoVisibility for potentially new translations
    infoVisibility.value = {};
    localTranslations.value.forEach((trans) => {
      infoVisibility.value[trans._id] = !!trans.info;
    });

    nextTick(() => {
      Object.values(textareaRefs.value)
        .flat()
        .forEach((el) => {
          resizeTextarea(el);
        });
    });
  } catch (err) {
    console.error(
      'Gagal melengkapi dengan AI:',
      err.response?.data || err.message,
    );
    error.value =
      err.response?.data?.error ||
      err.response?.data?.detail ||
      'Gagal mengambil pratinjau AI.';
  } finally {
    isAiCompleting.value = false;
  }
};

// ...

const processJsonInput = () => {
  jsonError.value = null;
  try {
    const data = JSON.parse(jsonInput.value);
    if (!Array.isArray(data)) {
      throw new Error(
        'Format JSON harus berupa sebuah array (daftar) terjemahan.',
      );
    }

    const isValid = data.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        'language_code' in item &&
        'tl' in item,
    );

    if (!isValid) {
      throw new Error(
        "Setiap objek dalam array harus memiliki properti 'language_code' dan 'tl'.",
      );
    }

    localTranslations.value = data.map((item) => ({
      _id: generateUUID(),
      id: item.id || null,
      language_code: item.language_code,
      tl: item.tl,
      info: item.info || '',
      definition_ids: item.definition_ids || [],
    }));

    showJsonModal.value = false;

    nextTick(() => {
      Object.values(textareaRefs.value)
        .flat()
        .forEach((el) => {
          resizeTextarea(el);
        });
    });
  } catch (e) {
    jsonError.value = `Gagal memproses JSON: ${e.message}`;
  }
};

// ...

const addTranslation = (langCode) => {
  if (!langCode) return;
  const newTrans = {
    _id: generateUUID(),
    language_code: langCode,
    tl: '',
    info: '',
    definition_ids: [], // [UPDATED] Array for multiple definitions
  };
  localTranslations.value.push(newTrans);
  infoVisibility.value[newTrans._id] = false;

  nextTick(() => {
    const newEl = textareaRefs.value[`tl-${newTrans._id}`];
    if (Array.isArray(newEl) && newEl.length > 0) {
      resizeTextarea(newEl[0]);
    } else if (newEl) {
      resizeTextarea(newEl);
    }
  });
};

const deleteTranslation = (translationToDelete) => {
  const index = localTranslations.value.findIndex(
    (t) => t._id === translationToDelete._id,
  );
  if (index > -1) {
    localTranslations.value.splice(index, 1);
  }
};

const clearAllTranslations = () => {
  // Menghapus semua terjemahan di frontend saja (belum disimpan ke DB)
  localTranslations.value = [];
  infoVisibility.value = {}; // Reset visibility juga
};



const handleInput = (event, field, translation) => {
  translation[field] = event.target.value;
  nextTick(() => {
    resizeTextarea(event.target);
  });
};

// === PERUBAHAN 3: toggleInfo diubah menjadi satu arah ===
const toggleInfo = (trans: any) => {
  infoVisibility.value[trans._id] = true;
  nextTick(() => {
    const infoEl = textareaRefs.value[`info-${trans._id}`];
    if (infoEl) resizeTextarea(infoEl);
  });
};

watch(selectedTabIndex, () => {
  nextTick(() => {
    const activeLangCode =
      targetLanguages.value[selectedTabIndex.value]?.kodeBahasa;
    if (activeLangCode) {
      const activeTranslations = localTranslations.value.filter(
        (t) => t.language_code === activeLangCode,
      );
      activeTranslations.forEach((trans) => {
        const tlEl = textareaRefs.value[`tl-${trans._id}`];
        const infoEl = textareaRefs.value[`info-${trans._id}`];
        if (tlEl) resizeTextarea(tlEl);
        if (infoEl) resizeTextarea(infoEl);
      });
    }
  });
});

const domainMap: Record<string, string> = {
  mathematics: 'Mat',
  physics: 'Fis',
  chemistry: 'Kim',
  biology: 'Bio',
  astronomy: 'Astron',
  geology: 'Geol',
  ecology: 'Eko',
  botany: 'Bot',
  zoology: 'Zoo',
  medicine: 'Dok',
  anatomy: 'Anat',
  pharmacy: 'Far',
  psychology: 'Psik',
  computing: 'Komp',
  electronics: 'El',
  engineering: 'Tek',
  architecture: 'Arsit',
  telecommunications: 'Telkom',
  law: 'Huk',
  politics: 'Pol',
  economics: 'Ek',
  sociology: 'Sos',
  anthropology: 'Ant',
  history: 'Sej',
  philosophy: 'Fil',
  linguistics: 'Ling',
  education: 'Dik',
  commerce: 'Dag',
  finance: 'Keu',
  accounting: 'Akun',
  art: 'Sen',
  music: 'Mus',
  literature: 'Sas',
  theater: 'Teater',
  military: 'Mil',
  sports: 'Olr',
  religion: 'Agama',
  agriculture: 'Tan',
  maritime: 'Kap',
  aviation: 'Peng',
  culinary: 'Kul',
  mining: 'Min',
  textiles: 'Teks',
  colloquial: 'Cak',
  archaic: 'Ark',
  formal: 'Hor',
};

const formatDomain = (code: string) => {
  if (!code) return '';
  const norm = code.toLowerCase();
  return domainMap[norm] || code.charAt(0).toUpperCase() + code.slice(1);
};

// =========================================================================
// AI ACCURACY CHECK & JSON CLIPBOARD
// =========================================================================

const checkAiAccuracy = async () => {
  if (!props.word.id) return;
  isCheckingAccuracy.value = true;
  accuracyScore.value = null;
  accuracyError.value = null;
  aiReport.value = null;

  try {
    // Send current translations to backend for evaluation
    const cleanedTranslations = localTranslations.value.map(({ _id, ...rest }) => ({
      language_code: rest.language_code,
      target_word: (rest.tl || '').trim(),
      notes: rest.info?.trim() || null,
      id: rest.id || null, // existing ID if any
      definition_ids: rest.definition_ids || [],
    }));

    // Example payload structure - adjust based on your actual backend endpoint
    const response = await api.post(`/admin/words/${props.word.id}/check_accuracy/`, {
      translations: cleanedTranslations
    });

    // Assuming backend returns { score: number, report: any }
    accuracyScore.value = response.data.score;
    aiReport.value = response.data.report;
    showAiCommentModal.value = true;

  } catch (err: any) {
    console.error('AI Accuracy Check Failed:', err);
    accuracyError.value = err.response?.data?.error || 'Gagal mengecek akurasi.';
  } finally {
    isCheckingAccuracy.value = false;
  }
};

const handleAccuracyButtonClick = () => {
  if (accuracyScore.value !== null) {
    showAiCommentModal.value = true;
  } else {
    checkAiAccuracy();
  }
};

const { copy, copied: jsonCopied } = useClipboard({ legacy: true });
const copyJsonToClipboard = () => {
  copy(jsonInput.value);
};

onMounted(() => {
  if (isOpen.value) {
    initializeData();
  }
});
</script>

<template>
  <TransitionRoot :show="isOpen" as="template" @after-leave="resetState">
    <Dialog @close="handleCloseIntent" class="relative z-50">
      <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100"
        leave="duration-300 ease-in" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-black/50" />
      </TransitionChild>
      <div class="fixed inset-0 flex items-center justify-center p-4">
        <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95"
          enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100"
          leave-to="opacity-0 scale-95">
          <DialogPanel
            class="mx-4 w-full max-w-4xl rounded-4xl bg-[var(--color-surface-container-high)] p-6 shadow-2xl flex flex-col max-h-[90vh]">
            <div class="relative flex-shrink-0 flex items-center justify-center mb-4">
              <h2 class="text-2xl font-bold text-[var(--color-on-background)]">
                {{ $t('admin.edit_translations') }}: <span class="font-mono text-[var(--color-primary)]">{{
                  props.word.base }}</span>
              </h2>
              <button @click="handleCloseIntent"
                class="absolute right-0 top-0 p-1 text-[var(--color-outline)] hover:text-[var(--color-on-background)] transition-colors">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>

            <template v-if="targetLanguages.length > 0">
              <TabGroup :selectedIndex="selectedTabIndex" @change="selectedTabIndex = $event" as="div"
                class="flex flex-col flex-grow overflow-hidden">
                <div class="flex-shrink-0 border-b border-[var(--color-outline-variant)]">
                  <TabList class="-mb-px flex space-x-2 overflow-x-auto">
                    <Tab v-for="lang in targetLanguages" :key="lang.kodeBahasa" as="template" v-slot="{ selected }">
                      <button :class="[
                        'whitespace-nowrap py-3 px-3 border-b-2 font-medium text-sm focus:outline-none transition-colors flex items-center gap-2',
                        selected
                          ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                          : 'border-transparent text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-background)] hover:border-[var(--color-outline)]'
                      ]">
                        <span>{{ lang.nama }}</span>
                        <span v-if="getDirtyCountForLang(lang.kodeBahasa) > 0"
                          class="flex items-center justify-center text-xs font-bold text-[var(--color-on-primary)] bg-[var(--color-primary)] rounded-full w-5 h-5">
                          {{ getDirtyCountForLang(lang.kodeBahasa) }}
                        </span>
                      </button>
                    </Tab>
                  </TabList>
                </div>

                <TabPanels class="flex-grow overflow-y-auto mt-4 pr-3 -mr-3">
                  <TabPanel v-for="lang in targetLanguages" :key="lang.kodeBahasa"
                    :class="['space-y-4', 'focus:outline-none']">
                    <template v-if="localTranslations.filter(t => t.language_code === lang.kodeBahasa).length > 0">

                      <div v-for="trans in localTranslations.filter(t => t.language_code === lang.kodeBahasa)"
                        :key="trans._id" class="p-4 rounded-2xl space-y-2 relative transition-colors" :class="[
                          !isEqual(initialTranslations.find(t => t._id === trans._id), trans)
                            ? 'bg-[var(--color-surface-container-highest)] border border-[var(--color-primary)]'
                            : 'bg-[var(--color-surface-container)] border border-transparent'
                        ]">

                        <div class="relative flex items-start">
                          <textarea :ref="(el) => setTextareaRef(el, `tl-${trans._id}`)" :value="trans.tl"
                            @input="handleInput($event, 'tl', trans)" rows="1" :placeholder="$t('translation') + '...'"
                            class="w-full pt-1 pb-1 pl-2 pr-20 bg-transparent border-0 focus:ring-0 focus:outline-none resize-none overflow-hidden text-lg font-semibold text-[var(--color-on-background)] placeholder-[var(--color-outline)]"></textarea>

                          <div class="flex-shrink-0 flex items-center gap-1 absolute top-1 right-2">
                            <button v-if="!infoVisibility[trans._id]" @click="toggleInfo(trans)"
                              class="flex items-center gap-1 text-xs text-[var(--color-on-primary-container)] bg-[var(--color-primary-container)] hover:bg-[var(--color-primary-container-hover)] px-2 py-1 rounded-full transition-colors"
                              title="Tambah info tambahan">
                              <span class="material-symbols-outlined !text-xs">add</span>
                              <span>{{ $t('info') }}</span>
                            </button>
                            <button @click="deleteTranslation(trans)"
                              class="flex items-center justify-center w-8 h-8 text-[var(--color-outline)] hover:text-[var(--color-error)] rounded-full hover:bg-[var(--color-error-container)] transition-colors"
                              title="Hapus terjemahan ini">
                              <span class="material-symbols-outlined text-base">delete</span>
                            </button>
                          </div>
                        </div>

                        <div
                          v-if="props.word.definitions && props.word.definitions.filter(d => d.language_code === trans.language_code).length > 0"
                          class="mt-3 ml-1">
                          <label
                            class="text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wide flex items-center gap-1 mb-1">
                            <span>{{ $t('related_definitions') }}:</span>
                          </label>
                          <div
                            class="border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] rounded-xl max-h-40 overflow-y-auto p-1 custom-scrollbar">
                            <div
                              v-for="(def, idx) in props.word.definitions.filter(d => d.language_code === trans.language_code)"
                              :key="def.id"
                              class="group flex items-start gap-3 p-2 rounded-lg hover:bg-[var(--color-surface-container-highest)] transition-colors cursor-pointer select-none"
                              @click.prevent="() => {
                                const id = def.id;
                                const index = trans.definition_ids.indexOf(id);
                                if (index === -1) trans.definition_ids.push(id);
                                else trans.definition_ids.splice(index, 1);
                              }">
                              <div class="pt-0.5">
                                <div class="w-5 h-5 rounded border flex items-center justify-center transition-all"
                                  :class="trans.definition_ids.includes(def.id)
                                    ? 'bg-[var(--color-primary)] border-[var(--color-primary)]'
                                    : 'border-[var(--color-outline)] group-hover:border-[var(--color-primary)]'">
                                  <span v-if="trans.definition_ids.includes(def.id)"
                                    class="material-symbols-outlined text-sm text-[var(--color-on-primary)] font-bold">check</span>
                                </div>
                              </div>
                              <div class="text-sm text-[var(--color-on-surface)] leading-snug">
                                <span class="font-bold text-[var(--color-primary)] mr-1">{{ Number(idx) + 1 }}.</span>
                                <span v-if="def.domain"
                                  class="inline-block px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)] mr-1 mb-0.5 align-middle">{{
                                    formatDomain(def.domain) }}</span>
                                <span>{{ def.definition_text }}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div v-if="infoVisibility[trans._id]" class="flex items-start gap-2">
                          <span
                            class="material-symbols-outlined text-[var(--color-on-surface-variant)] !text-base flex-shrink-0 mt-2 ml-1"
                            title="Info tambahan">info</span>
                          <textarea :ref="(el) => setTextareaRef(el, `info-${trans._id}`)" :value="trans.info"
                            @input="handleInput($event, 'info', trans)" rows="1"
                            :placeholder="$t('additional_info') + '...'"
                            class="mt-1 w-full p-2 border rounded-lg bg-[var(--color-surface-container-high)] border-[var(--color-outline-variant)] text-sm text-[var(--color-on-surface-variant)] italic focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] resize-none overflow-hidden"></textarea>
                        </div>
                      </div>
                    </template>

                    <div v-else class="text-center py-12 text-[var(--color-on-surface-variant)] italic">
                      {{ $t('admin.no_translations') }}
                    </div>

                    <div class="mt-4 flex justify-center">
                      <button @click="addTranslation(lang.kodeBahasa)"
                        class="flex items-center gap-2 px-4 py-2 h-10 text-sm font-semibold text-[var(--color-on-primary)] bg-[var(--color-primary)] hover:bg-[var(--color-primary-fixed-dim)] rounded-full transition-colors">
                        <span class="material-symbols-outlined text-base">add</span>
                        <span>{{ $t('admin.add_translation') }}</span>
                      </button>
                    </div>
                  </TabPanel>
                </TabPanels>
              </TabGroup>
            </template>
            <div v-else
              class="flex-grow flex items-center justify-center text-center py-12 text-[var(--color-on-surface-variant)]">
              <div>
                <span class="material-symbols-outlined text-4xl">translate_off</span>
                <p class="mt-2">{{ $t('admin.no_target_languages') }}</p>
              </div>
            </div>

            <div v-if="error"
              class="flex-shrink-0 flex items-center space-x-4 rounded-xl border border-[var(--color-error)] bg-[var(--color-error-container)] px-4 py-3 mt-4">
              <p class="font-medium text-[var(--color-on-error-container)]">{{ error }}</p>
            </div>

            <div
              class="mt-6 pt-4 border-t border-[var(--color-outline-variant)] flex-shrink-0 flex justify-between items-center gap-3">
              <div class="flex items-center gap-2">
                <Popover v-if="appSettings" class="relative">
                  <PopoverButton class="flex items-center justify-center h-10 w-10 rounded-xl transition-colors"
                    :class="appSettings.is_scraper_enabled ? 'bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]' : 'bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)]'"
                    :title="$t('admin.scraper_status', { status: appSettings.is_scraper_enabled ? $t('active') : $t('inactive') })">
                    <span class="material-symbols-outlined">{{ appSettings.is_scraper_enabled ? 'cloud_sync' :
                      'cloud_off' }}</span>
                  </PopoverButton>

                  <transition enter-active-class="transition duration-200 ease-out"
                    enter-from-class="translate-y-1 opacity-0" enter-to-class="translate-y-0 opacity-100"
                    leave-active-class="transition duration-150 ease-in" leave-from-class="translate-y-0 opacity-100"
                    leave-to-class="translate-y-1 opacity-0">
                    <PopoverPanel class="absolute bottom-full mb-2 w-72 z-10">
                      <div
                        class="overflow-hidden rounded-2xl bg-[var(--color-surface-container-highest)] p-4 shadow-lg ring-1 ring-black ring-opacity-5">
                        <div class="flex items-center justify-between">
                          <span class="text-sm font-medium text-[var(--color-on-background)]">{{
                            $t('admin.scraper_fetch')
                            }}</span>
                          <div class="md-switch group relative inline-flex items-center flex-shrink-0"
                            :class="{ 'selected': appSettings.is_scraper_enabled }"
                            @click.stop="updateAppSettings({ is_scraper_enabled: !appSettings.is_scraper_enabled })"
                            role="switch" :aria-checked="appSettings.is_scraper_enabled"
                            aria-label="Aktifkan Scraper/Fetch" tabindex="0"
                            @keydown.space.prevent="updateAppSettings({ is_scraper_enabled: !appSettings.is_scraper_enabled })"
                            @keydown.enter.prevent="updateAppSettings({ is_scraper_enabled: !appSettings.is_scraper_enabled })">
                            <div
                              class="track h-[32px] w-[52px] rounded-full border-2 transition-colors duration-200 ease-in-out cursor-pointer relative"
                              :class="[
                                appSettings.is_scraper_enabled
                                  ? 'bg-[var(--color-primary)] border-[var(--color-primary)] group-hover:bg-[var(--color-primary-fixed-dim)]'
                                  : 'bg-[var(--color-surface-container-highest)] border-[var(--color-outline)] group-hover:bg-[var(--color-surface-container-high)] group-hover:border-[var(--color-outline)]'
                              ]">
                              <div class="handle-container absolute top-0 left-0 h-full w-full pointer-events-none">
                                <div
                                  class="handle absolute top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)] shadow-sm"
                                  :class="[
                                    appSettings.is_scraper_enabled
                                      ? 'h-[24px] w-[24px] bg-[var(--color-on-primary)] left-[calc(100%-24px-4px)]'
                                      : 'h-[16px] w-[16px] bg-[var(--color-outline)] left-[6px] group-hover:bg-[var(--color-on-surface-variant)]',
                                    'group-active:h-[28px] group-active:w-[28px]',
                                    appSettings.is_scraper_enabled ? 'group-active:left-[calc(100%-28px-2px)]' : 'group-active:left-[2px]'
                                  ]">
                                  <svg v-if="appSettings.is_scraper_enabled" xmlns="http://www.w3.org/2000/svg"
                                    height="16" viewBox="0 -960 960 960" width="16"
                                    class="fill-[var(--color-primary)] opacity-100">
                                    <path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z" />
                                  </svg>
                                  <svg v-if="!appSettings.is_scraper_enabled" xmlns="http://www.w3.org/2000/svg"
                                    height="16" viewBox="0 -960 960 960" width="16"
                                    class="fill-[var(--color-surface-container-highest)] opacity-100">
                                    <path
                                      d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
                                  </svg>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <p class="mt-2 text-xs text-[var(--color-on-surface-variant)]">
                          {{ $t('admin.scraper_desc') }}
                        </p>
                      </div>
                    </PopoverPanel>
                  </transition>
                </Popover>

                <button type="button" @click="handleCloseIntent"
                  class="px-4 py-2 h-10 text-sm font-semibold text-[var(--color-on-surface)] bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container-high)] rounded-xl transition-colors border border-[var(--color-outline-variant)]">
                  {{ $t('cancel') }}
                </button>
              </div>
              <div class="flex justify-end items-center gap-2">
                <button type="button" @click="clearAllTranslations" title="Bersihkan Semua Data (Belum Disimpan)"
                  class="flex items-center justify-center h-10 w-10 text-sm font-semibold text-[var(--color-on-error-container)] bg-[var(--color-error-container)] hover:bg-[var(--color-error)] hover:text-[var(--color-on-error)] rounded-xl transition-colors">
                  <span class="material-symbols-outlined text-base">delete_sweep</span>
                </button>
                <button type="button" @click="handleAiComplete" :disabled="isAiCompleting"
                  :title="areAllTranslationsComplete ? $t('admin.retry_ai_all') : $t('admin.complete_missing_ai')"
                  class="flex items-center justify-center h-10 w-10 text-sm font-semibold text-[var(--color-on-primary)] bg-[var(--color-primary)] hover:bg-[var(--color-primary-fixed-dim)] rounded-xl transition-colors disabled:opacity-50">
                  <span class="material-symbols-outlined text-base" :class="{ 'animate-spin': isAiCompleting }">{{
                    isAiCompleting ?
                      'sync' : 'magic_button' }}</span>
                </button>

                <button v-if="areAllTranslationsComplete" type="button" @click="handleAccuracyButtonClick"
                  :disabled="isCheckingAccuracy || !props.word?.id"
                  :title="accuracyScore !== null ? $t('accuracy') + ' AI: ' + Math.round(accuracyScore) + '%' : $t('admin.accuracy_report')"
                  class="flex items-center justify-center h-10 w-auto min-w-10 px-3 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
                  :class="[accuracyScore !== null ? 'bg-[var(--color-tertiary-container)] text-[var(--color-on-tertiary-container)]' : 'bg-[var(--color-tertiary)] text-[var(--color-on-tertiary)] hover:bg-[var(--color-tertiary-fixed-dim)]']">
                  <span v-if="isCheckingAccuracy" class="material-symbols-outlined text-base animate-spin">sync</span>
                  <span v-else-if="accuracyScore !== null" class="flex items-center gap-1">
                    {{ Math.round(accuracyScore) }}%
                  </span>
                  <span v-else class="material-symbols-outlined text-base">fact_check</span>
                </button>
                <span v-if="accuracyError" class="text-sm text-[var(--color-error)]">
                  {{ accuracyError }}
                </span>
                <button type="button" @click="showJsonModal = true" :title="$t('admin.import_export_json')"
                  class="flex items-center justify-center h-10 w-10 text-sm font-semibold text-[var(--color-on-primary)] bg-[var(--color-primary)] hover:bg-[var(--color-primary-fixed-dim)] rounded-xl transition-colors">
                  <span class="material-symbols-outlined text-base">file_json</span>
                </button>
                <button type="button" @click="handleSave" :disabled="isSaving || !isFormDirty"
                  class="px-4 py-2 h-10 text-sm font-semibold text-[var(--color-on-primary)] bg-[var(--color-primary)] hover:bg-[var(--color-primary-fixed-dim)] rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  <span v-if="isSaving">{{ $t('saving') }}...</span>
                  <span v-else>{{ $t('save') }}</span>
                </button>
              </div>
            </div>

            <TransitionRoot :show="isConfirmCloseDialogOpen" as="template">
              <Dialog @close="isConfirmCloseDialogOpen = false" class="relative z-[60]">
                <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0"
                  enter-to="opacity-100" leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
                  <div class="fixed inset-0 bg-black/60" />
                </TransitionChild>
                <div class="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
                  <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95"
                    enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100"
                    leave-to="opacity-0 scale-95">
                    <DialogPanel
                      class="w-full max-w-sm transform overflow-hidden rounded-3xl bg-[var(--color-surface-container-high)] p-6 text-center align-middle shadow-xl transition-all">
                      <div
                        class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-error-container)]">
                        <span
                          class="material-symbols-outlined text-4xl text-[var(--color-on-error-container)]">warning</span>
                      </div>
                      <DialogTitle as="h3" class="mt-4 text-2xl font-bold text-[var(--color-on-background)]">{{
                        $t('admin.unsaved_changes') }}</DialogTitle>
                      <p class="mt-2 text-sm text-[var(--color-on-surface-variant)]">{{ $t('admin.unsaved_changes_desc')
                        }}</p>
                      <div class="mt-6 grid grid-cols-2 gap-3">
                        <button type="button" @click="isConfirmCloseDialogOpen = false"
                          class="w-full rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] px-4 py-2 font-semibold text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-surface-container-low)]">
                          {{ $t('admin.continue_edit') }}
                        </button>
                        <button @click="forceCloseModal"
                          class="w-full rounded-xl bg-[var(--color-error)] px-4 py-2 font-semibold text-[var(--color-on-error)] transition-colors hover:bg-[var(--color-error-container)]">
                          {{ $t('admin.close_without_save') }}
                        </button>
                      </div>
                    </DialogPanel>
                  </TransitionChild>
                </div>
              </Dialog>
            </TransitionRoot>

            <!-- Modal JSON Import/Export -->
            <TransitionRoot :show="showJsonModal" as="template">
              <Dialog as="div" @close="showJsonModal = false" class="relative z-[60]">
                <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0"
                  enter-to="opacity-100" leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
                  <div class="fixed inset-0 bg-black/60" />
                </TransitionChild>
                <div class="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
                  <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95"
                    enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100"
                    leave-to="opacity-0 scale-95">
                    <DialogPanel
                      class="w-full max-w-4xl transform overflow-hidden rounded-3xl bg-[var(--color-surface-container-high)] p-6 text-left align-middle shadow-xl transition-all">
                      <DialogTitle as="h3" class="text-2xl font-bold text-[var(--color-on-background)]">
                        {{ $t('admin.import_export_json') }}
                      </DialogTitle>
                      <p class="mt-4 text-sm text-[var(--color-on-surface-variant)]">{{ $t('admin.json_description') }}
                      </p>
                      <div class="relative mt-4">
                        <textarea v-model="jsonInput" @focus="($event.target as HTMLTextAreaElement).select()"
                          class="w-full min-h-[350px] p-4 border border-[var(--color-outline-variant)] rounded-xl bg-[var(--color-surface-container)] text-[var(--color-on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm font-mono whitespace-pre-wrap"></textarea>
                        <button @click="copyJsonToClipboard"
                          class="absolute top-3 right-3 flex items-center gap-2 px-3 py-1 text-sm font-semibold rounded-full transition-colors"
                          :class="jsonCopied ? 'bg-[var(--color-tertiary)] text-[var(--color-on-tertiary)]' : 'bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-highest)]'">
                          <span class="material-symbols-outlined text-base">{{ jsonCopied ? 'check' : 'content_copy'
                            }}</span>
                          <span>{{ jsonCopied ? $t('copied') : $t('copy') }}</span>
                        </button>
                      </div>
                      <p v-if="jsonError" class="mt-2 text-sm text-[var(--color-error)]">{{ jsonError }}</p>
                      <div class="mt-6 flex justify-end space-x-2">
                        <button @click="showJsonModal = false"
                          class="px-4 py-2 text-sm font-semibold rounded-xl bg-[var(--color-surface-container)] text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-surface-container-high)]">{{
                            $t('cancel') }}</button>
                        <button @click="processJsonInput"
                          class="px-4 py-2 text-sm font-semibold rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-fixed-dim)] text-[var(--color-on-primary)] transition-colors">{{
                            $t('admin.apply_changes') }}</button>
                      </div>
                    </DialogPanel>
                  </TransitionChild>
                </div>
              </Dialog>
            </TransitionRoot>

            <!-- Modal AI Comment/Laporan Akurasi -->
            <TransitionRoot :show="showAiCommentModal" as="template">
              <Dialog as="div" @close="showAiCommentModal = false" class="relative z-[60]">
                <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0"
                  enter-to="opacity-100" leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
                  <div class="fixed inset-0 bg-black/60" />
                </TransitionChild>
                <div class="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
                  <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95"
                    enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100"
                    leave-to="opacity-0 scale-95">
                    <DialogPanel
                      class="w-full max-w-2xl transform overflow-hidden rounded-3xl bg-[var(--color-surface-container-high)] p-6 text-left align-middle shadow-xl transition-all">
                      <DialogTitle as="h3" class="text-2xl font-bold text-[var(--color-on-background)]">
                        <span>{{ $t('admin.accuracy_report') }}</span>
                      </DialogTitle>
                      <div v-if="aiReport" class="mt-4 space-y-6">
                        <div class="overflow-x-auto">
                          <table class="min-w-full border-collapse">
                            <thead class="bg-[var(--color-surface-container-highest)]">
                              <tr>
                                <th class="px-4 py-2 text-left text-sm font-semibold text-[var(--color-on-surface)]">
                                  {{ $t('parameter') }}</th>
                                <th
                                  class="px-4 py-2 text-center text-sm font-semibold text-[var(--color-on-surface)] w-24">
                                  {{ $t('score') }}
                                </th>
                                <th class="px-4 py-2 text-left text-sm font-semibold text-[var(--color-on-surface)]">
                                  {{ $t('comment') }}</th>
                              </tr>
                            </thead>
                            <tbody class="bg-[var(--color-surface-container)]">
                              <tr v-for="param in aiReport.parameters" :key="param.name"
                                class="border-b border-[var(--color-outline-variant)]">
                                <td class="px-4 py-3 font-medium text-[var(--color-on-surface-variant)]">{{ param.name
                                  }}</td>
                                <td class="px-4 py-3 text-center font-semibold" :class="getScoreColor(param.score)">{{
                                  Math.round(param.score) }}%</td>
                                <td class="px-4 py-3 text-sm text-[var(--color-on-surface-variant)] italic">"{{
                                  param.comment }}"
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        <div class="pt-4 border-t border-[var(--color-outline-variant)] text-right">
                          <h4 class="text-sm font-medium text-[var(--color-on-surface-variant)]">{{
                            $t('admin.total_average_score')
                            }}
                          </h4>
                          <p v-if="accuracyScore !== null" class="text-3xl font-bold"
                            :class="getScoreColor(accuracyScore)">
                            {{ Math.round(accuracyScore) }}%
                          </p>
                        </div>

                        <div class="flex gap-2">
                          <button @click="showPromptModal = true"
                            class="px-3 py-1 text-xs font-semibold rounded-xl bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface)] transition-colors">
                            {{ $t('admin.view_ai_prompt') }}
                          </button>
                          <button @click="showContextModal = true"
                            class="px-3 py-1 text-xs font-semibold rounded-xl bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface)] transition-colors">
                            {{ $t('admin.view_context_source') }}
                          </button>
                        </div>
                      </div>
                      <div class="mt-6 flex justify-end gap-2">
                        <button type="button" @click="checkAiAccuracy" :disabled="isCheckingAccuracy || !props.word?.id"
                          class="px-4 py-2 text-sm font-semibold rounded-xl bg-[var(--color-tertiary)] hover:bg-[var(--color-tertiary-fixed-dim)] text-[var(--color-on-tertiary)] transition-colors disabled:opacity-50">
                          <span v-if="isCheckingAccuracy"
                            class="material-symbols-outlined text-base animate-spin">sync</span>
                          <span v-else class="material-symbols-outlined text-base">refresh</span>
                          <span class="ml-1">{{ $t('admin.retry_verification') }}</span>
                        </button>
                        <button @click="showAiCommentModal = false"
                          class="px-4 py-2 text-sm font-semibold rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-fixed-dim)] text-[var(--color-on-primary)] transition-colors">
                          {{ $t('close') }}
                        </button>
                      </div>

                      <TransitionRoot :show="showPromptModal" as="template">
                        <Dialog as="div" @close="showPromptModal = false" class="relative z-[70]">
                          <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0"
                            enter-to="opacity-100" leave="duration-200 ease-in" leave-from="opacity-100"
                            leave-to="opacity-0">
                            <div class="fixed inset-0 bg-black/60" />
                          </TransitionChild>
                          <div class="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
                            <TransitionChild as="div" enter="duration-300 ease-out" enter-from="opacity-0 scale-95"
                              enter-to="opacity-100 scale-100" leave="duration-200 ease-in"
                              leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95">
                              <DialogPanel
                                class="w-full max-w-2xl transform overflow-hidden rounded-3xl bg-[var(--color-surface-container-high)] p-6 text-left align-middle shadow-xl transition-all">
                                <DialogTitle as="h3" class="text-2xl font-bold text-[var(--color-on-background)]">{{
                                  $t('admin.ai_prompt_title') }}
                                </DialogTitle>
                                <div class="mt-4">
                                  <pre
                                    class="whitespace-pre-wrap text-sm text-[var(--color-on-surface-variant)] bg-[var(--color-surface-container)] p-3 rounded-xl max-h-96 overflow-auto">
                        {{ aiPrompt }}</pre>
                                </div>
                                <div class="mt-6 flex justify-end">
                                  <button @click="showPromptModal = false"
                                    class="px-4 py-2 text-sm font-semibold rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-fixed-dim)] text-[var(--color-on-primary)] transition-colors">{{
                                    $t('close') }}</button>
                                </div>
                              </DialogPanel>
                            </TransitionChild>
                          </div>
                        </Dialog>
                      </TransitionRoot>

                      <TransitionRoot :show="showContextModal" as="template">
                        <Dialog as="div" @close="showContextModal = false" class="relative z-[70]">
                          <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0"
                            enter-to="opacity-100" leave="duration-200 ease-in" leave-from="opacity-100"
                            leave-to="opacity-0">
                            <div class="fixed inset-0 bg-black/60" />
                          </TransitionChild>
                          <div class="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
                            <TransitionChild as="div" enter="duration-300 ease-out" enter-from="opacity-0 scale-95"
                              enter-to="opacity-100 scale-100" leave="duration-200 ease-in"
                              leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95">
                              <DialogPanel
                                class="w-full max-w-2xl transform overflow-hidden rounded-3xl bg-[var(--color-surface-container-high)] p-6 text-left align-middle shadow-xl transition-all">
                                <DialogTitle as="h3" class="text-2xl font-bold text-[var(--color-on-background)]">{{
                                  $t('admin.ai_context_source_title') }}
                                </DialogTitle>
                                <div class="mt-4">
                                  <pre
                                    class="whitespace-pre-wrap text-sm text-[var(--color-on-surface-variant)] bg-[var(--color-surface-container)] p-3 rounded-xl max-h-96 overflow-auto">
                        {{ aiContext }}</pre>
                                </div>
                                <div class="mt-6 flex justify-end">
                                  <button @click="showContextModal = false"
                                    class="px-4 py-2 text-sm font-semibold rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-fixed-dim)] text-[var(--color-on-primary)] transition-colors">{{
                                    $t('close') }}</button>
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
          </DialogPanel>
        </TransitionChild>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
