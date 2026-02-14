<template>
  <node-view-wrapper as="div" class="my-6 soalrumpang-wrapper">
    <div :class="{ 'ring-2 ring-[var(--color-primary)]': isComponentActive && !isTestMode }"
      class="relative bg-[var(--color-surface-container)] rounded-xl p-4 transition-colors duration-200"
      @mousedown="handleWrapperMousedown">
      <div v-if="!isTestMode || (isTestMode && feedbackType === 'immediate')"
        :class="{ 'opacity-100': isComponentActive || isTestMode, 'opacity-0 pointer-events-none': !isComponentActive && !isTestMode }"
        class="absolute top-4 right-4 z-20 transition-opacity duration-200">
        <TransitionGroup tag="div" name="button-list" class="flex items-center gap-2">
          <button v-if="!isTestMode || feedbackType === 'immediate'" key="play" @click.stop="toggleTestMode"
            :title="isTestMode ? 'Keluar Mode Uji' : 'Masuk Mode Uji'"
            class="w-7 h-7 flex items-center justify-center rounded-full transition-transform cursor-pointer" :class="isTestMode
              ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]'
              : 'text-[var(--color-primary)] hover:bg-[var(--color-primary-container)]'">
            <span class="material-symbols-outlined text-lg">play_arrow</span>
          </button>

          <button v-if="isTestMode && feedbackType === 'immediate'" key="check" @click.stop="toggleCheckMode"
            title="Koreksi Jawaban" :disabled="!isAnswered"
            class="w-7 h-7 flex items-center justify-center rounded-full transition-transform cursor-pointer" :class="[
              isChecking
                ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]'
                : 'text-[var(--color-primary)] hover:bg-[var(--color-primary-container)]',
              !isAnswered ? 'cursor-not-allowed opacity-70' : ''
            ]">
            <span class="material-symbols-outlined text-xl">check_circle</span>
          </button>

          <button v-if="!isTestMode" key="ai_gen" @click.stop="generateWithAI"
            class="w-7 h-7 flex items-center justify-center rounded-full text-[var(--color-primary)] hover:bg-[var(--color-primary-container)] transition-transform cursor-pointer"
            :class="{ 'opacity-50 cursor-wait': isGenerating }"
            :title="isGenerating ? 'Sedang membuat...' : 'Buat Soal dengan AI'">
            <span :class="['material-symbols-outlined text-xl', isGenerating ? 'animate-spin' : '']">{{ isGenerating ?
              'sync' : 'auto_awesome' }}</span>
          </button>

          <button v-if="!isTestMode" key="delete" @click.stop="hapusKomponen"
            class="w-7 h-7 flex items-center justify-center rounded-full text-[var(--color-primary)] hover:text-[var(--color-error)] hover:bg-[var(--color-error-container)] transition-transform cursor-pointer"
            title="Hapus Soal">
            <span class="material-symbols-outlined text-xl">close</span>
          </button>

          <button v-if="isTestMode && feedbackType === 'immediate'" key="reset" @click.stop="resetSoal"
            title="Reset Soal"
            class="w-7 h-7 flex items-center justify-center rounded-full text-[var(--color-primary)] hover:text-[var(--color-error)] hover:bg-[var(--color-surface-container-high)] transition-transform cursor-pointer">
            <span class="material-symbols-outlined text-xl">refresh</span>
          </button>
        </TransitionGroup>
      </div>

      <div class="flex items-start mb-4">
        <div data-drag-handle class="pt-1 pr-4 cursor-grab" style="touch-action: none;">
          <span
            class="w-7 h-7 flex items-center justify-center bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-full font-bold text-sm flex-shrink-0">
            {{ questionNumber }}
          </span>
          <div v-if="isTestMode && isChecking" class="text-xs font-bold mt-1 text-center"
            :class="scoreValue === 100 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'">
            {{ earnedPoints }} pts
          </div>
        </div>
        <textarea :value="node.attrs.instruction" @input="updateInstruction" @focus="onFocus" :readonly="isTestMode"
          :class="{ 'cursor-default': isTestMode }"
          class="w-full font-semibold text-lg p-1 bg-transparent focus:outline-none placeholder-[var(--color-outline)] text-[var(--color-on-background)] resize-none overflow-hidden leading-tight"
          placeholder="Tulis instruksi soal..." rows="1" ref="instructionTextarea"></textarea>
      </div>

      <!-- CONTENT SECTION (Source Text) -->
      <div class="ml-11 mb-2">
        <!-- TEST MODE: Read-only display -->
        <div v-if="isTestMode && node.attrs.content"
          class="p-4 rounded-xl bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)] text-base font-medium mb-2 relative">
          <p>{{ node.attrs.content }}</p>
        </div>

        <!-- ADMIN MODE: Editable Textarea -->
        <div v-if="!isTestMode"
          class="p-2 mb-2 rounded-xl bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)]/30 group focus-within:ring-2 focus-within:ring-[var(--color-primary)]/30 transition-all">
          <label class="block text-xs font-bold text-[var(--color-primary)] mb-1 px-1">Sumber / Kalimat Asal
            (Opsional):</label>
          <textarea :value="node.attrs.content || ''" @input="updateContent" @focus="onFocus"
            class="w-full text-base p-1 bg-transparent focus:outline-none placeholder-[var(--color-outline)] text-[var(--color-on-background)] resize-none overflow-hidden font-medium"
            placeholder="Tulis kalimat asli/sumber untuk referensi terjemahan..." rows="1"
            ref="contentTextarea"></textarea>
        </div>
      </div>

      <!-- QUESTION SECTION (Inti Pertanyaan) [NEW] -->
      <div class="ml-11 mb-4">
        <!-- ADMIN MODE -->
        <div v-if="!isTestMode" class="flex flex-col">
          <label class="block text-xs font-bold text-[var(--color-primary)] mb-1 px-1">Pertanyaan Inti:</label>
          <textarea :value="node.attrs.question || ''"
            @input="(e: Event) => { props.updateAttributes({ question: (e.target as HTMLTextAreaElement).value }); autoResizeTextarea(e.target); }"
            @focus="onFocus"
            class="w-full font-bold text-lg p-1 bg-transparent focus:outline-none placeholder-[var(--color-outline)] text-[var(--color-on-surface)] resize-none overflow-hidden"
            placeholder="Tulis pertanyaan inti (e.g. Terjemahkan kalimat ini)..." rows="1"></textarea>
        </div>
        <!-- TEST MODE -->
        <div v-else-if="node.attrs.question" class="w-full font-bold text-lg text-[var(--color-on-surface)] mb-2">
          {{ node.attrs.question }}
        </div>
      </div>

      <!-- HINT SECTION (Edit Mode) -->
      <div v-if="!isTestMode" class="ml-11 mb-4">
        <div
          class="p-2 rounded-xl bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)]/30">
          <label class="block text-xs font-bold text-[var(--color-primary)] mb-1 px-1">Petunjuk:</label>
          <textarea :value="node.attrs.hint || ''"
            @input="(e: Event) => { props.updateAttributes({ hint: (e.target as HTMLTextAreaElement).value }); autoResizeTextarea(e.target); }"
            @focus="onFocus"
            class="w-full text-sm p-1 bg-transparent focus:outline-none placeholder-[var(--color-outline)] text-[var(--color-on-surface-variant)] resize-none overflow-hidden"
            placeholder="Tulis petunjuk untuk membantu pengguna (opsional)..." rows="1" ref="hintTextarea"></textarea>
        </div>
      </div>

      <!-- HINT SECTION (Test Mode) -->
      <div v-if="isTestMode && hasHint" class="ml-11 mb-4">
        <button @click="showHint = !showHint"
          class="flex items-center gap-2 text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-fixed-dim)] transition-colors py-1 px-3 rounded-full bg-[var(--color-surface-container-high)]">
          <span class="material-symbols-outlined !text-sm">info</span>
          {{ showHint ? 'Sembunyikan Petunjuk' : 'Tampilkan Petunjuk' }}
        </button>
        <Transition name="fade-down">
          <div v-if="showHint"
            class="mt-2 p-3 rounded-xl bg-[var(--color-surface-container-high)] text-sm text-[var(--color-on-surface-variant)]">
            {{ node.attrs.hint }}
          </div>
        </Transition>
      </div>


      <div v-if="!isTestMode" class="space-y-4 ml-11">
        <div class="relative group">
          <textarea :value="node.attrs.sentence" @input="updateSentence" @keyup="autoResizeTextarea($event.target)"
            @focus="onFocus"
            class="w-full text-lg p-1 rounded-xl bg-[var(--color-surface-container-high)] focus:outline-none placeholder-[var(--color-outline)] text-[var(--color-on-background)] resize-none overflow-hidden focus:ring-2 focus:ring-[var(--color-primary)]/50 transition-shadow leading-relaxed min-h-[56px]"
            placeholder="Tulis kalimat di sini. Gunakan [kurung siku] untuk jawaban." rows="1"
            ref="sentenceTextarea"></textarea>
        </div>

        <div class="p-2 rounded-xl bg-[var(--color-surface-container-low)]">
          <div class="flex flex-wrap gap-2 items-center min-h-[28px]">
            <span
              class="text-xs font-bold text-[var(--color-on-surface-variant)] uppercase mr-2 select-none">Pengecoh:</span>
            <span v-for="(item, index) in safeDistractors" :key="'dist-' + index"
              class="text-sm flex items-center bg-[var(--color-surface-container-high)] text-[var(--color-on-background)] font-medium px-3 py-1 rounded-full border border-[var(--color-outline-variant)]">
              {{ item }}
              <button @click.stop="removeDistractor(index)"
                class="ml-1.5 text-[var(--color-outline)] hover:text-[var(--color-error)] flex items-center justify-center cursor-pointer"><span
                  class="material-symbols-outlined text-base">close</span></button>
            </span>
            <div class="flex items-center flex-grow min-w-[150px]">
              <input v-model="newDistractor" @keydown.enter.prevent="addDistractor" @focus="onFocus"
                placeholder="+ Tambah kata lain..."
                class="flex-grow bg-transparent text-sm focus:outline-none placeholder:text-[var(--color-primary)] text-[var(--color-on-background)] px-2 py-1 font-medium" />
              <button @click.stop="addDistractor" v-show="newDistractor.trim().length > 0"
                class="ml-2 w-6 h-6 flex items-center justify-center rounded-full text-[var(--color-primary)] hover:bg-[var(--color-primary-container)] transition-colors cursor-pointer"
                title="Tambahkan"><span class="material-symbols-outlined text-xl">check</span></button>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="space-y-6 ml-11">

        <div
          class="p-3 rounded-xl bg-[var(--color-surface-container-high)] transition-colors min-h-[50px] cursor-pointer border border-[var(--color-outline-variant)]/50"
          :class="{ 'bg-[var(--color-primary-container)]/30 ring-2 ring-[var(--color-primary)]/50': activeCapsule }"
          @dragover.prevent @drop.prevent="placeActiveCapsule('bank', -1)" @click="placeActiveCapsule('bank', -1)">
          <div class="flex flex-wrap gap-2 justify-center relative z-0">
            <div v-for="item in availableCapsules" :key="item.id"
              class="capsule-item cursor-grab text-base flex items-center bg-[var(--color-surface-container)] text-[var(--color-on-background)] font-medium px-4 py-1.5 rounded-full border border-[var(--color-outline-variant)]"
              :class="{
                'ring-2 ring-[var(--color-primary)] scale-105': activeCapsule?.capsule.id === item.id
              }" :data-capsule-id="item.id" draggable="true"
              @dragstart="startHolding(item, { type: 'bank', index: -1 })"
              @click.stop="handleCapsuleClick(item, { type: 'bank', index: -1 })">
              {{ item.text }}
            </div>
            <span v-if="availableCapsules.length === 0" class="text-sm text-[var(--color-outline)] italic">Semua opsi
              telah digunakan</span>
          </div>
        </div>

        <div
          class="text-lg leading-loose text-[var(--color-on-background)] bg-[var(--color-surface-container-low)] p-6 rounded-2xl shadow-inner border border-[var(--color-outline-variant)]/30 relative">
          <template v-for="(segment, idx) in parsedSegments" :key="idx">
            <span v-if="segment.type === 'text'" class="whitespace-pre-wrap">{{ segment.content }}</span>

            <span v-else
              class="inline-flex items-center justify-center min-w-[48px] h-[36px] mx-0.5 px-0.5 align-middle rounded-lg transition-all duration-200 cursor-pointer border-b-2 relative"
              :class="[
                isChecking ? getSlotClass(segment.index) : (activeCapsule ? 'bg-[var(--color-primary-container)]/20 border-[var(--color-primary)] border-dashed' : 'bg-[var(--color-surface-container-high)] border-[var(--color-outline-variant)]')
              ]" @dragover.prevent @drop.prevent="placeActiveCapsule('slot', segment.index)"
              @click.stop="placeActiveCapsule('slot', segment.index)">
              <!-- Correction Bubble (Floating Correction) -->
              <div v-if="isChecking && checkResults[segment.index] !== 'correct'"
                class="absolute -top-7 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                <Transition name="fade-down" appear>
                  <div
                    class="relative px-2 py-0.5 bg-[var(--color-success)] text-[var(--color-on-success)] text-[10px] font-bold rounded-md whitespace-nowrap after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-[var(--color-success)]">
                    {{ segment.answer }}
                  </div>
                </Transition>
              </div>

              <div v-if="userAnswers[segment.index]"
                class="capsule-item cursor-grab text-base flex items-center font-bold px-3 py-0.5 rounded-md w-full justify-center h-full"
                :class="[
                  getCapsuleClassInSlot(segment.index, userAnswers[segment.index]),
                  { 'ring-2 ring-[var(--color-primary)] scale-105 z-10 relative': activeCapsule?.capsule.id === userAnswers[segment.index].id }
                ]" :style="{ 'view-transition-name': `capsule-${userAnswers[segment.index].id}` }"
                :data-capsule-id="userAnswers[segment.index].id" draggable="true"
                @dragstart.stop="startHolding(userAnswers[segment.index], { type: 'slot', index: segment.index })"
                @click.stop="handleCapsuleClick(userAnswers[segment.index], { type: 'slot', index: segment.index })">
                {{ userAnswers[segment.index].text }}
              </div>
            </span>
          </template>
        </div>

      </div>
    </div>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import {
  computed,
  ref,
  watch,
  nextTick,
  onMounted,
  onUnmounted,
  reactive,
  inject,
  Transition,
  type Ref,
  type ComputedRef
} from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { api } from '@/utils/api';

const props = defineProps(nodeViewProps);

// --- INTERFACES ---
interface ExamContext {
  mode: 'admin' | 'public';
  feedbackType: 'immediate' | 'none';
}

interface MaterialContext {
  topic: string;
  sourceLang: string;
  targetLang: string;
  moduleId?: string | number;
  description?: string;
  learningObjectives?: string;
}

interface QuestionRegistry {
  register: (id: string, methods: any) => void;
  unregister: (id: string) => void;
}

interface Capsule {
  id: string;
  text: string;
}

interface Segment {
  type: 'text' | 'slot';
  content?: string;
  answer?: string;
  index?: number;
}

interface CapsuleSource {
  type: 'bank' | 'slot';
  index: number;
}

interface ActiveCapsule {
  capsule: Capsule;
  source: CapsuleSource;
}

interface CheckResults {
  [key: number]: 'correct' | 'incorrect' | 'empty';
}

// --- INJECT ---
const examContext = inject<ExamContext>('examContext', {
  mode: 'admin',
  feedbackType: 'immediate',
});
const materialContext = inject<Ref<MaterialContext>>('materialContext', ref({
  topic: 'General',
  sourceLang: 'id',
  targetLang: 'en',
}));
const registry = inject<QuestionRegistry | null>('questionRegistry', null);
const componentId = `rumpang-${Math.random().toString(36).substr(2, 9)}`;

// --- REFS DOM ---
const instructionTextarea = ref<HTMLTextAreaElement | null>(null);
const sentenceTextarea = ref<HTMLTextAreaElement | null>(null);
const hintTextarea = ref<HTMLTextAreaElement | null>(null);
const contentTextarea = ref<HTMLTextAreaElement | null>(null);

// --- STATE ---
const newDistractor = ref('');
const isTestMode = ref(false);
const isChecking = ref(false);
const checkResults = ref<CheckResults>({});
const scoreValue = ref(0);

const allCapsules = ref<Capsule[]>([]); // Bank kata
const userAnswers = ref<Record<number, Capsule>>({}); // { slotIndex: capsuleObject }
const activeCapsule = ref<ActiveCapsule | null>(null);
const isGenerating = ref(false);

const currentMode = ref('admin');
const feedbackType = ref<'immediate' | 'none'>('immediate');
const isAnimating = ref(false); // Throttle flag
const showHint = ref(false);

// --- AI GENERATE ---
const generateWithAI = async () => {
  if (isGenerating.value) return;

  const {
    moduleId,
    sourceLang,
    targetLang,
    topic,
    description,
    learningObjectives,
  } = materialContext.value;
  if (!moduleId || !sourceLang || !targetLang) {
    if (!moduleId)
      alert('Mohon simpan modul terlebih dahulu atau refresh halaman.');
    return;
  }

  isGenerating.value = true;
  try {
    const url = `/admin/${sourceLang}-${targetLang}/learn/lesson/${moduleId}/`;

    let contextOld = props.node.attrs.sentence || '';
    let contextStr = `Description: ${description || '-'}. Objectives: ${learningObjectives || '-'}.`;
    if (contextOld.length > 5)
      contextStr += `\nExisting Sentence: ${contextOld}`;

    const res = await api.patch(url, {
      ai_action: 'generate_question',
      question_type: 'soalRumpang',
      topic: topic || 'General',
      source_lang: sourceLang,
      target_lang: targetLang,
      additional_context: contextStr,
    });

    if (res.data && res.data.content) {
      let jsonStr = res.data.content;
      if (jsonStr.includes('```json'))
        jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
      else if (jsonStr.includes('```'))
        jsonStr = jsonStr.split('```')[1].trim();

      const data = JSON.parse(jsonStr);
      if (data.question) {
        props.updateAttributes({
          sentence: data.question,
          content: data.content || '',
          distractors: data.distractors || [],
        });
        nextTick(() => {
          autoResizeTextarea(sentenceTextarea.value);
          if (contentTextarea.value) autoResizeTextarea(contentTextarea.value);
        });
      }
    }
  } catch (e) {
    console.error('AI Error:', e);
  } finally {
    isGenerating.value = false;
  }
};

// --- HELPERS ---
const isComponentActive = computed(() => props.selected);
const hasHint = computed(() => (props.node.attrs.hint || '').trim().length > 0);

// SAFEGUARD: Pastikan distractors selalu array valid
const safeDistractors = computed<string[]>(() => {
  const d = props.node.attrs.distractors;
  if (!d) return [];
  if (Array.isArray(d)) {
    // Filter item yang bukan string atau terlalu pendek (karakter tunggal)
    return d.filter((item) => typeof item === 'string' && item.length >= 2);
  }
  // Jika string (belum di-parse), coba parse
  if (typeof d === 'string') {
    try {
      const parsed = JSON.parse(d);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (item: any) => typeof item === 'string' && item.length >= 2,
        );
      }
    } catch (e) {
      console.warn('[SoalRumpang] Failed to parse distractors string:', d);
    }
  }
  return [];
});

const autoResizeTextarea = (textarea: HTMLElement | null | EventTarget) => {
  const el = textarea as HTMLElement;
  if (!el || !el.style || isAnimating.value) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
};

const shuffleArray = <T>(array: T[]): T[] => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

// --- ANIMATION ENGINE (FLIP + HYBRID) ---
const captureCapsulePositions = () => {
  const positions = new Map<string, DOMRect>();
  document
    .querySelectorAll('.soalrumpang-wrapper [data-capsule-id]')
    .forEach((el) => {
      if (el instanceof HTMLElement && el.dataset.capsuleId) {
        positions.set(el.dataset.capsuleId, el.getBoundingClientRect());
      }
    });
  return positions;
};

const performFLIP = async (actionCallback: () => void) => {
  isAnimating.value = true;
  // 1. FIRST: Capture posisi
  const firstPositions = captureCapsulePositions();

  // 2. Action (DOM Update)
  actionCallback();
  await nextTick();

  // 3. LAST & INVERT
  document
    .querySelectorAll('.soalrumpang-wrapper [data-capsule-id]')
    .forEach((el) => {
      if (!(el instanceof HTMLElement)) return;
      const id = el.dataset.capsuleId;
      if (!id) return;

      const first = firstPositions.get(id);

      if (first) {
        const last = el.getBoundingClientRect();
        const dx = first.left - last.left;
        const dy = first.top - last.top;

        if (dx !== 0 || dy !== 0) {
          // Apply transform instan (Invert)
          el.style.transform = `translate(${dx}px, ${dy}px)`;
          el.style.transition = 'none';
          el.classList.add('is-moving'); // Z-index boost

          requestAnimationFrame(() => {
            // 4. PLAY
            el.style.transition =
              'transform 300ms cubic-bezier(0.2, 0.8, 0.2, 1)';
            el.style.transform = '';

            el.addEventListener(
              'transitionend',
              () => {
                el.style.transition = '';
                el.classList.remove('is-moving');
              },
              { once: true },
            );
          });
        }
      }
    });

  setTimeout(() => (isAnimating.value = false), 350);
};

// --- PARSING LOGIC ---
const parsedSegments = computed<Segment[]>(() => {
  const text = props.node.attrs.sentence || '';
  const regex = /\[(.*?)\]/g;
  let lastIndex = 0;
  const segments: Segment[] = [];
  let match;
  let slotIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: text.substring(lastIndex, match.index),
      });
    }
    segments.push({ type: 'slot', answer: match[1], index: slotIndex++ });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    segments.push({ type: 'text', content: text.substring(lastIndex) });
  }
  return segments;
});

const correctAnswersList = computed<string[]>(() => {
  return parsedSegments.value
    .filter((s) => s.type === 'slot' && s.answer)
    .map((s) => s.answer as string);
});

const questionNumber = computed(() => {
  if (typeof (props as any).getPos !== 'function') return 0;
  let q = 0;
  let f = false;
  props.editor.state.doc.content.forEach((n: any, o: number) => {
    if (f) return;
    if (n.type.name.startsWith('soal')) {
      q++;
      if (o === (props as any).getPos()) f = true;
    }
  });
  return q;
});

const isAnswered = computed(() => {
  return Object.keys(userAnswers.value).length > 0;
});

// --- POINTS CALCULATION ---
const totalQuestions = computed(() => {
  let count = 0;
  props.editor.state.doc.content.forEach((n: any) => {
    if (n.type.name.startsWith('soal')) count++;
  });
  return count || 1;
});

const pointsPerQuestion = computed(
  () => Math.round((100 / totalQuestions.value) * 10) / 10,
);
const earnedPoints = computed(
  () =>
    Math.round((scoreValue.value / 100) * pointsPerQuestion.value * 10) / 10,
);

// --- LOGIKA HITUNG SKOR ---
const calculateRawScore = () => {
  const slots = parsedSegments.value.filter((s) => s.type === 'slot');
  const totalSlots = slots.length;
  if (totalSlots === 0) return 100;

  let correctCount = 0;

  slots.forEach((slot) => {
    if (slot.index === undefined || !slot.answer) return;
    const userAnswer = userAnswers.value[slot.index];
    if (userAnswer) {
      const isCorrect =
        userAnswer.text.trim().toLowerCase() ===
        slot.answer.trim().toLowerCase();
      if (isCorrect) correctCount++;
    }
  });

  return Math.round((correctCount / totalSlots) * 100);
};

const generateCheckResults = () => {
  const results: CheckResults = {};
  const slots = parsedSegments.value.filter((s) => s.type === 'slot');

  slots.forEach((slot) => {
    if (slot.index === undefined || !slot.answer) return;
    const userAnswer = userAnswers.value[slot.index];
    if (!userAnswer) {
      results[slot.index] = 'empty';
    } else {
      const isCorrect =
        userAnswer.text.trim().toLowerCase() ===
        slot.answer.trim().toLowerCase();
      results[slot.index] = isCorrect ? 'correct' : 'incorrect';
    }
  });
  return results;
};

// --- INIT GAME ---
const initializeTest = () => {
  const corrects = correctAnswersList.value;
  const distracts = safeDistractors.value; // Gunakan safeDistractors yang sudah divalidasi
  const allWordsRaw = [...corrects, ...distracts];

  const seen = new Set();
  const uniqueWords = allWordsRaw.filter((word) => {
    const lower = word.toLowerCase();
    if (seen.has(lower)) return false;
    seen.add(lower);
    return true;
  });

  allCapsules.value = shuffleArray(
    uniqueWords.map((text, idx) => ({
      id: `word-${idx}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      text: text,
    })),
  );

  userAnswers.value = {};
  isChecking.value = false;
  checkResults.value = {};
  activeCapsule.value = null;
  scoreValue.value = 0;
};

// --- DRAG & DROP & CLICK LOGIC (UPDATED) ---
const availableCapsules = computed(() => {
  if (!allCapsules.value) return [];
  const usedIds = Object.values(userAnswers.value).map((c) => c.id);
  return allCapsules.value.filter((c) => !usedIds.includes(c.id));
});

const startHolding = (capsule: Capsule, source: CapsuleSource) => {
  activeCapsule.value = { capsule, source };
};

// LOGIKA SWAP STABIL DISINI
const handleCapsuleClick = (capsule: Capsule, clickedSource: CapsuleSource) => {
  if (isChecking.value) return;

  // 1. Jika tangan kosong -> Pegang
  if (!activeCapsule.value) {
    startHolding(capsule, clickedSource);
    return;
  }

  // 2. Jika klik diri sendiri -> Lepas
  if (activeCapsule.value.capsule.id === capsule.id) {
    activeCapsule.value = null;
    return;
  }

  // 3. TUKAR (SWAP) LANGSUNG
  const heldCapsule = activeCapsule.value.capsule;
  const heldSource = activeCapsule.value.source;

  // Jika pertukaran terjadi antar Slot (Kalimat berubah layout) -> View Transition
  if (heldSource.type === 'slot' && clickedSource.type === 'slot') {
    if ((document as any).startViewTransition) {
      (document as any).startViewTransition(() =>
        executeSwap(heldCapsule, heldSource, capsule, clickedSource),
      );
    } else {
      executeSwap(heldCapsule, heldSource, capsule, clickedSource);
    }
  } else {
    // Pertukaran melibatkan Bank (Bank ke Slot / Slot ke Bank) -> FLIP
    performFLIP(() => {
      executeSwap(heldCapsule, heldSource, capsule, clickedSource);
    });
  }
};

const placeActiveCapsule = (targetType: 'bank' | 'slot', targetIndex: number) => {
  if (!activeCapsule.value) return;
  if (isChecking.value) return;

  const { capsule, source } = activeCapsule.value;

  performFLIP(() => {
    executeMove(capsule, source, targetType, targetIndex);
  });
};

// Helper khusus untuk Swap 2 arah
const executeSwap = (capsule1: Capsule, source1: CapsuleSource, capsule2: Capsule, source2: CapsuleSource) => {
  // 1. Hapus kepemilikan lama
  if (source1.type === 'slot') delete userAnswers.value[source1.index];
  if (source2.type === 'slot') delete userAnswers.value[source2.index];

  // 2. Assign ke tempat baru
  // Note: Jika targetnya 'bank', kita cukup hapus dari userAnswers (otomatis kembali ke pool)

  if (source2.type === 'slot') {
    userAnswers.value[source2.index] = capsule1; // Held item ke Target
  }

  if (source1.type === 'slot') {
    userAnswers.value[source1.index] = capsule2; // Clicked item ke Source awal
  }

  activeCapsule.value = null;
  if (feedbackType.value === 'immediate') {
    isChecking.value = false;
    checkResults.value = {};
  }
};

const executeMove = (capsule: Capsule, source: CapsuleSource, targetType: 'bank' | 'slot', targetIndex: number) => {
  if (feedbackType.value === 'immediate') {
    isChecking.value = false;
    checkResults.value = {};
  }

  // 1. Remove from source (if slot)
  if (source.type === 'slot') {
    delete userAnswers.value[source.index];
  }

  // 2. Add to target
  if (targetType === 'slot') {
    if (userAnswers.value[targetIndex]) {
      // Jika target sudah ada isinya -> Replace (Item lama kembali ke bank)
      // Logika swap manual jika bukan trigger click
      delete userAnswers.value[targetIndex];
      userAnswers.value[targetIndex] = capsule;
    } else {
      // Fill empty slot
      userAnswers.value[targetIndex] = capsule;
    }
  }
  // Jika target == 'bank', cukup remove source (sudah dilakukan di langkah 1),
  // karena bank adalah computed property dari sisa item.

  activeCapsule.value = null;
  scoreValue.value = 0;
};

// --- API IMPLEMENTATION ---
const setMode = (mode: string, type = 'immediate') => {
  currentMode.value = mode;
  feedbackType.value = type as 'immediate' | 'none';
  if (mode === 'public') {
    isTestMode.value = true;
    isChecking.value = false;
    if (allCapsules.value.length === 0) initializeTest();
  } else {
    isTestMode.value = false;
    isChecking.value = false;
  }
};

const submit = () => {
  isChecking.value = true;
  checkResults.value = generateCheckResults();
  const finalScore = calculateRawScore();
  scoreValue.value = finalScore;
  const userAnswersText = parsedSegments.value
    .filter((s) => s.type === 'slot')
    .map((s) => (s.index !== undefined ? userAnswers.value[s.index]?.text || null : null));

  return {
    isAnswered: isAnswered.value,
    score: finalScore,
    maxScore: 100,
    userAnswer: userAnswersText,
  };
};

const reset = () => {
  if ((document as any).startViewTransition)
    (document as any).startViewTransition(() => initializeTest());
  else initializeTest();
};

const syncState = () => {
  if (examContext && examContext.mode) {
    setMode(examContext.mode, examContext.feedbackType);
  }
};

// --- HANDLERS MANUAL (Admin) ---
const toggleTestMode = () => {
  isTestMode.value = !isTestMode.value;
  if (isTestMode.value) {
    if ((document as any).startViewTransition)
      (document as any).startViewTransition(() => initializeTest());
    else initializeTest();
  }
};
const resetSoal = () => reset();
const toggleCheckMode = () => {
  isChecking.value = !isChecking.value;
  if (isChecking.value) {
    checkResults.value = generateCheckResults();
    scoreValue.value = calculateRawScore();
  }
};

// --- STYLE HELPERS ---
const getSlotClass = (index: number) => {
  if (!isChecking.value) return '';
  const res = checkResults.value[index];
  if (res === 'correct')
    return 'border-[var(--color-success)] bg-[var(--color-success-container)]';
  if (res === 'incorrect')
    return 'border-[var(--color-error)] bg-[var(--color-error-container)]';
  return 'border-[var(--color-success)] border-dashed bg-transparent opacity-80';
};

const getCapsuleClassInSlot = (index: number, capsule: Capsule) => {
  if (isChecking.value) {
    const res = checkResults.value[index];
    if (res === 'correct')
      return 'bg-[var(--color-success)] text-[var(--color-on-success)] font-bold';
    if (res === 'incorrect')
      return 'bg-[var(--color-error)] text-[var(--color-on-error)] font-bold';
  }
  return 'bg-[var(--color-primary)] text-[var(--color-on-primary)] font-bold transform scale-[1.02]';
};

// --- EDIT MODE HANDLERS ---
const onFocus = () => props.editor.commands.setNodeSelection(props.getPos());
const handleWrapperMousedown = (event: MouseEvent) => {
  if ((event.target as HTMLElement).closest('textarea, button, input')) return;
  event.preventDefault();
  props.editor.commands.setNodeSelection(props.getPos());
};
const hapusKomponen = () => props.deleteNode();
const updateInstruction = (event: Event) => {
  const val = (event.target as HTMLTextAreaElement).value;
  props.updateAttributes({ instruction: val });
  autoResizeTextarea(event.target);
};
const updateContent = (event: Event) => {
  const val = (event.target as HTMLTextAreaElement).value;
  props.updateAttributes({ content: val });
  autoResizeTextarea(event.target);
};
const updateSentence = (event: Event) => {
  const val = (event.target as HTMLTextAreaElement).value;
  props.updateAttributes({ sentence: val });
  autoResizeTextarea(event.target);
};
const addDistractor = () => {
  const val = newDistractor.value.trim();
  if (!val) return;
  const current = [...props.node.attrs.distractors];
  if (!current.includes(val))
    props.updateAttributes({ distractors: [...current, val] });
  newDistractor.value = '';
};
const removeDistractor = (idx: number) => {
  const current = [...props.node.attrs.distractors];
  current.splice(idx, 1);
  props.updateAttributes({ distractors: current });
};

// --- LIFECYCLE ---
onMounted(() => {
  if (registry && registry.register) {
    registry.register(componentId, {
      setMode,
      submit,
      reset,
      checkStatus: () => ({
        isAnswered: isAnswered.value,
        score: calculateRawScore(),
        maxScore: 100,
      }),
    });
  }
  syncState();
  nextTick(() => {
    autoResizeTextarea(sentenceTextarea.value);
    autoResizeTextarea(instructionTextarea.value);
    if (contentTextarea.value) autoResizeTextarea(contentTextarea.value);
  });
});
onUnmounted(() => {
  if (registry && registry.unregister) registry.unregister(componentId);
});
watch(
  examContext,
  (newVal) => {
    if (newVal && newVal.mode) setMode(newVal.mode, newVal.feedbackType);
  },
  { deep: true },
);
watch(
  () => props.node.attrs.sentence,
  () => {
    nextTick(() => autoResizeTextarea(sentenceTextarea.value));
  },
);
watch(
  () => props.node.attrs.instruction,
  () => {
    nextTick(() => autoResizeTextarea(instructionTextarea.value));
  },
);
watch(
  () => props.node.attrs.content,
  () => {
    nextTick(() => {
      if (contentTextarea.value) autoResizeTextarea(contentTextarea.value);
    });
  },
);

defineExpose({
  checkStatus: () => ({
    isAnswered: isAnswered.value,
    score: calculateRawScore(),
    maxScore: 100,
    userAnswer: Object.values(userAnswers.value).map((c) => c.text),
  }),
  setTestMode: (mode: boolean) => {
    if (isTestMode.value !== mode) toggleTestMode();
  },
  setCheckMode: (mode: boolean) => {
    if (isChecking.value !== mode) toggleCheckMode();
  },
  isTestMode,
  isChecking,
  setMode,
  submit,
  reset,
});
</script>

<style scoped>
/* Base Transition untuk Controls */
.button-list-move,
.button-list-enter-active,
.button-list-leave-active {
  transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.15s ease;
}

.button-list-enter-from,
.button-list-leave-to {
  opacity: 0;
  transform: translateX(10px);
}

.button-list-leave-active {
  position: absolute;
}

/* Kapsul Optimization */
.capsule-item {
  will-change: transform;
  transform: translateZ(0);
  transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.2s ease;
  position: relative;
}

.capsule-item.is-moving {
  z-index: 50 !important;
  pointer-events: none;
}

/* View Transition untuk Swap Besar & Reset */
@keyframes fade-in {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes fade-out {
  from {
    opacity: 1;
  }

  to {
    opacity: 0;
  }
}

::view-transition-group(capsule-*) {
  animation-duration: 350ms;
  animation-timing-function: cubic-bezier(0.2, 0.8, 0.2, 1);
}

::view-transition-old(capsule-*) {
  animation: 150ms ease-in both fade-out;
}

::view-transition-new(capsule-*) {
  animation: 250ms ease-out both fade-in;
}

/* Fade-down Transition for Hint */
.fade-down-enter-active,
.fade-down-leave-active {
  transition: all 0.3s ease-out;
  max-height: 200px;
}

.fade-down-enter-from,
.fade-down-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-10px);
}
</style>
