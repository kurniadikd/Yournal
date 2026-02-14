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
  (e: 'definitions-saved', payload: any): void;
}>();

// Stores
const languageStore = useLanguageStore();

// State Komponen
const isSaving = ref(false);
const isAiCompleting = ref(false);
const isCheckingAccuracy = ref(false);
const accuracyScore = ref<number | null>(null);
const accuracyError = ref<string | null>(null);
const aiReport = ref<string | null>(null);
const showAiCommentModal = ref(false);
const aiPrompt = ref('');
const aiContext = ref('');
const showPromptModal = ref(false);
const showContextModal = ref(false);
const error = ref<string | null>(null);
const localDefinitions = ref<any[]>([]);
const initialDefinitions = ref<any[]>([]);
const isConfirmCloseDialogOpen = ref(false);
const textareaRefs = ref<Record<string, HTMLElement | null>>({});
const selectedTabIndex = ref(0);

// State untuk Modal JSON
const showJsonModal = ref(false);
const jsonInput = ref('');
const jsonError = ref<string | null>(null);

const appSettings = ref<any>(null); // TODO: Type AppSettings

const getScoreColor = (score: number | null | undefined) => {
  if (score === null || score === undefined)
    return 'text-[var(--color-on-surface-variant)]';
  if (score >= 90) return 'text-green-500';
  if (score >= 70) return 'text-yellow-500';
  return 'text-red-500';
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

// Definisi bisa dalam bahasa APAPUN, termasuk bahasa sumber
const targetLanguages = computed(() => {
  return languageStore.opsiBahasa;
});

const isFormDirty = computed(() => {
  return checkFormDirty(initialDefinitions.value, localDefinitions.value);
});

const areAllDefinitionsComplete = computed(() => {
  if (!targetLanguages.value.length) return false;

  return targetLanguages.value.every((lang: any) => {
    return localDefinitions.value.some(
      (def) =>
        def.language_code === lang.kodeBahasa &&
        def.text &&
        def.text.trim() !== '',
    );
  });
});

const getDirtyCountForLang = (langCode: string) => {
  const localDefsForLang = localDefinitions.value.filter(
    (d) => d.language_code === langCode,
  );

  let dirtyCount = 0;
  for (const localDef of localDefsForLang) {
    const initialDef = initialDefinitions.value.find(
      (d) => d._id === localDef._id,
    );
    if (!isEqual(localDef, initialDef)) {
      dirtyCount++;
    }
  }
  return dirtyCount;
};

// Watchers
watch(isOpen, (isOpening) => {
  if (isOpening) {
    initializeData();
  }
});

watch(showJsonModal, (isShowing) => {
  if (isShowing) {
    const dataToDisplay = localDefinitions.value.map(
      ({ _id, ...rest }) => rest,
    );
    jsonInput.value = JSON.stringify(dataToDisplay, null, 2);
    jsonError.value = null;
    // jsonCopied is a readonly ref from useClipboard, no need to manually reset here usually, 
    // or if we must, we should ensure it's assignable. 
    // However, VueUse's 'copied' is internally managed.
  }
});

watch(selectedTabIndex, () => {
  nextTick(() => {
    const activeLangCode =
      targetLanguages.value[selectedTabIndex.value]?.kodeBahasa;
    if (activeLangCode) {
      const activeDefinitions = localDefinitions.value.filter(
        (d) => d.language_code === activeLangCode,
      );
      activeDefinitions.forEach((def) => {
        const textEl = textareaRefs.value[`text-${def._id}`];
        const sourceEl = textareaRefs.value[`source-${def._id}`];

        if (textEl) resizeTextarea(textEl);
        if (sourceEl) resizeTextarea(sourceEl);
      });
    }
  });
});

watch(
  localDefinitions,
  () => {
    accuracyScore.value = null;
    accuracyError.value = null;
    aiReport.value = null;
  },
  { deep: true },
);

// --- FUNGSI-FUNGSI LOGIKA (Sekarang ada di DALAM <script setup>) ---

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

const initializeData = async () => {
  try {
    await languageStore.init();
    await fetchAppSettings();

    // [PERBAIKAN] Mapping data menggunakan snake_case dari backend
    const initialData = (props.word.definitions || []).map((d: any) => ({
      id: d.id,
      _id: generateUUID(),
      language_code: d.language_code,
      text: d.definition_text || '', // Backend: definition_text
      source_example_text: d.source_example_text || '', // Backend: source_example_text
      target_example_text: d.target_example_text || '', // Backend: target_example_text
      position: d.position || 0,
      source: d.source || '',
      domain: d.domain || '', // [NEW] Domain logic
    }));

    localDefinitions.value = cloneDeep(initialData);
    initialDefinitions.value = cloneDeep(initialData);

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

    // Trigger resize textarea setelah data masuk
    nextTick(() => {
      Object.values(textareaRefs.value)
        .flat()
        .forEach((el: any) => {
          resizeTextarea(el);
        });
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
  localDefinitions.value = [];
  initialDefinitions.value = [];
  isConfirmCloseDialogOpen.value = false;
  showJsonModal.value = false;
  jsonInput.value = '';
  jsonError.value = null;
  textareaRefs.value = {};
  aiReport.value = null;
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

  const definitionSet = new Set();
  for (const def of localDefinitions.value) {
    const text = def.text || '';
    const key = `${def.language_code}|${text.trim().toLowerCase()}`;
    if (text.trim() && definitionSet.has(key)) {
      const langName =
        targetLanguages.value.find((l) => l.kodeBahasa === def.language_code)
          ?.nama || def.language_code;
      error.value = t('admin.error_duplicate_definition', { lang: langName, text: text.substring(0, 20) });
      isSaving.value = false;
      return;
    }
    if (text.trim()) {
      definitionSet.add(key);
    }
  }

  const cleanedDefinitions = localDefinitions.value
    .filter((def) => (def.text || '').trim() !== '') // [PERBAIKAN] Filter definisi kosong
    .map(({ _id, ...rest }) => ({
      language_code: rest.language_code,
      definition_text: (rest.text || '').trim(), // Kirim balik sebagai definition_text
      source_example_text: rest.source_example_text?.trim() || null,
      target_example_text: rest.target_example_text?.trim() || null,
      id: rest.id || null,
      position: rest.position || 0,
      domain: rest.domain?.trim() || null, // [NEW] Domain logic
    }));

  try {
    const response = await api.patch(`/admin/words/${props.word.id}/`, {
      definitions: cleanedDefinitions,
    });

    emit('definitions-saved', response.data);
    forceCloseModal();
  } catch (err) {
    console.error(
      'Gagal menyimpan definisi:',
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

const handleAiDefine = async () => {
  isAiCompleting.value = true;
  error.value = null;
  try {
    if (!props.word.id) throw new Error('Word ID is required.');
    const response = await api.patch(`/admin/words/${props.word.id}/`, {
      action: 'ai_define',
    });
    const aiGeneratedDefinitions = response.data;

    if (!aiGeneratedDefinitions || aiGeneratedDefinitions.length === 0) {
      error.value =
        'AI tidak dapat menghasilkan definisi baru atau memperbarui yang sudah ada.';
      localDefinitions.value = [];
    } else {
      localDefinitions.value = aiGeneratedDefinitions.map((aiDef) => ({
        _id: generateUUID(),
        language_code: aiDef.language_code,
        text: aiDef.definition_text,
        source_example_text: aiDef.source_example_text || '',
        target_example_text: aiDef.target_example_text || '',
        source: aiDef.source || 'ai_generated',
        domain: aiDef.domain || '', // [FIX] Map domain from API response
      }));
    }

    nextTick(() => {
      Object.values(textareaRefs.value)
        .flat()
        .forEach((el) => {
          resizeTextarea(el);
        });
    });
  } catch (err) {
    console.error(
      'Gagal melengkapi definisi dengan AI:',
      err.response?.data || err.message,
    );
    error.value =
      err.response?.data?.error ||
      err.response?.data?.detail ||
      'Gagal mengambil pratinjau definisi AI.';
  } finally {
    isAiCompleting.value = false;
  }
};

const checkAiAccuracy = async () => {
  isCheckingAccuracy.value = true;
  accuracyScore.value = null;
  accuracyError.value = null;
  aiReport.value = null;
  aiPrompt.value = '';
  aiContext.value = '';
  try {
    const sourceLangCode = props.word.language_code;
    if (!sourceLangCode) {
      accuracyError.value = 'Bahasa asal kata tidak ditemukan.';
      isCheckingAccuracy.value = false;
      return;
    }

    const definitionsToCheck = localDefinitions.value.filter(
      (d) => d.language_code === sourceLangCode,
    );

    if (definitionsToCheck.length === 0) {
      accuracyError.value = `Tidak ada definisi untuk diperiksa di bahasa asal (${sourceLangCode}).`;
      isCheckingAccuracy.value = false;
      return;
    }

    const response = await api.patch(`/admin/words/${props.word.id}/`, {
      action: 'check_definition_accuracy',
      definitions_to_check: definitionsToCheck.map((d) => ({
        language_code: d.language_code,
        definition_text: d.text,
        source_example_text: d.source_example_text,
        target_example_text: d.target_example_text,
      })),
      source_word: props.word.base,
      source_language: props.word.language_code,
      target_language: sourceLangCode,
    });

    accuracyScore.value = response.data.accuracy_score;
    aiReport.value = response.data.ai_comment;
    aiPrompt.value = response.data.ai_prompt;
    aiContext.value = response.data.ai_context;
  } catch (err) {
    console.error(
      'Gagal memeriksa akurasi AI:',
      err.response?.data || err.message,
    );
    accuracyError.value =
      err.response?.data?.detail || 'Gagal memeriksa akurasi AI.';
    aiReport.value = null;
    aiPrompt.value = '';
    aiContext.value = '';
  } finally {
    isCheckingAccuracy.value = false;
  }
};

const handleAccuracyButtonClick = async () => {
  if (accuracyScore.value !== null) {
    showAiCommentModal.value = true;
    return;
  }
  if (isCheckingAccuracy.value) {
    return;
  }
  await checkAiAccuracy();

  if (accuracyScore.value !== null) {
    showAiCommentModal.value = true;
  }
};

const processJsonInput = () => {
  jsonError.value = null;
  try {
    const data = JSON.parse(jsonInput.value);
    if (!Array.isArray(data)) {
      throw new Error(
        'Format JSON harus berupa sebuah array (daftar) definisi.',
      );
    }

    const isValid = data.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        'language_code' in item &&
        'text' in item,
    );

    if (!isValid) {
      throw new Error(
        "Setiap objek dalam array harus memiliki properti 'language_code' dan 'text'.",
      );
    }

    localDefinitions.value = data.map((item) => ({
      _id: generateUUID(),
      language_code: item.language_code,
      text: item.text,
      source_example_text: item.source_example_text || '',
      target_example_text: item.target_example_text || '',
      source: item.source || '',
    }));

    showJsonModal.value = false;

    nextTick(() => {
      Object.values(textareaRefs.value)
        .flat()
        .forEach((el: any) => {
          resizeTextarea(el);
        });
    });
  } catch (e: any) {
    jsonError.value = `Gagal memproses JSON: ${e.message}`;
  }
};

const { copy, copied: jsonCopied } = useClipboard({ legacy: true });

const copyJsonToClipboard = () => {
  copy(jsonInput.value);
};

const addDefinition = (langCode: string) => {
  if (!langCode) return;
  const newDef = {
    _id: generateUUID(),
    language_code: langCode,
    text: '',
    source_example_text: '',
    target_example_text: '',
    source: '',
  };
  localDefinitions.value.push(newDef);
};

const deleteDefinition = (definitionToDelete: any) => {
  const index = localDefinitions.value.findIndex(
    (d) => d._id === definitionToDelete._id,
  );
  if (index > -1) {
    localDefinitions.value.splice(index, 1);
  }
};

const clearAllDefinitions = () => {
  // Menghapus semua definisi di frontend saja (belum disimpan ke DB)
  localDefinitions.value = [];
};

const handleInput = (event: any, field: string, definition: any) => {
  definition[field] = event.target.value;
  nextTick(() => {
    resizeTextarea(event.target);
  });
};

onMounted(() => {
  if (isOpen.value) {
    initializeData();
  }
});
</script> <template>
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
                {{ $t('admin.edit_definitions') }}: <span class="font-mono text-[var(--color-secondary)]">{{
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
                          ? 'border-[var(--color-secondary)] text-[var(--color-secondary)]'
                          : 'border-transparent text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-background)] hover:border-[var(--color-outline)]'
                      ]">
                        <span>{{ lang.nama }}</span>
                        <span v-if="getDirtyCountForLang(lang.kodeBahasa) > 0"
                          class="flex items-center justify-center text-xs font-bold text-[var(--color-on-secondary)] bg-[var(--color-secondary)] rounded-full w-5 h-5">
                          {{ getDirtyCountForLang(lang.kodeBahasa) }}
                        </span>
                      </button>
                    </Tab>
                  </TabList>
                </div>

                <TabPanels class="flex-grow overflow-y-auto mt-4 pr-3 -mr-3">
                  <TabPanel v-for="lang in targetLanguages" :key="lang.kodeBahasa"
                    :class="['space-y-4', 'focus:outline-none']">
                    <template v-if="localDefinitions.filter(d => d.language_code === lang.kodeBahasa).length > 0">
                      <div v-for="def in localDefinitions.filter(d => d.language_code === lang.kodeBahasa)"
                        :key="def._id" class="p-4 rounded-2xl space-y-2 relative transition-colors" :class="[
                          !isEqual(initialDefinitions.find(d => d._id === def._id), def)
                            ? 'bg-[var(--color-surface-container-highest)] border border-[var(--color-secondary)]'
                            : 'bg-[var(--color-surface-container)] border border-transparent'
                        ]">

                        <div class="relative flex items-start">
                          <input :value="def.domain" @input="handleInput($event, 'domain', def)" placeholder="Tag"
                            class="w-16 pt-1.5 pb-1.5 px-2 mr-2 bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-lg text-sm text-center font-bold text-[var(--color-secondary)] placeholder:font-normal focus:ring-1 focus:ring-[var(--color-secondary)]"
                            title="Domain Code (e.g. Bio, Mil)" />
                          <textarea
                            :ref="(el: any) => { if (el) { textareaRefs[`text-${def._id}`] = el; nextTick(() => resizeTextarea(el)); } }"
                            :value="def.text" @input="handleInput($event, 'text', def)" rows="1"
                            :placeholder="$t('definition') + '...'"
                            class="w-full pt-1 pb-1 pl-2 pr-20 bg-transparent border-0 focus:ring-0 focus:outline-none resize-none overflow-hidden text-lg font-semibold text-[var(--color-on-background)] placeholder-[var(--color-outline)]"></textarea>
                          <div class="flex-shrink-0 flex items-center gap-1 absolute top-1 right-2">
                            <button @click="deleteDefinition(def)"
                              class="flex items-center justify-center w-8 h-8 text-[var(--color-outline)] hover:text-[var(--color-error)] rounded-full hover:bg-[var(--color-error-container)] transition-colors"
                              title="Hapus definisi ini">
                              <span class="material-symbols-outlined text-base">delete</span>
                            </button>
                          </div>
                        </div>

                        <div class="space-y-2">
                          <label class="block text-sm font-medium text-[var(--color-on-surface)]">{{ $t('example')
                          }}</label>
                          <div class="border-l-2 border-[var(--color-outline-variant)] pl-3 space-y-2">
                            <textarea
                              :ref="(el: any) => { if (el) { textareaRefs[`source-example-${def._id}`] = el; nextTick(() => resizeTextarea(el)); } }"
                              :value="def.source_example_text" @input="handleInput($event, 'source_example_text', def)"
                              rows="1" :placeholder="$t('admin.example_source')"
                              class="w-full p-2 border rounded-lg bg-[var(--color-surface-container-high)] border-[var(--color-outline-variant)] text-sm text-[var(--color-on-surface-variant)] italic focus:ring-[var(--color-secondary)] focus:border-[var(--color-secondary)] resize-none overflow-hidden"></textarea>

                            <textarea
                              :ref="(el: any) => { if (el) { textareaRefs[`target-example-${def._id}`] = el; nextTick(() => resizeTextarea(el)); } }"
                              :value="def.target_example_text" @input="handleInput($event, 'target_example_text', def)"
                              rows="1" :placeholder="$t('admin.example_target')"
                              class="w-full p-2 border rounded-lg bg-[var(--color-surface-container-high)] border-[var(--color-outline-variant)] text-sm text-[var(--color-on-surface-variant)] italic focus:ring-[var(--color-secondary)] focus:border-[var(--color-secondary)] resize-none overflow-hidden"></textarea>
                          </div>
                        </div>
                      </div>
                    </template>

                    <div v-else class="text-center py-12 text-[var(--color-on-surface-variant)] italic">
                      {{ $t('admin.no_definitions') }}
                    </div>

                    <div class="mt-4 flex justify-center">
                      <button @click="addDefinition(lang.kodeBahasa)"
                        class="flex items-center gap-2 px-4 py-2 h-10 text-sm font-semibold text-[var(--color-on-secondary)] bg-[var(--color-secondary)] hover:bg-[var(--color-secondary-container)] rounded-full transition-colors">
                        <span class="material-symbols-outlined text-base">add</span>
                        <span>{{ $t('admin.add_definition') }}</span>
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
                <p class="mt-2">Tidak ada bahasa yang tersedia untuk definisi.</p>
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
                    :title="`Scraper Eksternal: ${appSettings.is_scraper_enabled ? 'Aktif' : 'Nonaktif'}`">
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
                          <span class="text-sm font-medium text-[var(--color-on-background)]">Aktifkan
                            Scraper/Fetch</span>
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
                          Kontrol untuk mengambil data dari sumber eksternal (misal: Wiktionary).
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
                <button type="button" @click="clearAllDefinitions" title="Bersihkan Semua Data (Belum Disimpan)"
                  class="flex items-center justify-center h-10 w-10 text-sm font-semibold text-[var(--color-on-error-container)] bg-[var(--color-error-container)] hover:bg-[var(--color-error)] hover:text-[var(--color-on-error)] rounded-xl transition-colors">
                  <span class="material-symbols-outlined text-base">delete_sweep</span>
                </button>
                <button type="button" @click="handleAiDefine" :disabled="isAiCompleting"
                  :title="areAllDefinitionsComplete ? 'Ulangi Definisi AI di Semua Bahasa' : 'Lengkapi Definisi yang Kosong dengan AI'"
                  class="flex items-center justify-center h-10 w-10 text-sm font-semibold text-[var(--color-on-secondary)] bg-[var(--color-secondary)] hover:bg-[var(--color-secondary-container)] rounded-xl transition-colors disabled:opacity-50">
                  <span class="material-symbols-outlined text-base" :class="{ 'animate-spin': isAiCompleting }">{{
                    isAiCompleting ?
                      'sync' : 'magic_button' }}</span>
                </button>

                <button v-if="areAllDefinitionsComplete" type="button" @click="handleAccuracyButtonClick"
                  :disabled="isCheckingAccuracy || !props.word?.id"
                  :title="accuracyScore !== null ? `Lihat Skor Akurasi: ${Math.round(accuracyScore)}%` : 'Cek Akurasi AI'"
                  class="flex items-center justify-center h-10 w-auto min-w-10 px-3 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
                  :class="[accuracyScore !== null ? 'bg-[var(--color-tertiary-container)] text-[var(--color-on-tertiary-container)] hover:bg-[var(--color-tertiary-container-hover)]' : 'bg-[var(--color-tertiary)] text-[var(--color-on-tertiary)] hover:bg-[var(--color-tertiary-fixed-dim)]']">
                  <span v-if="isCheckingAccuracy" class="material-symbols-outlined text-base animate-spin">sync</span>
                  <span v-else-if="accuracyScore !== null" class="flex items-center gap-1">
                    {{ Math.round(accuracyScore) }}%
                  </span>
                  <span v-else class="material-symbols-outlined text-base">fact_check</span>
                </button>
                <span v-if="accuracyError" class="text-sm text-[var(--color-error)]">
                  {{ accuracyError }}
                </span>
                <button type="button" @click="showJsonModal = true" title="Impor/Ekspor dari JSON"
                  class="flex items-center justify-center h-10 w-10 text-sm font-semibold text-[var(--color-on-secondary)] bg-[var(--color-secondary)] hover:bg-[var(--color-secondary-container)] rounded-xl transition-colors">
                  <span class="material-symbols-outlined text-base">file_json</span>
                </button>
                <button type="button" @click="handleSave" :disabled="isSaving || !isFormDirty"
                  class="px-4 py-2 h-10 text-sm font-semibold text-[var(--color-on-secondary)] bg-[var(--color-secondary)] hover:bg-[var(--color-secondary-container)] rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  <span v-if="isSaving">{{ $t('saving') }}...</span>
                  <span v-else>{{ $t('save') }}</span>
                </button>
              </div>
            </div>
            <!-- Modal Konfirmasi Tutup -->
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
                      class="w-full max-w-md rounded-2xl bg-[var(--color-surface-container-high)] p-6 shadow-2xl">
                      <DialogTitle class="text-xl font-bold text-[var(--color-on-background)] mb-2">
                        {{ $t('admin.unsaved_changes') }}
                      </DialogTitle>
                      <p class="text-[var(--color-on-surface-variant)]">
                        {{ $t('admin.unsaved_changes_desc') }}
                      </p>
                      <div class="mt-6 flex justify-end gap-3">
                        <button type="button" @click="isConfirmCloseDialogOpen = false"
                          class="px-4 py-2 h-10 text-sm font-semibold text-[var(--color-on-surface)] bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container-high)] rounded-xl transition-colors border border-[var(--color-outline-variant)]">
                          {{ $t('admin.continue_edit') }}
                        </button>
                        <button type="button" @click="forceCloseModal"
                          class="px-4 py-2 h-10 text-sm font-semibold text-[var(--color-on-error)] bg-[var(--color-error)] hover:bg-[var(--color-error-container)] rounded-xl transition-colors">
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
              <Dialog @close="showJsonModal = false" class="relative z-[60]">
                <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0"
                  enter-to="opacity-100" leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
                  <div class="fixed inset-0 bg-black/60" />
                </TransitionChild>
                <div class="fixed inset-0 flex items-center justify-center p-4">
                  <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95"
                    enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100"
                    leave-to="opacity-0 scale-95">
                    <DialogPanel
                      class="w-full max-w-4xl rounded-2xl bg-[var(--color-surface-container-high)] p-6 shadow-2xl flex flex-col max-h-[85vh]">
                      <DialogTitle class="text-xl font-bold text-[var(--color-on-background)] mb-4">
                        {{ $t('admin.import_export_json') }}
                      </DialogTitle>

                      <div class="flex-grow overflow-hidden flex flex-col min-h-[400px]">
                        <textarea v-model="jsonInput"
                          class="w-full flex-grow p-4 font-mono text-sm rounded-xl border bg-[var(--color-surface-container)] border-[var(--color-outline-variant)] text-[var(--color-on-background)] focus:ring-[var(--color-secondary)] focus:border-[var(--color-secondary)] resize-none min-h-[350px]"
                          placeholder='[{"language_code": "id", "text": "definisi...", "source_example_text": "", "target_example_text": ""}]'></textarea>
                      </div>

                      <div v-if="jsonError"
                        class="mt-3 p-3 rounded-xl bg-[var(--color-error-container)] text-[var(--color-on-error-container)] text-sm">
                        {{ jsonError }}
                      </div>

                      <div class="mt-4 flex justify-between items-center gap-3">
                        <button type="button" @click="copyJsonToClipboard"
                          class="flex items-center gap-2 px-4 py-2 h-10 text-sm font-semibold text-[var(--color-on-surface)] bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container-high)] rounded-xl transition-colors border border-[var(--color-outline-variant)]">
                          <span class="material-symbols-outlined text-base">{{ jsonCopied ? 'check' : 'content_copy'
                            }}</span>
                          <span>{{ jsonCopied ? $t('copied') : $t('copy') }}</span>
                        </button>
                        <div class="flex gap-2">
                          <button type="button" @click="showJsonModal = false"
                            class="px-4 py-2 h-10 text-sm font-semibold text-[var(--color-on-surface)] bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container-high)] rounded-xl transition-colors border border-[var(--color-outline-variant)]">
                            {{ $t('cancel') }}
                          </button>
                          <button type="button" @click="processJsonInput"
                            class="px-4 py-2 h-10 text-sm font-semibold text-[var(--color-on-secondary)] bg-[var(--color-secondary)] hover:bg-[var(--color-secondary-container)] rounded-xl transition-colors">
                            {{ $t('apply') }}
                          </button>
                        </div>
                      </div>
                    </DialogPanel>
                  </TransitionChild>
                </div>
              </Dialog>
            </TransitionRoot>

            <!-- Modal AI Comment -->
            <TransitionRoot :show="showAiCommentModal" as="template">
              <Dialog @close="showAiCommentModal = false" class="relative z-[60]">
                <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0"
                  enter-to="opacity-100" leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
                  <div class="fixed inset-0 bg-black/60" />
                </TransitionChild>
                <div class="fixed inset-0 flex items-center justify-center p-4">
                  <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95"
                    enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100"
                    leave-to="opacity-0 scale-95">
                    <DialogPanel
                      class="w-full max-w-xl rounded-2xl bg-[var(--color-surface-container-high)] p-6 shadow-2xl max-h-[80vh] flex flex-col">
                      <div class="flex items-center justify-between mb-4">
                        <DialogTitle class="text-xl font-bold text-[var(--color-on-background)]">
                          Laporan Akurasi AI
                        </DialogTitle>
                        <span :class="['text-2xl font-bold', getScoreColor(accuracyScore)]">
                          {{ accuracyScore !== null ? `${Math.round(accuracyScore)}%` : '-' }}
                        </span>
                      </div>

                      <div class="flex-grow overflow-y-auto space-y-4">
                        <div v-if="aiReport"
                          class="p-4 rounded-xl bg-[var(--color-surface-container)] text-[var(--color-on-surface)]">
                          <h4 class="font-semibold mb-2">Komentar AI:</h4>
                          <p class="whitespace-pre-wrap text-sm">{{ aiReport }}</p>
                        </div>

                        <div v-if="aiPrompt" class="space-y-2">
                          <button @click="showPromptModal = true"
                            class="w-full text-left p-3 rounded-xl bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] text-sm transition-colors">
                            <span class="font-semibold">📝 Lihat Prompt AI</span>
                          </button>
                        </div>

                        <div v-if="aiContext" class="space-y-2">
                          <button @click="showContextModal = true"
                            class="w-full text-left p-3 rounded-xl bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] text-sm transition-colors">
                            <span class="font-semibold">📖 Lihat Konteks AI</span>
                          </button>
                        </div>
                      </div>

                      <div class="mt-4 flex justify-end">
                        <button type="button" @click="showAiCommentModal = false"
                          class="px-4 py-2 h-10 text-sm font-semibold text-[var(--color-on-secondary)] bg-[var(--color-secondary)] hover:bg-[var(--color-secondary-container)] rounded-xl transition-colors">
                          Tutup
                        </button>
                      </div>

                      <!-- Modal Prompt AI (Nested) -->
                      <TransitionRoot :show="showPromptModal" as="template">
                        <Dialog @close="showPromptModal = false" class="relative z-[70]">
                          <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0"
                            enter-to="opacity-100" leave="duration-200 ease-in" leave-from="opacity-100"
                            leave-to="opacity-0">
                            <div class="fixed inset-0 bg-black/60" />
                          </TransitionChild>
                          <div class="fixed inset-0 flex items-center justify-center p-4">
                            <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95"
                              enter-to="opacity-100 scale-100" leave="duration-200 ease-in"
                              leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95">
                              <DialogPanel
                                class="w-full max-w-2xl rounded-2xl bg-[var(--color-surface-container-high)] p-6 shadow-2xl max-h-[80vh] flex flex-col">
                                <DialogTitle class="text-xl font-bold text-[var(--color-on-background)] mb-4">
                                  Prompt AI
                                </DialogTitle>
                                <div
                                  class="flex-grow overflow-y-auto p-4 rounded-xl bg-[var(--color-surface-container)]">
                                  <pre class="text-sm text-[var(--color-on-surface)] whitespace-pre-wrap font-mono">{{ aiPrompt }}
                      </pre>
                                </div>
                                <div class="mt-4 flex justify-end">
                                  <button type="button" @click="showPromptModal = false"
                                    class="px-4 py-2 h-10 text-sm font-semibold text-[var(--color-on-secondary)] bg-[var(--color-secondary)] hover:bg-[var(--color-secondary-container)] rounded-xl transition-colors">
                                    Tutup
                                  </button>
                                </div>
                              </DialogPanel>
                            </TransitionChild>
                          </div>
                        </Dialog>
                      </TransitionRoot>

                      <!-- Modal Konteks AI (Nested) -->
                      <TransitionRoot :show="showContextModal" as="template">
                        <Dialog @close="showContextModal = false" class="relative z-[70]">
                          <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0"
                            enter-to="opacity-100" leave="duration-200 ease-in" leave-from="opacity-100"
                            leave-to="opacity-0">
                            <div class="fixed inset-0 bg-black/60" />
                          </TransitionChild>
                          <div class="fixed inset-0 flex items-center justify-center p-4">
                            <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95"
                              enter-to="opacity-100 scale-100" leave="duration-200 ease-in"
                              leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95">
                              <DialogPanel
                                class="w-full max-w-2xl rounded-2xl bg-[var(--color-surface-container-high)] p-6 shadow-2xl max-h-[80vh] flex flex-col">
                                <DialogTitle class="text-xl font-bold text-[var(--color-on-background)] mb-4">
                                  Konteks AI
                                </DialogTitle>
                                <div
                                  class="flex-grow overflow-y-auto p-4 rounded-xl bg-[var(--color-surface-container)]">
                                  <pre class="text-sm text-[var(--color-on-surface)] whitespace-pre-wrap font-mono">{{ aiContext }}
                      </pre>
                                </div>
                                <div class="mt-4 flex justify-end">
                                  <button type="button" @click="showContextModal = false"
                                    class="px-4 py-2 h-10 text-sm font-semibold text-[var(--color-on-secondary)] bg-[var(--color-secondary)] hover:bg-[var(--color-secondary-container)] rounded-xl transition-colors">
                                    Tutup
                                  </button>
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


  <!-- Modal Konfirmasi Tutup (NEW) -->
  <TransitionRoot :show="isConfirmCloseDialogOpen" as="template">
    <Dialog @close="isConfirmCloseDialogOpen = false" class="relative z-[70]">
      <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100"
        leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-black/60" />
      </TransitionChild>
      <div class="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
        <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95"
          enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100"
          leave-to="opacity-0 scale-95">
          <DialogPanel
            class="w-full max-w-sm transform overflow-hidden rounded-3xl bg-[var(--color-surface-container-high)] p-6 text-center align-middle shadow-xl transition-all">
          </DialogPanel>
        </TransitionChild>
      </div>
    </Dialog>
  </TransitionRoot>

  <!-- Modal Konfirmasi Tutup (NEW) -->
  <TransitionRoot :show="isConfirmCloseDialogOpen" as="template">
    <Dialog @close="isConfirmCloseDialogOpen = false" class="relative z-[70]">
      <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100"
        leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
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
              <span class="material-symbols-outlined text-4xl text-[var(--color-on-error-container)]">warning</span>
            </div>
            <DialogTitle as="h3" class="mt-4 text-2xl font-bold text-[var(--color-on-background)]">{{
              $t('admin.unsaved_changes') }}</DialogTitle>
            <p class="mt-2 text-sm text-[var(--color-on-surface-variant)]">{{ $t('admin.unsaved_changes_desc') }}</p>
            <div class="mt-6 grid grid-cols-2 gap-3">
              <button type="button" @click="isConfirmCloseDialogOpen = false"
                class="w-full rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] px-4 py-2 font-semibold text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-surface-container-low)]">{{
                  $t('admin.continue_edit') }}</button>
              <button @click="forceCloseModal"
                class="w-full rounded-xl bg-[var(--color-error)] px-4 py-2 font-semibold text-[var(--color-on-error)] transition-colors hover:bg-[var(--color-error-container)]">{{
                  $t('admin.close_without_save') }}</button>
            </div>
          </DialogPanel>
        </TransitionChild>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
