<template>
  <node-view-wrapper as="div" :class="isEmbedded ? 'my-0' : 'my-6'">
    <div :class="[
      { 'ring-2 ring-[var(--color-primary)]': isComponentActive && !tM && !isEmbedded },
      { 'bg-[var(--color-surface-container)] rounded-xl p-4 shadow-sm': !isEmbedded },
      { 'p-0 bg-transparent ring-0 shadow-none': isEmbedded }
    ]" class="relative transition-all duration-200">
      <!-- Global TTS Button (always visible in public mode) -->
      <button v-if="tM && messages.length > 0 && showTarget" @click.stop="toggleAllTTS" :class="[
        'absolute top-3 right-3 z-20 w-8 h-8 flex items-center justify-center rounded-full transition-all border shadow-none',
        ttsPlayingAll
          ? 'bg-[var(--color-on-primary)] text-[var(--color-primary)] border-[var(--color-primary)]'
          : ttsLoadingIndex !== null
            ? 'text-[var(--color-primary)] border-[var(--color-outline-variant)]'
            : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-container)] border-[var(--color-outline-variant)]'
      ]" :title="ttsPlayingAll ? 'Hentikan Semua' : 'Putar Semua Percakapan'">
        <span class="material-symbols-outlined text-lg"
          :class="{ 'animate-pulse': ttsLoadingIndex !== null && !ttsPlayingAll }">volume_up</span>
      </button>

      <!-- Header Controls (admin mode) -->
      <div v-if="!tM || (tM && feedbackType === 'immediate')" :class="[
        'absolute top-3 right-3 z-20 flex items-center gap-2 transition-opacity duration-200',
        (isComponentActive || tM) ? 'opacity-100' : 'opacity-0 pointer-events-none'
      ]">
        <TransitionGroup tag="div" name="button-list" class="flex items-center gap-2">
          <!-- Global TTS Button (admin mode) -->
          <button v-if="!tM && messages.length > 0 && showTarget" key="tts" @click.stop="toggleAllTTS" :class="[
            'w-8 h-8 flex items-center justify-center rounded-full transition-all border shadow-none',
            ttsPlayingAll
              ? 'bg-[var(--color-on-primary)] text-[var(--color-primary)] border-[var(--color-primary)]'
              : ttsLoadingIndex !== null
                ? 'text-[var(--color-primary)] border-[var(--color-outline-variant)]'
                : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-container)] border-[var(--color-outline-variant)]'
          ]" :title="ttsPlayingAll ? 'Hentikan Semua' : 'Putar Semua Percakapan'">
            <span class="material-symbols-outlined text-lg"
              :class="{ 'animate-pulse': ttsLoadingIndex !== null && !ttsPlayingAll }">volume_up</span>
          </button>



          <div v-if="!tM && !isEmbedded" key="divider" class="h-4 w-px bg-[var(--color-outline-variant)] mx-1"></div>

          <button v-if="!tM && !isEmbedded" key="delete" @click.stop="hapusKomponen"
            class="w-7 h-7 flex items-center justify-center rounded-full text-[var(--color-primary)] hover:text-[var(--color-error)] hover:bg-[var(--color-error-container)] transition-transform cursor-pointer"
            title="Hapus Percakapan">
            <span class="material-symbols-outlined text-xl">close</span>
          </button>
        </TransitionGroup>
      </div>

      <!-- Messages -->
      <div class="space-y-3" :class="isEmbedded ? 'mt-2' : 'mt-8'">
        <div v-for="(msg, index) in messages" :key="index" class="flex items-start gap-2.5 w-full"
          :class="isSpeakerA(msg.speaker, index) ? '' : 'justify-end'">

          <!-- Speaker A (Left) -->
          <div v-if="isSpeakerA(msg.speaker, index)" class="flex items-start gap-2 max-w-[85%]">
            <div :class="[
              'p-3 rounded-xl rounded-es-none transition-all w-fit shadow-none',
              ttsActiveIndex === index
                ? 'bg-[var(--color-primary-container)] ring-2 ring-[var(--color-primary)]'
                : 'bg-[var(--color-secondary-container)]'
            ]">
              <!-- Speaker Name Label (Left) -->
              <div :class="[
                'mb-2 flex items-center w-fit px-3 py-1 rounded-full text-sm font-bold tracking-tight',
                ttsActiveIndex === index
                  ? 'bg-[var(--color-on-primary-container)] text-[var(--color-primary-container)]'
                  : 'bg-[var(--color-on-secondary-container)] text-[var(--color-secondary-container)] brightness-110 dark:brightness-90'
              ]">
                <template v-if="!tM">
                  <input :value="msg.speaker" @input="handleTextInput(index, 'speaker', $event)"
                    @blur="updateAllAttributes"
                    class="bg-transparent border-none focus:outline-none w-auto min-w-[20px] max-w-[100px] capitalize text-center p-0 m-0"
                    style="field-sizing: content;" placeholder="A" />
                </template>
                <div v-else class="capitalize truncate">
                  {{ getSpeakerName(msg.speaker) || 'Speaker A' }}
                </div>
              </div>

              <!-- Target Text + TTS Button (inline) -->
              <div v-if="showTarget" class="flex items-start gap-2">
                <div class="flex-1">
                  <template v-if="!tM">
                    <textarea :value="msg.text" @input="handleTextInput(index, 'text', $event)" @focus="onFocus"
                      @blur="updateAllAttributes" :placeholder="`Teks (${targetLangCode})...`" :class="[
                        'w-full min-w-[120px] bg-transparent focus:outline-none resize-none overflow-hidden text-lg placeholder-[var(--color-outline)] font-bold leading-tight block',
                        ttsActiveIndex === index
                          ? 'text-[var(--color-on-primary-container)]'
                          : 'text-[var(--color-on-secondary-container)]'
                      ]" style="field-sizing: content;" rows="1"></textarea>
                  </template>
                  <template v-else>
                    <div :class="[
                      'text-lg font-bold leading-tight select-text',
                      ttsActiveIndex === index
                        ? 'text-[var(--color-on-primary-container)]'
                        : 'text-[var(--color-on-secondary-container)]'
                    ]">
                      {{ msg.text || '...' }}
                    </div>
                  </template>
                </div>
                <!-- TTS Button: loading=blink, playing=bg circle+stop, off=static -->
                <button v-if="msg.text" @click.stop="toggleTTS(index)" :class="[
                  'relative flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full transition-all',
                  ttsActiveIndex === index
                    ? 'bg-[var(--color-on-primary)] text-[var(--color-primary)]'
                    : ttsLoadingIndex === index
                      ? 'text-[var(--color-primary)]'
                      : ttsActiveIndex !== null && ttsActiveIndex !== index
                        ? 'text-[var(--color-on-secondary-container)]/30'
                        : 'text-[var(--color-on-secondary-container)]/50 hover:text-[var(--color-on-secondary-container)] hover:bg-[var(--color-secondary)]/20'
                ]" :title="ttsActiveIndex === index ? 'Hentikan' : 'Dengarkan'">
                  <span class="material-symbols-outlined text-base"
                    :class="{ 'animate-pulse': ttsLoadingIndex === index }">volume_up</span>
                </button>
              </div>

              <!-- Source Translation -->
              <div v-if="showSource" class="mt-1">
                <template v-if="!tM">
                  <textarea :value="msg.translation" @input="handleTextInput(index, 'translation', $event)"
                    @focus="onFocus" @blur="updateAllAttributes" :placeholder="`Terjemahan (${sourceLangCode})...`"
                    :class="[
                      'w-full bg-transparent focus:outline-none resize-none overflow-hidden text-sm placeholder-[var(--color-outline)] font-medium block',
                      ttsActiveIndex === index
                        ? 'text-[var(--color-on-primary-container)]/80'
                        : 'text-[var(--color-on-secondary-container)]/70'
                    ]" style="field-sizing: content;" rows="1"></textarea>
                </template>
                <template v-else>
                  <div :class="[
                    'text-sm font-medium select-text',
                    ttsActiveIndex === index
                      ? 'text-[var(--color-on-primary-container)]/80'
                      : 'text-[var(--color-on-secondary-container)]/70'
                  ]">
                    {{ stripHtml(msg.translation) || '...' }}
                  </div>
                </template>
              </div>

            </div>

            <button v-if="!tM" @click="hapusPesan(index)" :class="[
              'flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-[var(--color-outline)] hover:text-[var(--color-error)] hover:bg-[var(--color-error-container)] transition-opacity',
              isComponentActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
            ]">
              <span class="material-symbols-outlined text-xl">delete</span>
            </button>
          </div>

          <!-- Speaker B (Right) -->
          <div v-else class="flex items-start gap-2 max-w-[85%]">
            <button v-if="!tM" @click="hapusPesan(index)" :class="[
              'flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-[var(--color-outline)] hover:text-[var(--color-error)] hover:bg-[var(--color-error-container)] transition-opacity',
              isComponentActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
            ]">
              <span class="material-symbols-outlined text-xl">delete</span>
            </button>

            <div :class="[
              'p-3 rounded-xl rounded-ee-none transition-all w-fit shadow-none',
              ttsActiveIndex === index
                ? 'bg-[var(--color-primary-container)] ring-2 ring-[var(--color-primary)]'
                : 'bg-[var(--color-tertiary-container)]'
            ]">
              <!-- Speaker Name Label (Right) -->
              <div :class="[
                'mb-2 flex items-center w-fit px-3 py-1 rounded-full text-sm tracking-tight ms-auto',
                ttsActiveIndex === index
                  ? 'bg-[var(--color-on-primary-container)] text-[var(--color-primary-container)]'
                  : 'bg-[var(--color-on-tertiary-container)] text-[var(--color-tertiary-container)]'
              ]">
                <template v-if="!tM">
                  <input :value="msg.speaker" @input="handleTextInput(index, 'speaker', $event)"
                    @blur="updateAllAttributes"
                    class="bg-transparent border-none focus:outline-none w-auto min-w-[20px] max-w-[100px] capitalize text-right p-0 m-0"
                    style="field-sizing: content;" placeholder="B" />
                </template>
                <div v-else class="capitalize truncate text-right">
                  {{ getSpeakerName(msg.speaker) || 'Speaker B' }}
                </div>
              </div>

              <!-- Target Text + TTS Button (inline, right-aligned) -->
              <div v-if="showTarget" class="flex items-start gap-2">
                <!-- TTS Button: loading=blink, playing=bg circle+stop, off=static -->
                <button v-if="msg.text" @click.stop="toggleTTS(index)" :class="[
                  'relative flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full transition-all',
                  ttsActiveIndex === index
                    ? 'bg-[var(--color-on-primary)] text-[var(--color-primary)]'
                    : ttsLoadingIndex === index
                      ? 'text-[var(--color-primary)]'
                      : ttsActiveIndex !== null && ttsActiveIndex !== index
                        ? 'text-[var(--color-on-tertiary-container)]/30'
                        : 'text-[var(--color-on-tertiary-container)]/50 hover:text-[var(--color-on-tertiary-container)] hover:bg-[var(--color-tertiary)]/20'
                ]" :title="ttsActiveIndex === index ? 'Hentikan' : 'Dengarkan'">
                  <span class="material-symbols-outlined text-base"
                    :class="{ 'animate-pulse': ttsLoadingIndex === index }">volume_up</span>
                </button>
                <div class="flex-1">
                  <template v-if="!tM">
                    <textarea :value="msg.text" @input="handleTextInput(index, 'text', $event)" @focus="onFocus"
                      @blur="updateAllAttributes" :placeholder="`Teks (${targetLangCode})...`" :class="[
                        'w-full min-w-[120px] bg-transparent focus:outline-none resize-none overflow-hidden text-lg placeholder-[var(--color-outline)] font-bold leading-tight text-right block',
                        ttsActiveIndex === index
                          ? 'text-[var(--color-on-primary-container)]'
                          : 'text-[var(--color-on-tertiary-container)]'
                      ]" style="field-sizing: content;" rows="1"></textarea>
                  </template>
                  <template v-else>
                    <div :class="[
                      'text-lg font-bold leading-tight text-right select-text',
                      ttsActiveIndex === index
                        ? 'text-[var(--color-on-primary-container)]'
                        : 'text-[var(--color-on-tertiary-container)]'
                    ]">
                      {{ msg.text || '...' }}
                    </div>
                  </template>
                </div>
              </div>

              <!-- Source Translation -->
              <div v-if="showSource" class="mt-1">
                <template v-if="!tM">
                  <textarea :value="msg.translation" @input="handleTextInput(index, 'translation', $event)"
                    @focus="onFocus" @blur="updateAllAttributes" :placeholder="`Terjemahan (${sourceLangCode})...`"
                    :class="[
                      'w-full bg-transparent focus:outline-none resize-none overflow-hidden text-sm placeholder-[var(--color-outline)] font-medium text-right block',
                      ttsActiveIndex === index
                        ? 'text-[var(--color-on-primary-container)]/80'
                        : 'text-[var(--color-on-tertiary-container)]/70'
                    ]" style="field-sizing: content;" rows="1"></textarea>
                </template>
                <template v-else>
                  <div :class="[
                    'text-sm font-medium text-right select-text',
                    ttsActiveIndex === index
                      ? 'text-[var(--color-on-primary-container)]/80'
                      : 'text-[var(--color-on-tertiary-container)]/70'
                  ]">
                    {{ stripHtml(msg.translation) || '...' }}
                  </div>
                </template>
              </div>

            </div>
          </div>

        </div>
      </div>

      <div v-if="!tM" class="mt-4 flex gap-2 pt-2 ">
        <button @click="tambahPesan('A')"
          class="flex-grow text-sm text-center text-[var(--color-outline)] hover:text-[var(--color-primary)] bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-container-highest)] rounded-lg py-2 transition-colors duration-200">+
          Pesan Kiri</button>
        <button @click="tambahPesan('B')"
          class="flex-grow text-sm text-center text-[var(--color-outline)] hover:text-[var(--color-primary)] bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-container-highest)] rounded-lg py-2 transition-colors duration-200">+
          Pesan Kanan</button>
      </div>
    </div>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import {
  ref,
  watch,
  onMounted,
  onUnmounted,
  nextTick,
  computed,
  inject,
} from 'vue';
import { useLanguageStore } from '@/stores/language';
import { api } from '@/utils/api';

const props = defineProps({
  ...nodeViewProps,
  isEmbedded: {
    type: Boolean,
    default: false,
  },
});
const isComponentActive = computed(() => props.selected || props.isEmbedded); // Always active if embedded? Or strictly follow selected.
// If embedded, usually we want it to look "active" or just normal.
// Let's rely on props.selected passed from parent or default to false.
// Actually if embedded, the parent handles selection.
// Let's keep isComponentActive logic simple.

const languageStore = useLanguageStore();

// --- INJECT (Integrasi Dual Mode) ---
const examContext = inject('examContext', {
  mode: 'admin',
  feedbackType: 'immediate',
});
const registry = inject<any>('questionRegistry', null);
const componentId = `chat-${Math.random().toString(36).substr(2, 9)}`;

// Inject materialContext for moduleId (used for TTS API call)
const materialContext = inject<any>('materialContext', null);

// --- STATE ---
const tM = ref(false); // Test Mode
const currentMode = ref('admin'); // Unused but kept for consistency with setMode
const feedbackType = ref('immediate');

// --- TTS STATE ---
const ttsLoadingIndex = ref<number | null>(null);
const ttsPlayingAll = ref(false);
const ttsActiveIndex = ref<number | null>(null); // Currently playing message index (for highlighting)

interface TTSCache {
  audioUrl: string;
  segments: any[];
  audio: HTMLAudioElement | null;
}
const ttsCache = ref<TTSCache | null>(null);

// --- LANGUAGE LOGIC ---
const sourceLangCode = computed(
  () => languageStore.selectedAsal?.kodeBahasa?.toUpperCase() || 'ID',
);
const targetLangCode = computed(
  () => languageStore.selectedTarget?.kodeBahasa?.toUpperCase() || 'TARGET',
);
const showSource = ref(!props.isEmbedded);
const showTarget = ref(true);

const isTTSLoading = computed(() => ttsLoadingIndex.value !== null);

const playSingleTTS = async (index: number) => {
  if (ttsLoadingIndex.value !== null || ttsPlayingAll.value) return;

  const msg = messages.value[index];
  const textToSpeak = msg.translation || msg.text;

  if (!textToSpeak) return;

  // Use target language for TTS, fallback to 'en'
  // Note: materialContext.targetLang is usually what we want if available
  const lang =
    materialContext?.targetLang ||
    targetLangCode.value.toLowerCase() ||
    'en';

  ttsLoadingIndex.value = index;
  ttsActiveIndex.value = index;

  try {
    const response = await api.post('/phonetics/tts', {
      text: textToSpeak,
      lang: lang,
      gender: isSpeakerA(msg.speaker, index) ? 'female' : 'male', // Contextual voice?
    });

    if (response.data && response.data.audio_content) {
      const audioSrc = `data:audio/mp3;base64,${response.data.audio_content}`;
      const audio = new Audio(audioSrc);

      await new Promise<void>((resolve) => {
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        audio.play();
      });
    }
  } catch (e) {
    console.error('Failed to play TTS:', e);
  } finally {
    ttsLoadingIndex.value = null;
    ttsActiveIndex.value = null;
  }
};

const stopTTS = () => {
  if (ttsCache.value?.audio) {
    ttsCache.value.audio.pause();
    ttsCache.value.audio.currentTime = 0;
  }
  ttsPlayingAll.value = false;
  ttsActiveIndex.value = null;
  (window as any).ttsSequencePlaying = false;
};

const toggleAllTTS = () => {
  playAllTTS();
};

const toggleTTS = (index: number) => {
  handlePlayClick(index);
};

const playAllTTS = async () => {
  if (ttsPlayingAll.value) {
    stopTTS();
    return;
  }

  // Pre-fetch logic similar to ManajemenNarasi or just sequential play?
  // Since we don't have a "Director" here returning full audio map, we might need to
  // generate/play sequentially or fetch all first.
  // For simplicity implementation matching typical "Read All":

  ttsPlayingAll.value = true;
  (window as any).ttsSequencePlaying = true;

  // 1. Fetch/Generate Audio for ALL messages first (or stream them)
  // To keep it responsive, let's play sequentially.

  try {
    for (let i = 0; i < messages.value.length; i++) {
      if (!ttsPlayingAll.value) break; // User stopped
      await playSingleTTS(i);
      // Small pause between messages
      if (ttsPlayingAll.value) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  } finally {
    stopTTS();
  }
};

// Play this index
const handlePlayClick = async (index: number) => {
  await playSingleTTS(index);
};

// Clear cache when messages change
watch(
  () => props.node.attrs.messages,
  () => {
    stopTTS(); // Stop any playing audio
    if (ttsCache.value?.audioUrl) {
      URL.revokeObjectURL(ttsCache.value.audioUrl);
    }
    ttsCache.value = null;
  },
  { deep: true },
);

const toggleSource = () => {
  if (showSource.value && !showTarget.value) return;
  showSource.value = !showSource.value;
  if (!tM.value) autoResizeAllTextareas();
};

const toggleTarget = () => {
  if (showTarget.value && !showSource.value) return;
  showTarget.value = !showTarget.value;
  if (!tM.value) autoResizeAllTextareas();
};

interface Message {
  speaker: string;
  text: string;
  translation: string;
  [key: string]: any;
}

// --- DATA ---
const messages = ref<Message[]>(
  JSON.parse(JSON.stringify(props.node.attrs.messages || [])),
);
const speakers = ref<any[]>(
  JSON.parse(JSON.stringify(props.node.attrs.speakers || [])),
);

// Map ID to Name
const speakerMap = computed(() => {
  const map: Record<string, string> = {};
  speakers.value.forEach((s) => {
    if (s.id) map[s.id] = s.name;
  });
  return map;
});

const getSpeakerName = (id: string) => {
  return speakerMap.value[id] || id; // Fallback to ID if name not found
};

watch(
  () => props.node.attrs.messages,
  (newMessages) => {
    messages.value = JSON.parse(JSON.stringify(newMessages || []));
    if (!tM.value) autoResizeAllTextareas();
  },
  { deep: true },
);

watch(
  () => props.node.attrs.speakers,
  (newSpeakers) => {
    speakers.value = JSON.parse(JSON.stringify(newSpeakers || []));
  },
  { deep: true },
);

// --- HELPERS ADMIN ---
const onFocus = () => {
  props.editor.commands.setNodeSelection(props.getPos());
};
const hapusKomponen = () => {
  props.deleteNode();
};
const updateAllAttributes = () => {
  props.updateAttributes({ messages: messages.value, speakers: speakers.value });
};

const autoResizeAllTextareas = () => {
  nextTick(() => {
    // Hanya resize jika textarea ada (Admin mode)
    const nodeEl = props.editor.view.domAtPos(props.getPos())?.node
      ?.parentElement;
    if (nodeEl instanceof HTMLElement) {
      const textareas = nodeEl.querySelectorAll('textarea');
      textareas.forEach((textarea) => {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
      });
    }
  });
};

const tambahPesan = (speaker: string) => {
  messages.value.push({ speaker, text: '', translation: '' });
  updateAllAttributes();
  autoResizeAllTextareas();
};

const hapusPesan = (index: number) => {
  messages.value.splice(index, 1);
  updateAllAttributes();
};

const handleTextInput = (index: number, field: string, event: Event) => {
  const target = event.target as HTMLTextAreaElement;
  messages.value[index][field] = target.value;
  target.style.height = 'auto';
  target.style.height = target.scrollHeight + 'px';
};

// Helper: Strip HTML/Markdown tags from text (for clean display)
const stripHtml = (text: string) => {
  if (!text) return '';
  // Remove HTML tags like <b>, </b>, <i>, </i>, <strong>, etc.
  return String(text)
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/\*\*(.+?)\*\*/g, '$1') // Remove **bold** markdown
    .replace(/\*(.+?)\*/g, '$1') // Remove *italic* markdown
    .replace(/__(.+?)__/g, '$1') // Remove __bold__ markdown
    .replace(/_(.+?)_/g, '$1') // Remove _italic_ markdown
    .trim();
};

// Determine if speaker should be on left (A) or right (B)
// Uses speaker value first, then falls back to alternating based on index
const isSpeakerA = (speaker: string | number, index: number = 0) => {
  // Normalize speaker: check for 'A', 'a', Cyrillic 'А', or first speaker in conversation
  const normalizedSpeaker = String(speaker).trim().toUpperCase();
  if (normalizedSpeaker === 'A' || normalizedSpeaker === 'А') return true; // Latin A or Cyrillic А
  if (normalizedSpeaker === 'B' || normalizedSpeaker === 'Б') return false; // Latin B or Cyrillic Б
  // Fallback: alternate based on index (even = left, odd = right)
  return index % 2 === 0;
};

// --- API IMPLEMENTATION (Sama seperti komponen soal lain) ---
const setMode = (mode: string, type = 'immediate') => {
  currentMode.value = mode;
  feedbackType.value = type;

  if (mode === 'public') {
    tM.value = true;
  } else {
    tM.value = false;
    autoResizeAllTextareas(); // Kembalikan ukuran textarea saat kembali ke admin
  }
};

// --- LIFECYCLE ---
onMounted(() => {
  if (!tM.value) autoResizeAllTextareas();

  // Daftarkan ke registry (meskipun bukan soal, agar bisa dikontrol mode-nya barengan)
  if (registry && registry.register) {
    registry.register(componentId, {
      setMode,
      isQuestion: false, // Explicitly mark as NOT a question for counting logic
      // Percakapan tidak punya nilai/score, return default
      submit: () => ({ isAnswered: true, score: 0, maxScore: 0 }),
      reset: () => { },
    });
  }

  // Sync state awal
  if (examContext && examContext.mode) {
    setMode(examContext.mode, examContext.feedbackType);
  }
});

onUnmounted(() => {
  if (registry && registry.unregister) {
    registry.unregister(componentId);
  }
});

watch(
  examContext,
  (newVal) => {
    if (newVal && newVal.mode) {
      setMode(newVal.mode, newVal.feedbackType);
    }
  },
  { deep: true },
);

// --- EXPOSE ---
defineExpose({
  setMode,
});
</script>
