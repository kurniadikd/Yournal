<script setup lang="ts">
import {
  computed,
  ref,
  reactive,
  watch,
  defineAsyncComponent,
  nextTick,
  type PropType
} from 'vue';
import { useI18n } from 'vue-i18n';
import { useLanguageStore } from '@/stores/language';
import { useSearchStore } from '@/stores/search';
import { useUIStore } from '@/stores/ui';
import { useAuthStore } from '@/stores/auth';
import { useSpeechSynthesis, useClipboard, useObjectUrl } from '@vueuse/core';
import { useWordStore } from '@/stores/word';
import { getHighlightedText } from '@/utils/HighlightText';
import { api } from '@/utils/api';

import EditTerjemahanKata from './EditTerjemahanKata.vue';
import HeaderDetail from './DetailKata/HeaderDetail.vue';
import Translations from './DetailKata/Translations.vue';
import Definition from './DetailKata/Definition.vue';
import RelatedWords from './DetailKata/RelatedWords.vue';
import SimpanKeDaftar from '@/components/SimpanKeDaftar.vue';
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/vue'; // [NEW]

//================================================================
// DYNAMIC COMPONENT MODULES (VITE)
//================================================================
const grammarModules = import.meta.glob(
  '/src/components/Aplikasi/Konteks/DetailKata/lang/**/*.vue',
) as Record<string, () => Promise<any>>;

//================================================================
// PROPS & EMITS
//================================================================
const props = defineProps({
  wordId: {
    type: [Number, String] as PropType<number | string>,
    required: true,
  },
  compact: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['search-word', 'toggle-expand']);

// INISIALISASI STORE
const languageStore = useLanguageStore();
const uiStore = useUIStore();
const authStore = useAuthStore();
const searchStore = useSearchStore();
const wordStore = useWordStore();
const { t } = useI18n();

// DATA & STATE
const localWord = ref<any>(null); // TODO: Define Word interface
const isSpeaking = reactive<Record<string | number, boolean>>({});
const showEditTranslationsModal = ref(false);

const showSimpanModal = ref(false); // [NEW]
const loadingDetails = ref(false);

// [FIX] Track which words are currently being fetched to prevent duplicate calls
const fetchInProgress = reactive<Record<string | number, boolean>>({});

// COMPUTED PROPERTIES
const displayedWord = computed(() => {
  return wordStore.words.find((w: any) => w.id === props.wordId);
});

// [PREFETCH LOGIC] - Now with duplicate prevention
async function fetchDetailsIfNeeded() {
  const wordId = props.wordId;

  // Skip if already fetching this word, or if word doesn't exist, or already detailed
  if (
    fetchInProgress[wordId] ||
    !displayedWord.value ||
    displayedWord.value.is_detailed
  ) {
    return;
  }

  // Mark as in-progress to prevent duplicate calls
  fetchInProgress[wordId] = true;
  loadingDetails.value = true;

  try {
    await wordStore.fetchWordDetails(Number(wordId));

    // [FIX] Force re-read from store after fetch completes
    // The store has been updated, so we need to get the fresh data
    const updatedWord = wordStore.words.find((w: any) => w.id === wordId);
    if (updatedWord) {
      localWord.value = JSON.parse(JSON.stringify(updatedWord));
    }

    // [FIX] Wait for Vue to process the reactivity update before hiding loader
    await nextTick();
  } finally {
    loadingDetails.value = false;
    fetchInProgress[wordId] = false;
  }
}

// Single watcher for displayedWord - handles all cases
watch(
  displayedWord,
  (newWord) => {
    if (newWord) {
      localWord.value = JSON.parse(JSON.stringify(newWord));
      // Only fetch if not already detailed
      if (!newWord.is_detailed) {
        fetchDetailsIfNeeded();
      }
    } else {
      localWord.value = null;
    }
  },
  { immediate: true, deep: true },
);

const isAdminUser = computed(() => authStore.isAdmin);

const posLabelClass = computed(() => {
  const pos = displayedWord.value?.pos;
  if (!pos) return '';
  return 'bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]';
});

// Helper untuk membersihkan object dari properti null/undefined
const distilledWord = computed(() => {
  const word = localWord.value;
  if (!word) return null;

  return {
    ...word,
    grammar_attributes: word.grammar_attributes || [],
    translations: word.translations || [],
    forms: word.forms || [],
    related_words: word.related_words || [],
    tags: word.tags || [],
    definitions: word.definitions || [],
    is_detailed: word.is_detailed || false,
  };
});

// Computed property untuk data item yang akan disimpan (dengan lang_pair)
const itemDataForSaving = computed(() => {
  if (!localWord.value) return null;
  const sourceLang = languageStore.selectedAsal?.kodeBahasa || '';
  const targetLang = languageStore.selectedTarget?.kodeBahasa || '';
  const langPair =
    sourceLang && targetLang ? `${sourceLang}-${targetLang}` : '';
  return {
    ...localWord.value,
    lang_pair: langPair,
  };
});

const displayTranslations = computed(() => {
  const sourceLangCode = languageStore.selectedAsal?.kodeBahasa;
  if (!sourceLangCode) return [];

  const wordForTranslations = props.compact
    ? displayedWord.value
    : distilledWord.value;
  if (!wordForTranslations?.translations) return [];

  // Filter terjemahan sesuai bahasa asal user
  const translations = wordForTranslations.translations
    .filter((trans: any) => trans.language_code === sourceLangCode)
    .map((t: any) => ({ ...t, tl: t.target_word || t.tl }));

  return translations.sort((a: any, b: any) => {
    const aIsMatch = isTranslationMatch(a);
    const bIsMatch = isTranslationMatch(b);
    if (aIsMatch && !bIsMatch) return -1;
    if (!aIsMatch && bIsMatch) return 1;
    return 0;
  });
});

const formattedBaseWord = computed(() => {
  if (!displayedWord.value?.accented) return '';
  return displayedWord.value.accented.replace(/'/g, '́');
});

const matchingForms = computed(() => {
  if (!displayedWord.value?.forms) return [];
  const searchTermBare = searchStore.currentSearchQuery.replace(/́/g, '');

  return displayedWord.value.forms
    .filter((form: any) => {
      if (!form || !form.form_bare) return false;
      const isMatch =
        form.form_bare.toLowerCase() === searchTermBare.toLowerCase();
      if (!isMatch) return false;
      const isSameAsBase =
        form.form_bare.toLowerCase() === displayedWord.value.base.toLowerCase();
      return !isSameAsBase;
    })
    .map((form: any) => ({
      form: (form.form || '').replace(/'/g, '́'),
      type: form.form_type
        ? form.form_type.replace(/ru_noun_|_/g, ' ').trim()
        : '',
    }));
});

const getGrammarAttr = (name: string) => {
  if (!distilledWord.value?.grammar_attributes) return null;
  const attr = distilledWord.value.grammar_attributes.find(
    (a: any) => a.feature_value.feature_name.toLowerCase() === name.toLowerCase(),
  );
  return attr?.feature_value?.value || null;
};

const groupedRelatedWords = computed(() => {
  if (!distilledWord.value) return null;
  const words = distilledWord.value.related_words || [];
  const partner = getGrammarAttr('Partner Word');
  const aspect = getGrammarAttr('Aspect');
  const sourceLangCode = languageStore.selectedAsal?.kodeBahasa;

  const groups = words.reduce((acc: any, item: any) => {
    const relationType = item.relation || 'related';
    if (!acc[relationType]) {
      acc[relationType] = [];
    }

    if (item.rel_word && item.rel_word.translations) {
      const translation = item.rel_word.translations.find(
        (t: any) => t.language_code === sourceLangCode,
      );
      acc[relationType].push({
        ...item,
        display_translation: translation?.target_word || '',
      });
    } else {
      acc[relationType].push({ ...item, display_translation: '' });
    }
    return acc;
  }, {});

  if (partner) {
    if (!groups.partner) {
      groups.partner = [];
    }
    groups.partner.push({
      relation: 'partner',
      rel_word: {
        id: `partner_${distilledWord.value.id}`,
        base: partner,
        accented: partner,
      },
      display_translation:
        aspect === 'Imperfective'
          ? t('partner_perfective')
          : t('partner_imperfective'),
    });
  }

  return Object.keys(groups).length > 0 ? groups : null;
});

//================================================================
// DYNAMIC GRAMMAR COMPONENT
//================================================================
const grammarComponent = computed(() => {
  if (!distilledWord.value) return null;
  const { language_code, pos } = distilledWord.value;

  if (!language_code || !pos) return null;

  const normalizedPos = pos.toLowerCase();

  let componentName;
  switch (normalizedPos) {
    case 'verb':
      componentName = 'VerbConjugation';
      break;
    case 'noun':
      componentName = 'NounDeclension';
      break;
    case 'adjective':
      componentName = 'AdjectiveDeclension';
      break;
    default:
      return null;
  }

  const langPascal =
    language_code.charAt(0).toUpperCase() + language_code.slice(1);
  const fullComponentName = `${componentName}${langPascal}`;

  const path = `/src/components/Aplikasi/Konteks/DetailKata/lang/${language_code}/${fullComponentName}.vue`;

  return grammarModules[path]
    ? defineAsyncComponent(grammarModules[path])
    : { render: () => null };
});

//================================================================
// METHODS
//================================================================
const handleWordClick = (word: string) => {
  emit('search-word', word);
};

const handleBaseWordClick = (word: string) => {
  const bareWord = word.replace(/́/g, '');
  emit('search-word', bareWord);
};

// --- TTS LOGIC (VueUse) ---
const speechText = ref('');
const speechLang = ref('en-US');
const currentSpeakingWordId = ref<string | number | null>(null);
const ttsBlobRef = ref<Blob | null>(null);
const ttsUrl = useObjectUrl(ttsBlobRef);
let activeAudio: HTMLAudioElement | null = null;

const { speak, isPlaying } = useSpeechSynthesis(speechText, {
  lang: speechLang,
  pitch: 1,
  rate: 0.9,
});

// Sync useSpeechSynthesis state to our local isSpeaking map for UI reactivity
watch(isPlaying, (playing) => {
  if (currentSpeakingWordId.value) {
    isSpeaking[currentSpeakingWordId.value] = playing;
  }
});

const speakWord = async () => {
  const wordToSpeak = props.compact ? displayedWord.value : distilledWord.value;
  if (!wordToSpeak) return;

  // Prevent double speak (check both synthesis and custom audio)
  if (isPlaying.value || (activeAudio && !activeAudio.paused)) {
    window.speechSynthesis.cancel();
    if (activeAudio) {
      activeAudio.pause();
      activeAudio = null;
    }
    return;
  }

  currentSpeakingWordId.value = wordToSpeak.id;
  // Reset any stuck state
  Object.keys(isSpeaking).forEach((k) => (isSpeaking[k] = false));
  isSpeaking[wordToSpeak.id] = true;

  const text = wordToSpeak.accented || wordToSpeak.base || '';
  if (!text) {
    isSpeaking[wordToSpeak.id] = false;
    return;
  }

  const langCode = wordToSpeak.language_code || 'en';

  // 1. Try Gemini TTS
  try {
    const voiceName = langCode === 'ru' ? 'Charon' : 'Kore';
    const response = await api.post(
      '/ai/generate-speech',
      {
        text: text,
        voice_name: voiceName,
      },
      { responseType: 'arraybuffer' },
    );

    const blob = new Blob([response.data], { type: 'audio/mpeg' });
    ttsBlobRef.value = blob; // useObjectUrl updates ttsUrl

    const audio = new Audio(ttsUrl.value as string);
    activeAudio = audio;

    audio.onended = () => {
      isSpeaking[wordToSpeak.id] = false;
      ttsBlobRef.value = null; // Auto-cleanup blob url
      activeAudio = null;
    };

    audio.onerror = (e) => {
      console.error('Audio playback error:', e);
      // Don't modify isSpeaking here, maybe fallback?
      // Fallback to synthesis if audio fails load?
      // Simple fallback: stop loading status, user clicks again -> synthesis?
      // Or ensure fallback executes below?
      // Throw error to trigger catch block?
      throw new Error('Audio element error');
    };

    await audio.play();
    return; // Success, exit function (don't run fallback)
  } catch (e) {
    console.warn('Gemini TTS failed, using Web Speech Fallback:', e);
    // Clean up from failed attempt
    ttsBlobRef.value = null;
    activeAudio = null;
  }

  // 2. Fallback to useSpeechSynthesis
  const langMap: Record<string, string> = {
    en: 'en-US',
    id: 'id-ID',
    ru: 'ru-RU',
    de: 'de-DE',
    fr: 'fr-FR',
    es: 'es-ES',
    pt: 'pt-PT',
    ja: 'ja-JP',
    ko: 'ko-KR',
    zh: 'zh-CN',
    ar: 'ar-SA',
    hi: 'hi-IN',
    it: 'it-IT',
    nl: 'nl-NL',
    tr: 'tr-TR',
    pl: 'pl-PL',
    uk: 'uk-UA',
    el: 'el-GR',
  };

  speechText.value = text;
  speechLang.value = langMap[langCode] || 'en-US';

  speak();
};

const { copy } = useClipboard({ legacy: true });

const copyWord = () => {
  const text = distilledWord.value?.accented;
  if (!text) return;
  copy(text);
  if (!text) return;
  copy(text);
  uiStore.showToast(t('word_copied'));
};

const reportWord = () => {
  uiStore.openReportModal({
    id: distilledWord.value.id,
    tipe: 'kata',
    appLabel: 'words_app',
    konten: distilledWord.value.accented,
    terjemahan:
      (distilledWord.value.translations || []).find(
        (t: any) => t.language_code === languageStore.selectedAsal?.kodeBahasa,
      )?.target_word || '',
  });
};

const handleTranslationsSaved = (updatedWordData: any) => {
  if (localWord.value && localWord.value.id === updatedWordData.id) {
    localWord.value.translations = updatedWordData.translations;
    showEditTranslationsModal.value = false;
  }
};

const handleWordUpdated = (updatedWord: any) => {
  if (localWord.value && localWord.value.id === updatedWord.id) {
    localWord.value = { ...localWord.value, ...updatedWord };
  }
};

const shouldShowGrammarBlock = (formsArray: any[]) => {
  if (!formsArray) return isAdminUser.value;
  return formsArray.length > 0 || isAdminUser.value;
};

const isTranslationMatch = (translation: any) => {
  if (!translation || !searchStore.currentSearchQuery) return false;
  const query = searchStore.currentSearchQuery.toLowerCase();
  const targetWord = (translation.target_word || '').toLowerCase();
  return query === targetWord;
};

// Computed untuk status enriching (uses loadingDetails which is set during fetchWordDetails)
const isEnriching = computed(() => {
  return loadingDetails.value;
});

// [NEW] POS Options for Admin Dropdown
const loadingPosOptions = ref(false);
const savingPos = ref(false);

const posOptions = computed(() => {
  const options = [
    'noun',
    'verb',
    'adjective',
    'adverb',
    'pronoun',
    'adposition',
    'conjunction',
    'interjection',
    'numeral',
    'particle',
    'det',
    'x',
    'expression',
  ];

  return options.map((val) => ({
    value: val,
    display: t(`pos_${val}`)
  }));
});

// Deprecated func but kept empty to separate concern if needed, or remove verify usage
async function fetchPosOptions() {
  // logic moved to computed
}

async function updateWordPos(newPos: string) {
  if (!localWord.value || savingPos.value) return;

  const oldPos = localWord.value.pos;
  if (oldPos === newPos) return;

  savingPos.value = true;
  try {
    await api.patch(`/admin/words/${localWord.value.id}/`, { pos: newPos });

    // Update local state
    localWord.value.pos = newPos;

    // Update store
    const storeWord = wordStore.words.find((w: any) => w.id === localWord.value.id);
    if (storeWord) {
      storeWord.pos = newPos;
    }

    uiStore.showToast(t('pos_update_success'), 'success');
  } catch (e) {
    console.error('Failed to update POS:', e);
    uiStore.showToast(t('pos_update_failed'), 'error');
  } finally {
    savingPos.value = false;
  }
}

// [MORPHOLOGY EDITOR] State and functions
const isMorphologyEditing = ref(false);
const morphologySaving = ref(false);
const morphologyGenerating = ref(false);
const editableForms = ref<{ form: string; form_type: string }[]>([]);

function formatFormType(type: string) {
  if (!type) return '';
  const typeMap: Record<string, string> = {
    '3per_sing_pres': t('morph_3rd_person'),
    past: t('morph_past'),
    past_part: t('morph_past_part'),
    pres_part: t('morph_pres_part'),
    plural: t('morph_plural'),
    comparative: t('morph_comparative'),
    superlative: t('morph_superlative'),
  };
  return typeMap[type] || type.replace(/_/g, ' ');
}

function startMorphologyEdit() {
  // Clone existing forms to editable array
  editableForms.value = (distilledWord.value?.forms || []).map((f: any) => ({
    form: f.form || '',
    form_type: f.form_type || '',
  }));
  isMorphologyEditing.value = true;
}

function cancelMorphologyEdit() {
  isMorphologyEditing.value = false;
  editableForms.value = [];
}

function addFormRow() {
  editableForms.value.push({ form: '', form_type: '' });
}

function removeFormRow(index: number) {
  editableForms.value.splice(index, 1);
}

async function saveMorphologyEdit() {
  if (!localWord.value || morphologySaving.value) return;

  morphologySaving.value = true;
  try {
    // Filter out empty forms
    const validForms = editableForms.value.filter((f) => f.form && f.form_type);

    // Save forms via API
    await api.patch(`/admin/words/${localWord.value.id}/`, {
      forms: validForms.map((f) => ({
        form: f.form,
        form_type: f.form_type,
        form_bare: f.form.replace(/'/g, '').replace(/-/g, ''),
      })),
    });

    // Update local state
    localWord.value.forms = validForms.map((f) => ({
      form: f.form,
      form_type: f.form_type,
      form_bare: f.form.replace(/'/g, '').replace(/-/g, ''),
    }));

    isMorphologyEditing.value = false;
    editableForms.value = [];
    isMorphologyEditing.value = false;
    editableForms.value = [];
    uiStore.showToast(t('morphology_saved'), 'success');
  } catch (e) {
    console.error('Failed to save morphology:', e);
    uiStore.showToast(t('morphology_save_failed'), 'error');
  } finally {
    morphologySaving.value = false;
  }
}

async function generateMorphologyAuto() {
  if (!localWord.value || morphologyGenerating.value) return;

  morphologyGenerating.value = true;
  try {
    const response = await api.patch(`/admin/words/${localWord.value.id}/`, {
      action: 'generate_morphology',
    });

    // Update local state with new forms
    if (response.data?.forms) {
      localWord.value.forms = response.data.forms;
      editableForms.value = response.data.forms.map((f: any) => ({
        form: f.form || '',
        form_type: f.form_type || '',
      }));
    }

    uiStore.showToast(t('morphology_generated'), 'success');
  } catch (e) {
    console.error('Failed to generate morphology:', e);
    uiStore.showToast(t('morphology_generate_failed'), 'error');
  } finally {
    morphologyGenerating.value = false;
  }
}

// [NEW] Toggle Word Active Status (Admin Only)
const togglingActive = ref(false);

async function toggleWordActive() {
  if (!localWord.value || togglingActive.value) return;

  const currentStatus = localWord.value.is_active ?? true;
  const newStatus = !currentStatus;

  togglingActive.value = true;
  try {
    await api.patch(`/admin/words/${localWord.value.id}/`, {
      is_active: newStatus,
    });

    // Update local state
    localWord.value.is_active = newStatus;

    // Update store
    const storeWord = wordStore.words.find((w: any) => w.id === localWord.value.id);
    if (storeWord) {
      storeWord.is_active = newStatus;
    }

    uiStore.showToast(
      newStatus ? t('word_activated') : t('word_deactivated'),
      'success',
    );
  } catch (e) {
    console.error('Failed to toggle word active:', e);
    uiStore.showToast(t('word_status_update_failed'), 'error');
  } finally {
    togglingActive.value = false;
  }
}
</script>

<template>
  <div v-if="compact" class="p-6 relative">
    <div class="absolute top-6 right-6 flex items-center gap-2 z-10">
      <!-- Admin: POS Dropdown -->
      <Menu v-if="isAdminUser && displayedWord?.pos" as="div" class="relative" @mouseenter="fetchPosOptions">
        <MenuButton
          class="px-2.5 py-1 rounded-full font-semibold capitalize text-sm flex items-center gap-1 cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-[var(--color-primary)] transition-all"
          :class="[posLabelClass, savingPos ? 'opacity-50' : '']">
          {{ displayedWord?.pos ? $t('pos_' + displayedWord.pos.toLowerCase()) : '' }}
          <span class="material-symbols-outlined !text-sm">expand_more</span>
        </MenuButton>
        <Transition enter-active-class="transition duration-100 ease-out"
          enter-from-class="transform scale-95 opacity-0" enter-to-class="transform scale-100 opacity-100"
          leave-active-class="transition duration-75 ease-in" leave-from-class="transform scale-100 opacity-100"
          leave-to-class="transform scale-95 opacity-0">
          <MenuItems
            class="absolute right-0 mt-2 w-40 max-h-64 overflow-y-auto origin-top-right rounded-xl bg-[var(--color-surface-container-high)] shadow-lg ring-1 ring-black/5 focus:outline-none z-30">
            <div class="py-1">
              <MenuItem v-for="pos in posOptions" :key="pos.value" v-slot="{ active }">
              <button @click="updateWordPos(pos.value)" :class="[
                active ? 'bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]' : 'text-[var(--color-on-surface)]',
                displayedWord?.pos === pos.value ? 'font-bold bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)]' : '',
                'group flex w-full items-center px-3 py-2 text-sm capitalize transition-colors'
              ]">
                {{ pos.display }}
                <span v-if="displayedWord?.pos === pos.value"
                  class="material-symbols-outlined ml-auto !text-base text-[var(--color-primary)]">check</span>
              </button>
              </MenuItem>
              <div v-if="loadingPosOptions" class="px-3 py-2 text-sm text-[var(--color-on-surface-variant)]">
                Loading...
              </div>
            </div>
          </MenuItems>
        </Transition>
      </Menu>
      <!-- Non-Admin: Static POS Label -->
      <span v-else-if="displayedWord?.pos" class="px-2.5 py-1 rounded-full font-semibold capitalize text-sm"
        :class="posLabelClass">
        {{ $t('pos_' + displayedWord.pos.toLowerCase()) }}
      </span>
      <button @click="$emit('toggle-expand')"
        class="p-2 bg-[var(--color-surface-container)] text-[var(--color-on-surface)] rounded-full hover:bg-[var(--color-surface-container-high)]"
        aria-label="Lihat Detail">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M0 0h24v24H0z" fill="none" />
          <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z" />
        </svg>
      </button>
    </div>

    <div class="pr-24">
      <div class="flex items-center justify-between pb-2">
        <div class="flex items-center gap-2 min-w-0">
          <button @click="handleBaseWordClick(formattedBaseWord)"
            class="text-left text-3xl font-bold text-[var(--color-on-background)] hover:underline break-words max-w-full">
            <span v-html="getHighlightedText(formattedBaseWord, searchStore.currentSearchQuery)"></span>
          </button>
          <button @click="speakWord" :disabled="isSpeaking[displayedWord?.id]" title="Ucapkan"
            class="text-[var(--color-outline)] hover:text-[var(--color-primary)] disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0">
            <span class="material-symbols-outlined text-3xl" :class="{ 'animate-spin': isSpeaking[displayedWord?.id] }">
              {{ isSpeaking[displayedWord?.id] ? 'sync' : 'volume_up' }}
            </span>
          </button>
        </div>
      </div>
      <div class="flex flex-col gap-2 pl-7">
        <!-- Translations Skeleton while loading -->
        <div v-if="loadingDetails && displayTranslations.length === 0" class="animate-pulse">
          <div class="flex gap-2 mt-2">
            <div class="h-6 w-20 bg-[var(--color-primary)]/20 rounded-full"></div>
            <div class="h-6 w-16 bg-[var(--color-primary)]/20 rounded-full"></div>
            <div class="h-6 w-24 bg-[var(--color-primary)]/20 rounded-full"></div>
          </div>
        </div>
        <div v-else-if="displayTranslations.length > 0" class="flex flex-wrap gap-2 mt-2">
          <span v-for="translation in displayTranslations" :key="translation.id" :class="[
            'font-semibold px-3 py-1 rounded-full transition-colors',
            isTranslationMatch(translation)
              ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]'
              : 'bg-[var(--color-surface-bright)] text-[var(--color-on-background)]'
          ]">
            {{ translation.target_word }}
          </span>
        </div>

        <ul v-if="matchingForms.length > 0" class="list-none space-y-1">
          <li v-for="form in matchingForms" :key="form.form" class="text-[var(--color-on-surface-variant)]">
            <span>-</span>
            <span class="pl-2 font-semibold text-[var(--color-on-background)] text-lg"
              v-html="getHighlightedText(form.form, searchStore.currentSearchQuery)"></span> - <span
              class="pl-1 text-sm font-light italic capitalize">{{ form.type }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>

  <template v-else>
    <!-- Show layout even while loading - skeletons handle loading state in specific sections -->
    <div v-if="distilledWord || loadingDetails" class="p-4 space-y-8 relative">
      <div class="absolute top-6 right-6 flex items-center gap-2 z-10">
        <Menu as="div" class="relative inline-block text-left">
          <MenuButton
            class="p-2 bg-[var(--color-surface-container)] text-[var(--color-on-surface)] rounded-full hover:bg-[var(--color-surface-container-high)] flex items-center justify-center transition-colors">
            <span class="material-symbols-outlined text-xl">more_vert</span>
          </MenuButton>
          <Transition enter-active-class="transition duration-100 ease-out"
            enter-from-class="transform scale-95 opacity-0" enter-to-class="transform scale-100 opacity-100"
            leave-active-class="transition duration-75 ease-in" leave-from-class="transform scale-100 opacity-100"
            leave-to-class="transform scale-95 opacity-0">
            <MenuItems
              class="absolute right-0 mt-2 w-40 origin-top-right divide-y divide-[var(--color-outline-variant)]/20 rounded-xl bg-[var(--color-surface-container-high)] shadow-lg ring-1 ring-black/5 focus:outline-none overflow-hidden z-20">
              <div class="px-1 py-1">
                <MenuItem v-slot="{ active }">
                <button @click="showSimpanModal = true" :class="[
                  active ? 'bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)]' : 'text-[var(--color-on-surface)]',
                  'group flex w-full items-center rounded-lg px-2 py-2 text-sm font-medium transition-colors'
                ]">
                  <span class="material-symbols-outlined mr-2 text-lg">bookmark</span>
                  {{ $t('save') }}
                </button>
                </MenuItem>
                <MenuItem v-slot="{ active }">
                <button @click="reportWord" :class="[
                  active ? 'bg-[var(--color-error-container)] text-[var(--color-on-error-container)]' : 'text-[var(--color-on-surface)]',
                  'group flex w-full items-center rounded-lg px-2 py-2 text-sm font-medium transition-colors'
                ]">
                  <span class="material-symbols-outlined mr-2 text-lg">flag</span>
                  {{ $t('report') }}
                </button>
                </MenuItem>
                <MenuItem v-slot="{ active }">
                <button @click="copyWord" :class="[
                  active ? 'bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface)]' : 'text-[var(--color-on-surface)]',
                  'group flex w-full items-center rounded-lg px-2 py-2 text-sm font-medium transition-colors'
                ]">
                  <span class="material-symbols-outlined mr-2 text-lg">content_copy</span>
                  {{ $t('copy') }}
                </button>
                </MenuItem>
                <!-- Admin Only: Toggle Active -->
                <MenuItem v-if="isAdminUser" v-slot="{ active }">
                <button @click="toggleWordActive" :disabled="togglingActive" :class="[
                  active ? 'bg-[var(--color-tertiary-container)] text-[var(--color-on-tertiary-container)]' : 'text-[var(--color-on-surface)]',
                  togglingActive ? 'opacity-50 cursor-not-allowed' : '',
                  'group flex w-full items-center rounded-lg px-2 py-2 text-sm font-medium transition-colors'
                ]">
                  <span class="material-symbols-outlined mr-2 text-lg">{{ (localWord?.is_active ?? true) ?
                    'visibility_off' : 'visibility' }}</span>
                  {{ (localWord?.is_active ?? true) ? $t('deactivate') : $t('activate') }}
                </button>
                </MenuItem>
              </div>
            </MenuItems>
          </Transition>
        </Menu>

        <button @click="$emit('toggle-expand')"
          class="p-2 bg-[var(--color-surface-container)] text-[var(--color-on-surface)] rounded-full hover:bg-[var(--color-surface-container-high)] transition-colors"
          aria-label="Tutup Detail">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 rotate-180" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z" />
          </svg>
        </button>
      </div>

      <HeaderDetail :word="distilledWord" :pos-options="posOptions" :loading-pos-options="loadingPosOptions"
        :saving-pos="savingPos" :is-speaking="isSpeaking[distilledWord?.id]" @speak-word="speakWord"
        @copy-word="copyWord" @report-word="reportWord" @fetch-pos-options="fetchPosOptions"
        @update-pos="updateWordPos" />

      <div class="space-y-8">
        <!-- Translations Section with smooth transition -->
        <Transition enter-active-class="transition-all duration-300 ease-out" enter-from-class="opacity-0 translate-y-2"
          enter-to-class="opacity-100 translate-y-0" leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="opacity-100" leave-to-class="opacity-0" mode="out-in">
          <div v-if="loadingDetails && (!distilledWord?.translations || distilledWord?.translations?.length === 0)"
            key="trans-skeleton">
            <div class="flex justify-between items-center mb-3">
              <h3 class="text-xl font-semibold text-[var(--color-primary)]">{{ $t('translations') }}</h3>
            </div>
            <div class="animate-pulse flex flex-wrap gap-2">
              <div class="h-8 w-24 bg-[var(--color-primary)]/20 rounded-full"></div>
              <div class="h-8 w-20 bg-[var(--color-primary)]/20 rounded-full"></div>
              <div class="h-8 w-28 bg-[var(--color-primary)]/20 rounded-full"></div>
              <div class="h-8 w-16 bg-[var(--color-primary)]/20 rounded-full"></div>
            </div>
          </div>
          <Translations v-else key="trans-content" :translations="displayTranslations" :is-admin="isAdminUser"
            :definitions="distilledWord.definitions" @open-edit-modal="showEditTranslationsModal = true"
            @search-word="handleWordClick" />
        </Transition>

        <!-- Definitions Section with smooth transition -->
        <Transition enter-active-class="transition-all duration-300 ease-out" enter-from-class="opacity-0 translate-y-2"
          enter-to-class="opacity-100 translate-y-0" leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="opacity-100" leave-to-class="opacity-0" mode="out-in">
          <div v-if="loadingDetails && (!distilledWord?.definitions || distilledWord?.definitions?.length === 0)"
            key="def-skeleton">
            <div class="flex justify-between items-center mb-3">
              <h3 class="text-xl font-semibold text-[var(--color-primary)]">{{ $t('definitions') }}</h3>
            </div>
            <div class="animate-pulse space-y-3">
              <div class="p-4 bg-[var(--color-primary)]/10 rounded-xl space-y-2">
                <div class="h-4 w-3/4 bg-[var(--color-primary)]/20 rounded"></div>
                <div class="h-3 w-1/2 bg-[var(--color-primary)]/15 rounded"></div>
              </div>
              <div class="p-4 bg-[var(--color-primary)]/10 rounded-xl space-y-2">
                <div class="h-4 w-2/3 bg-[var(--color-primary)]/20 rounded"></div>
                <div class="h-3 w-1/3 bg-[var(--color-primary)]/15 rounded"></div>
              </div>
            </div>
          </div>
          <Definition v-else key="def-content" :word="localWord" :is-admin="isAdminUser"
            @word-updated="handleWordUpdated" />
        </Transition>
      </div>

      <component v-if="grammarComponent" :is="grammarComponent" :word="distilledWord" :forms="distilledWord.forms"
        :is-admin="isAdminUser" :should-show-block="shouldShowGrammarBlock(distilledWord.forms)"
        @generate-morphology="generateMorphologyAuto" />

      <RelatedWords v-if="groupedRelatedWords" :grouped-related-words="groupedRelatedWords"
        @search-word="handleWordClick" />
    </div>
    <div v-else class="p-4 text-[var(--color-on-surface-variant)] italic">
      {{ $t('select_base_word_to_view_detail') }}
    </div>
    <EditTerjemahanKata v-if="localWord" v-model="showEditTranslationsModal" :word="localWord"
      @translations-saved="handleTranslationsSaved" />
    <SimpanKeDaftar v-if="localWord" v-model="showSimpanModal" :item-data="itemDataForSaving" item-type="word" />
  </template>
</template>
