<script setup lang="ts">
import { ref, computed, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMemoize, useClipboard } from '@vueuse/core';
import { useUIStore } from '@/stores/ui';
import { useListsStore } from '@/stores/lists';
import { useAuthStore } from '@/stores/auth';
import { useLanguageStore } from '@/stores/language';
import { api } from '@/utils/api';
import SimpanKeDaftar from '../../SimpanKeDaftar.vue';
import { getHighlightedText } from '@/utils/HighlightText';
import EditKalimat from '@/components/Aplikasi/Admin/EditKalimat.vue';

// --- PROPS & EMITS ---
interface Props {
  sentenceId: string | number;
  sourceText: string;
  targetText: string;
  searchTerm?: string;
  isActive?: boolean;
  hasNarrative?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  searchTerm: '',
  isActive: false,
  hasNarrative: false,
});

const emit = defineEmits<{
  (e: 'show-popover', payload: any): void;
  (e: 'activate', id: string | number): void;
  (e: 'show-narrative', id: string | number): void;
  (e: 'open-narasi-editor', id: string | number): void;
}>();

// --- STORES & STATE LOKAL ---
const uiStore = useUIStore();
const listsStore = useListsStore();
const authStore = useAuthStore();
const languageStore = useLanguageStore();
const { t } = useI18n();
const isModalOpen = ref(false);

const isEditModalOpen = ref(false);
const isSpeaking = reactive<Record<string | number, boolean>>({});

const textToCopy = computed(() => `${props.targetText}\n${props.sourceText}`);
const { copy, copied } = useClipboard({ source: textToCopy, legacy: true });

// --- COMPUTED PROPERTIES ---
const isReportButtonOnCooldown = computed(() =>
  uiStore.isActionOnCooldown('report'),
);
const isFavorite = computed(() => listsStore.isFavorite(props.sentenceId));
const folderIconForDisplay = computed(() => {
  const allLists = listsStore.getFolders;
  const nonFavoriteLists = allLists.filter((list) => list.name !== 'Favorit');
  for (const list of nonFavoriteLists) {
    if (listsStore.isItemInList(String(props.sentenceId), list.name, 'sentence')) {
      return list.icon;
    }
  }
  return null;
});
const isMaterialSymbol = computed(() => {
  return (
    typeof folderIconForDisplay.value === 'string' &&
    folderIconForDisplay.value.length > 1 &&
    folderIconForDisplay.value.includes('_')
  );
});
const isAdminUser = computed(() => authStore.isAdmin);

// --- LOGIKA PEMROSESAN TEKS ---
const segmentizeText = useMemoize((text: string) => {
  if (!text) return [];
  const segmentRegex = /[\p{L}\p{M}'-]+|[^\p{L}\p{M}'-]+/gu;
  const segments: { text: string; isWord: boolean }[] = [];
  let match;
  while ((match = segmentRegex.exec(text)) !== null) {
    segments.push({ text: match[0], isWord: /\p{L}/u.test(match[0]) });
  }
  return segments;
});
const processedTargetText = computed(() => segmentizeText(props.targetText));

// --- HANDLER AKSI ---
const handleSave = () => {
  isModalOpen.value = true;
};
const handleEdit = () => {
  isEditModalOpen.value = true;
};
const handleCopy = () => {
  copy();
};
const handleSpeak = async () => {
  if (isSpeaking[props.sentenceId]) return;
  isSpeaking[props.sentenceId] = true;

  const langCode = languageStore.selectedTarget?.kodeBahasa || 'en';

  // Helper: Web Speech API fallback
  const speakWithWebSpeech = () => {
    return new Promise<void>((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('Web Speech API tidak didukung'));
        return;
      }

      const synth = window.speechSynthesis;
      synth.cancel(); // Cancel any ongoing speech

      const utterance = new SpeechSynthesisUtterance(props.targetText);

      // Map lang_code to BCP-47 speech code
      const speechLangMap: Record<string, string> = {
        id: 'id-ID',
        en: 'en-US',
        ru: 'ru-RU',
        de: 'de-DE',
        fr: 'fr-FR',
        es: 'es-ES',
        it: 'it-IT',
        ja: 'ja-JP',
        ko: 'ko-KR',
        zh: 'zh-CN',
        ar: 'ar-SA',
        pt: 'pt-BR',
        el: 'el-GR',
        hi: 'hi-IN',
      };

      utterance.lang = speechLangMap[langCode] || 'en-US';
      utterance.rate = 0.9;
      utterance.pitch = 1.0;

      // Try to find a voice for the language
      const voices = synth.getVoices();
      const langVoices = voices.filter((v) => v.lang.startsWith(langCode));
      const fallbackVoices = voices.filter((v) => v.lang.startsWith('en'));

      // Prioritize Google/Premium voices
      let matchingVoice = langVoices.find(
        (v) =>
          v.name.includes('Google') ||
          v.name.includes('Premium') ||
          v.name.includes('Enhanced'),
      );

      // If no premium voice found, fallback to any matching voice
      if (!matchingVoice)
        matchingVoice =
          langVoices[0] ||
          fallbackVoices.find((v) => v.name.includes('Google')) ||
          fallbackVoices[0];

      if (matchingVoice) utterance.voice = matchingVoice;

      utterance.onend = () => resolve();
      utterance.onerror = (e) => reject(new Error(e.error));

      synth.speak(utterance);
    });
  };

  try {
    // Try Gemini TTS first
    const voiceName = langCode === 'ru' ? 'Charon' : 'Kore';

    const response = await api.post(
      '/ai/generate-speech',
      {
        text: props.targetText,
        voice_name: voiceName,
      },
      {
        responseType: 'arraybuffer',
      },
    );

    const blob = new Blob([response.data], { type: 'audio/mpeg' });
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);

    audio.onended = () => {
      isSpeaking[props.sentenceId] = false;
      URL.revokeObjectURL(audioUrl);
    };

    audio.onerror = (e) => {
      console.error('Audio playback error:', e);
      isSpeaking[props.sentenceId] = false;
      URL.revokeObjectURL(audioUrl);
    };

    await audio.play();
  } catch (error: any) {
    console.warn('Gemini TTS gagal, menggunakan Web Speech:', error.message);

    // Fallback to Web Speech API
    try {
      await speakWithWebSpeech();
    } catch (webError) {
      console.error('Web Speech juga gagal:', webError);
    }

    isSpeaking[props.sentenceId] = false;
  }
};

const actions = computed(() => {
  const isAudioPlaying = isSpeaking[props.sentenceId];
  const defaultActions = [
    {
      name: 'report',
      label: t('report'),
      icon: 'flag',
      handler: () => openReportModal(),
      disabled: isReportButtonOnCooldown.value,
    },
    {
      name: 'speak',
      label: t('speak'),
      icon: 'volume_up',
      handler: handleSpeak,
      class: isAudioPlaying
        ? 'animate-pulse !bg-[var(--color-on-secondary)] !text-[var(--color-secondary)] rounded-full'
        : '',
      disabled: false,
    },
    {
      name: 'copy',
      label: copied.value ? t('copied') : t('copy'),
      icon: copied.value ? 'done' : 'content_copy',
      handler: handleCopy,
      disabled: false,
    },
    {
      name: 'save',
      label: t('save'),
      icon: isFavorite.value ? 'bookmark' : 'bookmark_border',
      handler: handleSave,
      // PERUBAHAN: Jika tidak difavoritkan, tidak ada kelas spesifik yang diterapkan di sini,
      // sehingga warna diambil dari tombol utama (on-secondary-container).
      // Jika difavoritkan, tetap gunakan Secondary solid untuk Fill.
      class: isFavorite.value ? 'text-[var(--color-secondary)]' : '',
      style: {
        // Style dipertahankan untuk mengontrol properti FILL (terisi atau tidak)
        fontVariationSettings: isFavorite.value ? "'FILL' 1" : '',
      },
      disabled: false,
    },
  ];

  // Only add narrative button if has_narrative is true
  if (props.hasNarrative) {
    defaultActions.push({
      name: 'narrative',
      label: t('type_narasi'),
      icon: 'auto_stories',
      handler: () => {
        emit('show-narrative', props.sentenceId);
      },
      disabled: false,
    });
  }

  if (isAdminUser.value) {
    defaultActions.push({
      name: 'edit',
      label: t('edit'),
      icon: 'edit',
      handler: handleEdit,
      disabled: false,
    });
  }
  return defaultActions;
});

const toggleFavorite = () => {
  const langPair =
    languageStore.selectedAsal && languageStore.selectedTarget
      ? `${languageStore.selectedAsal.kodeBahasa}-${languageStore.selectedTarget.kodeBahasa}`
      : '';
  listsStore.toggleFavorite(String(props.sentenceId), 'sentence', langPair);
};
const handleAddToFolder = (payload: any) => {
  const langPair =
    languageStore.selectedAsal && languageStore.selectedTarget
      ? `${languageStore.selectedAsal.kodeBahasa}-${languageStore.selectedTarget.kodeBahasa}`
      : '';
  listsStore.addToList({
    itemId: String(props.sentenceId),
    itemType: 'sentence',
    langPair: langPair,
    listName: payload.folder.name,
  });
};
const openReportModal = () => {
  uiStore.openReportModal({
    id: props.sentenceId,
    tipe: 'kalimat',
    app_label: 'sentences_app',
    konten: props.targetText,
    terjemahan: props.sourceText,
  });
};

const handleClick = (event) => {
  if (
    event.target.closest(
      '.action-panel, .favorite-indicator, .folder-indicator',
    )
  ) {
    return;
  }
  const wordElement = event.target.closest('[data-word]');
  if (wordElement && props.isActive) {
    emit('show-popover', {
      word: wordElement.dataset.word,
      target: wordElement,
    });
  } else {
    emit('activate', props.sentenceId);
  }
};
</script>

<template>
  <div>
    <div class="relative group cursor-pointer rounded-xl mx-2 my-1 transition-all duration-300 ease-in-out" :class="{
      // Selected menggunakan warna hover yang lama (surface-container)
      'bg-[var(--color-surface-container)] z-20': isActive,
      // Non-aktif (default) menggunakan latar belakang paling tinggi/terang pada hover
      'z-10 hover:z-20': !isActive,
      'active:scale-[0.99] active:shadow-sm': isActive
    }" @click="handleClick">
      <div v-if="!isActive"
        class="absolute inset-0 rounded-xl bg-[var(--color-surface-container-highest)] opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out z-0">
      </div>

      <div class="absolute bottom-1 right-2 flex space-x-2 z-10 transition-all duration-300 ease-in-out"
        :class="isActive ? 'opacity-0 translate-y-full pointer-events-none' : 'opacity-100 translate-y-0 pointer-events-auto'">
        <div v-if="folderIconForDisplay && !isFavorite" @click.stop class="folder-indicator text-2xl">
          <span :class="{ 'material-symbols-outlined text-base': isMaterialSymbol }"
            class="text-[var(--color-outline)]">
            {{ folderIconForDisplay }}
          </span>
        </div>
        <div v-if="isFavorite" @click.stop="toggleFavorite" class="favorite-indicator text-2xl">
          <span class="material-symbols-outlined text-[var(--color-secondary)]"
            style="font-variation-settings: 'FILL' 1;">star</span>
        </div>
      </div>

      <div class="relative z-10">
        <div class="pt-5 pb-3 px-3 md:px-4">
          <p class="text-lg font-semibold leading-relaxed mb-2 text-[var(--color-on-background)] transition-colors">
            <template v-for="(seg, idx) in processedTargetText" :key="'src-' + idx">
              <span v-if="seg.isWord" :data-word="seg.text" class="transition-colors duration-200" :class="{
                'cursor-pointer hover:text-[var(--color-primary)]': isActive,
                'cursor-default': !isActive,
              }"
                v-html="getHighlightedText(seg.text, searchTerm, 'bg-[var(--color-primary-fixed-dim)] text-[var(--color-on-primary)] rounded-md px-1')"></span>
              <span v-else>{{ seg.text }}</span>
            </template>
          </p>
          <p class="text-base leading-relaxed text-[var(--color-on-surface-variant)] transition-colors">
            <span
              class="material-symbols-outlined mr-1 opacity-60 select-none text-[1.1em] align-text-bottom">subdirectory_arrow_right</span>
            {{ sourceText }}
          </p>
        </div>

        <div class="grid transition-[grid-template-rows] duration-500 ease-in-out"
          :class="isActive ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'">
          <div class="overflow-hidden">
            <div
              class="action-panel flex justify-around items-center pt-2 pb-3 border-t border-[var(--color-outline-variant)]">
              <button v-for="action in actions" :key="action.name" @click.stop="action.handler()"
                :disabled="action.disabled"
                class="group flex flex-col items-center justify-center gap-1 p-2 rounded-lg 
                       text-[var(--color-on-secondary-container)] transition-colors duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed 
                       hover:not(:disabled):bg-[var(--color-secondary-container)] hover:not(:disabled):text-[var(--color-on-secondary-container)] 
                       active:not(:disabled):bg-[var(--color-secondary)] active:not(:disabled):text-[var(--color-on-secondary)]">
                <span class="material-symbols-outlined text-base" :class="action.class" :style="action.style">
                  {{ action.icon }}
                </span>
                <span class="text-xs font-medium">{{ action.label }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <SimpanKeDaftar v-model="isModalOpen" :itemData="{
      id: props.sentenceId,
      source: props.targetText,
      translation: props.sourceText,
      lang_pair: languageStore.selectedAsal && languageStore.selectedTarget
        ? `${languageStore.selectedAsal.kodeBahasa}-${languageStore.selectedTarget.kodeBahasa}`
        : ''
    }" itemType="sentence" @add-to-folder="handleAddToFolder" />

    <EditKalimat v-model="isEditModalOpen" :sentenceId="props.sentenceId"
      @open-narasi-editor="emit('open-narasi-editor', $event)" />
  </div>
</template>
