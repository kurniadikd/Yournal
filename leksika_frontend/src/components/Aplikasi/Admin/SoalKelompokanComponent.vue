<template>
  <node-view-wrapper as="div" class="my-6 soalkelompokan-wrapper">
    <div
      :class="{ 'ring-2 ring-[var(--color-primary)]': isComponentActive && !isTestMode }"
      class="relative bg-[var(--color-surface-container)] rounded-xl p-4 transition-colors duration-200"
      @mousedown="handleWrapperMousedown"
    >
      <div
        v-if="!isTestMode || (isTestMode && feedbackType === 'immediate')"
        :class="{ 'opacity-100': isComponentActive || isTestMode, 'opacity-0 pointer-events-none': !isComponentActive && !isTestMode }"
        class="absolute top-4 right-4 z-20 transition-opacity duration-200"
      >
        <TransitionGroup tag="div" name="button-list" class="flex items-center gap-2">
          <button
            v-if="!isTestMode || feedbackType === 'immediate'"
            key="play"
            @click.stop="toggleTestMode"
            :title="isTestMode ? 'Keluar Mode Uji' : 'Masuk Mode Uji'"
            class="w-7 h-7 flex items-center justify-center rounded-full transition-transform cursor-pointer"
            :class="isTestMode
              ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-sm'
              : 'text-[var(--color-primary)] hover:bg-[var(--color-primary-container)]'"
          >
            <span class="material-symbols-outlined text-lg">play_arrow</span>
          </button>
          
          <button
            v-if="isTestMode && feedbackType === 'immediate'"
            key="check"
            @click.stop="toggleCheckMode"
            title="Koreksi Jawaban"
            :disabled="!isAnswered" 
            class="w-7 h-7 flex items-center justify-center rounded-full transition-transform cursor-pointer"
            :class="[
              isChecking
                ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-sm'
                : 'text-[var(--color-primary)] hover:bg-[var(--color-primary-container)]',
              !isAnswered ? 'cursor-not-allowed opacity-70' : '' 
            ]"
          >
            <span class="material-symbols-outlined text-xl">check_circle</span>
          </button>

          <button
            v-if="!isTestMode"
            key="ai_gen"
            @click.stop="generateWithAI"
            class="w-7 h-7 flex items-center justify-center rounded-full text-[var(--color-primary)] hover:bg-[var(--color-primary-container)] transition-transform cursor-pointer"
            :class="{'opacity-50 cursor-wait': isGenerating}"
            :title="isGenerating ? 'Sedang membuat...' : 'Buat Soal dengan AI'"
          >
            <LoadingSpinner v-if="isGenerating" size="sm" color="primary" />
            <span v-else class="material-symbols-outlined text-xl">auto_awesome</span>
          </button>

          <button
            v-if="!isTestMode"
            key="delete"
            @click.stop="hapusKomponen"
            class="w-7 h-7 flex items-center justify-center rounded-full text-[var(--color-primary)] hover:text-[var(--color-error)] hover:bg-[var(--color-error-container)] transition-transform cursor-pointer"
            title="Hapus Soal"
          >
            <span class="material-symbols-outlined text-xl">close</span>
          </button>

          <button
            v-if="isTestMode && feedbackType === 'immediate'"
            key="reset"
            @click.stop="resetSoal"
            title="Reset Soal"
            class="w-7 h-7 flex items-center justify-center rounded-full text-[var(--color-primary)] hover:text-[var(--color-error)] hover:bg-[var(--color-surface-container-high)] transition-transform cursor-pointer"
          >
            <span class="material-symbols-outlined text-xl">refresh</span>
          </button>
        </TransitionGroup>
      </div>
      
      <div class="flex items-start mb-4">
        <div data-drag-handle class="pt-1 pr-4" :class="{ 'cursor-grab': !isTestMode }" style="touch-action: none;">
          <span class="w-7 h-7 flex items-center justify-center bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-full font-bold text-sm flex-shrink-0 shadow-sm">
            {{ questionNumber }}
          </span>
          <div v-if="isTestMode && isChecking" 
               class="text-xs font-bold mt-1 text-center"
               :class="scoreValue === 100 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'">
            {{ earnedPoints }} pts
          </div>
        </div>
        
        <div v-if="isTestMode" 
             class="w-full font-semibold text-lg p-1 bg-transparent text-[var(--color-on-background)] cursor-default select-text resize-none overflow-hidden"
        >
             {{ node.attrs.instruction }}
        </div>
        <textarea
          v-else
          :value="node.attrs.instruction"
          @input="(e: Event) => updateInstruction((e.target as HTMLTextAreaElement).value)"
          @focus="onFocus"
          class="w-full font-semibold text-lg p-1 bg-transparent focus:outline-none placeholder-[var(--color-outline)] text-[var(--color-on-background)] resize-none overflow-hidden"
          placeholder="Tulis instruksi soal..."
          rows="1"
          ref="instructionTextarea"
        ></textarea>
      </div>

      <!-- HINT SECTION (Edit Mode) -->
      <div v-if="!isTestMode" class="ml-11 mb-4">
        <div class="p-2 rounded-xl bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)]/30">
          <label class="block text-xs font-bold text-[var(--color-primary)] mb-1 px-1">Petunjuk:</label>
          <textarea
            :value="node.attrs.hint || ''"
            @input="(e: Event) => { props.updateAttributes({ hint: (e.target as HTMLTextAreaElement).value }); autoResizeTextarea(e.target); }"
            @focus="onFocus"
            class="w-full text-sm p-1 bg-transparent focus:outline-none placeholder-[var(--color-outline)] text-[var(--color-on-surface-variant)] resize-none overflow-hidden"
            placeholder="Tulis petunjuk untuk membantu pengguna (opsional)..."
            rows="1"
            ref="hintTextarea"
          ></textarea>
        </div>
      </div>

      <!-- HINT SECTION (Test Mode) -->
      <div v-if="isTestMode && hasHint" class="ml-11 mb-4">
          <button 
              @click="showHint = !showHint" 
              class="flex items-center gap-2 text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-fixed-dim)] transition-colors py-1 px-3 rounded-full bg-[var(--color-surface-container-high)] shadow-sm"
          >
              <span class="material-symbols-outlined !text-sm">info</span>
              {{ showHint ? 'Sembunyikan Petunjuk' : 'Tampilkan Petunjuk' }}
          </button>
          <Transition name="fade-down">
              <div v-if="showHint" class="mt-2 p-3 rounded-xl bg-[var(--color-surface-container-high)] text-sm text-[var(--color-on-surface-variant)]">
                  {{ node.attrs.hint }}
              </div>
          </Transition>
      </div>
      <div v-if="!isTestMode" class="space-y-4 ml-11">
        <div class="mb-4">
          <div class="p-2 rounded-xl bg-[var(--color-surface-container-low)]">
            <div class="flex flex-wrap gap-2 items-center min-h-[28px]">
              <span v-for="(item, index) in props.node.attrs.word_bank" :key="'bank-'+index" 
                    class="text-sm flex items-center bg-[var(--color-surface-container-high)] text-[var(--color-on-background)] font-medium px-3 py-1 rounded-full border border-[var(--color-outline-variant)]"
              >
                {{ item }}
                <button @click.stop="removeWordBankItem(index as number)" class="ml-1.5 text-[var(--color-outline)] hover:text-[var(--color-error)] flex items-center justify-center cursor-pointer"><span class="material-symbols-outlined text-base">close</span></button>
              </span>
              <div class="flex items-center flex-grow min-w-[240px]">
                <textarea ref="wordBankTextarea" v-model="newWordBankItem" @keydown.enter.prevent="addWordBankItem" @input="(e: Event) => autoResizeTextarea(e.target)" @focus="onFocus" placeholder="Tambahkan item non-jawaban di sini..." rows="1" class="flex-grow bg-transparent text-sm focus:outline-none resize-none overflow-hidden placeholder:text-[var(--color-outline)] text-[var(--color-on-background)]"></textarea>
                <button @click.stop="addWordBankItem" v-show="isComponentActive && newWordBankItem.trim().length > 0" class="ml-2 w-6 h-6 flex items-center justify-center rounded-full text-[var(--color-primary)] hover:bg-[var(--color-primary-container)] transition-colors cursor-pointer" title="Tambahkan Item"><span class="material-symbols-outlined text-xl">check</span></button>
              </div>
            </div>
          </div>
        </div>
        <div class="space-y-4">
          <div v-for="(pair, pairIndex) in props.node.attrs.pairs" :key="'pair-'+pairIndex" class="relative bg-[var(--color-surface-container-high)] p-4 rounded-lg">
            <button v-if="props.node.attrs.pairs.length > 1" @click.stop="removePair(pairIndex as number)" :class="['absolute top-3 right-3 z-10 w-6 h-6 flex items-center justify-center rounded-full text-[var(--color-outline)] hover:text-[var(--color-error)] hover:bg-[var(--color-surface-container)] transition-all cursor-pointer', isComponentActive ? 'opacity-100' : 'opacity-0 pointer-events-none']" title="Hapus Baris Soal Ini"><span class="material-symbols-outlined text-lg">delete</span></button>
            <div class="flex items-start">
              <div class="pt-1 pr-4"><span class="w-7 h-7 flex items-center justify-center bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-full font-bold text-sm flex-shrink-0">{{ String.fromCharCode(97 + (pairIndex as number)) }}</span></div>
              <textarea :value="pair.question" @input="(e: Event) => updatePairQuestion((pairIndex as number), (e.target as HTMLTextAreaElement).value)" @focus="onFocus" class="w-full font-semibold text-lg p-1 bg-transparent focus:outline-none placeholder-[var(--color-outline)] text-[var(--color-on-background)] resize-none overflow-hidden" placeholder="Tulis pertanyaan di sini..." rows="1" :ref="el => questionTextareas[pairIndex as number] = (el as HTMLTextAreaElement)"></textarea>
            </div>
            <div class="ml-11 mt-2">
              <div class="relative w-full p-2 rounded-xl bg-[var(--color-surface-container-low)] flex flex-wrap gap-1 min-h-[44px] items-center">
                <div class="absolute -left-11 top-3 w-7 h-7 flex items-center justify-center"><span class="material-symbols-outlined text-xl text-[var(--color-primary)]">check_circle</span></div>
                  <span v-for="(answer, answerIndex) in pair.correct_answers" :key="'ans-'+pairIndex+'-'+answerIndex" 
                       class="text-sm flex items-center bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] font-medium px-4 py-0.5 rounded-full shadow-sm"
                >
                  {{ answer }}
                  <button @click.stop="removeAnswer((pairIndex as number), (answerIndex as number))" class="ml-1.5 text-[var(--color-on-primary-container)] hover:text-[var(--color-error)] hover:bg-[var(--color-primary-fixed-dim)]/50 flex items-center justify-center cursor-pointer" title="Hapus jawaban"><span class="material-symbols-outlined text-base">close</span></button>
                </span>
                <div class="flex items-center flex-grow min-w-[120px]">
                  <textarea :ref="el => answerTextareas[pairIndex as number] = (el as HTMLTextAreaElement)" v-model="newAnswers[pairIndex as number]" @keydown.enter.prevent="addAnswer(pairIndex as number)" @input="handleInput(pairIndex as number)" @focus="onFocus" placeholder="Tambahkan item jawaban di sini..." rows="1" class="flex-grow bg-transparent text-sm focus:outline-none resize-none overflow-hidden placeholder:text-[var(--color-outline)] text-[var(--color-on-background)]"></textarea>
                  <button @click.stop="addAnswer(pairIndex as number)" v-show="isComponentActive && newAnswers[pairIndex as number]?.trim().length > 0" class="ml-2 w-6 h-6 flex items-center justify-center rounded-full text-[var(--color-primary)] hover:bg-[var(--color-primary-container)] transition-colors cursor-pointer" title="Tambahkan Jawaban"><span class="material-symbols-outlined text-xl">check</span></button>
                </div>
              </div>
            </div>
          </div>
          <div class="flex items-center w-full pt-2">
            <button @click.stop="addPair" class="w-full text-sm text-center text-[var(--color-outline)] hover:text-[var(--color-primary)] bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-container-highest)] rounded-lg py-2 transition-colors duration-200 cursor-pointer">+ Tambah Baris Soal</button>
          </div>
        </div>
      </div>

      <div v-else class="space-y-6 ml-11">
        
        <div 
          class="p-3 rounded-xl transition-all duration-200 min-h-[50px] cursor-pointer border border-[var(--color-outline-variant)]/50"
          :class="[
            activeCapsule 
              ? 'ring-2 ring-[var(--color-primary)]/40 bg-[var(--color-surface-container-highest)]' 
              : 'bg-[var(--color-surface-container-high)]'
          ]"
          @dragover.prevent @drop.prevent="placeActiveCapsule('bank', -1)" @click="placeActiveCapsule('bank', -1)"
        >
          <div class="flex flex-wrap gap-2 justify-center relative z-0">
            <div v-for="item in availableCapsules" :key="item.id" 
              class="capsule-item cursor-grab text-base flex items-center bg-[var(--color-surface-container)] text-[var(--color-on-background)] font-medium px-4 py-1.5 rounded-full shadow-sm hover:shadow-md border border-[var(--color-outline-variant)]" 
              :class="{ 
                'ring-2 ring-[var(--color-primary)] scale-105 shadow-lg': activeCapsule?.capsule.id === item.id 
              }" 
              :data-capsule-id="item.id"
              draggable="true"
              @dragstart="startHolding(item, { index: -1, pos: -1 })"
              @click.stop="handleCapsuleClick(item, { index: -1, pos: -1 })">
              {{ item.text }}
            </div>
            <span v-if="availableCapsules.length === 0" class="text-sm text-[var(--color-outline)] italic">Semua opsi telah digunakan</span>
          </div>
        </div>

        <div class="space-y-4">
          <div v-for="(pair, pairIndex) in props.node.attrs.pairs" :key="'uji-'+pairIndex" class="relative bg-[var(--color-surface-container-high)] p-4 rounded-lg">
            <div class="flex items-start">
              <div class="pt-1 pr-4"><span class="w-7 h-7 flex items-center justify-center bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-full font-bold text-sm flex-shrink-0">{{ String.fromCharCode(97 + (pairIndex as number)) }}</span></div>
              
              <div class="w-full font-semibold text-lg p-1 bg-transparent text-[var(--color-on-background)] resize-none overflow-hidden cursor-default">
                  {{ pair.question }}
              </div>
            </div>
            
            <div class="ml-11 mt-2">
              <div 
                class="relative w-full p-2 rounded-xl flex flex-wrap gap-2 min-h-[44px] items-center transition-all duration-200 cursor-pointer"
                :class="[
                  activeCapsule 
                    ? 'ring-2 ring-[var(--color-primary)]/50 bg-[var(--color-surface-container-highest)]' 
                    : 'bg-[var(--color-surface-container-low)]'
                ]"
                @dragover.prevent @drop.prevent="placeActiveCapsule('slot', pairIndex as number)" @click="placeActiveCapsule('slot', pairIndex as number)"
              >
                <div class="flex flex-wrap gap-2 items-center relative z-0">
                    <div v-for="(capsule, capsuleIndex) in ujiJawaban[pairIndex as number]" :key="capsule.id" 
                    class="capsule-item cursor-grab text-sm flex items-center font-bold px-4 py-1.5 rounded-full shadow-md scale-[1.01]" 
                    :class="[
                      {'ring-2 ring-[var(--color-primary)] scale-105 z-10': activeCapsule?.capsule.id === capsule.id},
                      isChecking && checkResults[capsule.id] === 'correct' ? 'bg-[var(--color-success)] text-[var(--color-on-success)]' : 
                      isChecking && checkResults[capsule.id] === 'incorrect' ? 'bg-[var(--color-error)] text-[var(--color-on-error)]' :
                      'bg-[var(--color-primary)] text-[var(--color-on-primary)]' 
                    ]"
                    :style="{ 'view-transition-name': `capsule-${capsule.id}` }"
                    :data-capsule-id="capsule.id"
                    draggable="true"
                    @dragstart.stop="startHolding(capsule, { index: (pairIndex as number), pos: (capsuleIndex as number) })"
                    @click.stop="handleCapsuleClick(capsule, { index: (pairIndex as number), pos: (capsuleIndex as number) })">
                    {{ capsule.text }}
                  </div>
                </div>
                
                <span v-if="!ujiJawaban[pairIndex as number] || ujiJawaban[pairIndex as number].length === 0" class="text-sm text-[var(--color-outline)] p-1 select-none pointer-events-none">
                  Tempatkan jawaban di sini...
                </span>
              </div>
            </div>
          </div>
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

interface CapsuleSource {
  index: number;
  pos?: number;
}

interface ActiveCapsule {
  capsule: Capsule;
  source: CapsuleSource;
}

interface CheckResults {
  [key: string]: 'correct' | 'incorrect';
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
const componentId = `kelompokan-${Math.random().toString(36).substr(2, 9)}`;

// --- REFS ---
const instructionTextarea = ref<HTMLTextAreaElement | null>(null);
const wordBankTextarea = ref<HTMLTextAreaElement | null>(null);
const newWordBankItem = ref('');
const questionTextareas = reactive<Record<number, HTMLTextAreaElement | null>>({});
const answerTextareas = reactive<Record<number, HTMLTextAreaElement | null>>({});
const newAnswers = ref<string[]>([]);
const hintTextarea = ref<HTMLTextAreaElement | null>(null);

// --- STATE ---
const isTestMode = ref(false);
const isChecking = ref(false);
const checkResults = ref<CheckResults>({});
const scoreValue = ref(0);

const allCapsules = ref<Capsule[]>([]);
const ujiJawaban = ref<Capsule[][]>([]);
const activeCapsule = ref<ActiveCapsule | null>(null);
const isGenerating = ref(false);

const currentMode = ref('admin');
const feedbackType = ref<'immediate' | 'none'>('immediate');
const isAnimating = ref(false);
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

    let contextStr = `Description: ${description || '-'}. Objectives: ${learningObjectives || '-'}.`;

    const res = await api.patch(url, {
      ai_action: 'generate_question',
      question_type: 'soalKelompokan',
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
      if (Array.isArray(data.pairs)) {
        // Normalize pairs
        const pairs = data.pairs.map((p: any) => ({
          question: p.left || p.question,
          correct_answers: [p.right || p.answer],
        }));
        props.updateAttributes({
          pairs: pairs,
          word_bank: data.word_bank || [],
        });
        nextTick(() => {
          document
            .querySelectorAll('textarea')
            .forEach((el) => autoResizeTextarea(el));
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

const autoResizeTextarea = (textarea: HTMLElement | Element | EventTarget | null) => {
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

const allExistingWords = computed<Set<string>>(() => {
  const bank = (props.node.attrs.word_bank || []) as string[];
  const answers = ((props.node.attrs.pairs || []) as any[]).flatMap(
    (p) => (p.correct_answers || []) as string[],
  );
  const uniqueMap = new Map();
  [...bank, ...answers].forEach((word) => {
    uniqueMap.set(word.toLowerCase(), word);
  });
  return new Set(uniqueMap.values());
});

const isAnswered = computed(() => {
  if (!ujiJawaban.value || !Array.isArray(ujiJawaban.value)) return false;
  return ujiJawaban.value.some(
    (slot) => Array.isArray(slot) && slot.length > 0,
  );
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

// --- SCORING LOGIC ---
const calculateRawScore = () => {
  let correctPlacedCapsules = 0;
  let incorrectPlacedCapsules = 0;
  let totalCorrectAnswers = 0;

  (props.node.attrs.pairs as any[]).forEach((pair, pairIndex) => {
    const correctAnswers = ((pair.correct_answers || []) as string[]).map((a) =>
      a.toLowerCase().trim(),
    );
    totalCorrectAnswers += correctAnswers.length;

    const placedCapsules = ujiJawaban.value[pairIndex] || [];

    placedCapsules.forEach((capsule) => {
      const capsuleTextLower = capsule.text.toLowerCase().trim();
      if (correctAnswers.includes(capsuleTextLower)) {
        correctPlacedCapsules++;
      } else {
        incorrectPlacedCapsules++;
      }
    });
  });

  if (totalCorrectAnswers === 0) return 100;
  const netScore = correctPlacedCapsules - incorrectPlacedCapsules;
  const finalScore = Math.max(0, netScore);
  return Math.round((finalScore / totalCorrectAnswers) * 100);
};

const generateCheckResults = () => {
  const results: CheckResults = {};
  (props.node.attrs.pairs as any[]).forEach((pair, pairIndex) => {
    const placedCapsules = ujiJawaban.value[pairIndex] || [];
    const correctAnswersForThisPair = new Set(
      ((pair.correct_answers || []) as string[]).map((a) => a.toLowerCase().trim()),
    );

    placedCapsules.forEach((capsule) => {
      results[capsule.id] = correctAnswersForThisPair.has(
        capsule.text.toLowerCase().trim(),
      )
        ? 'correct'
        : 'incorrect';
    });
  });
  return results;
};

// --- INIT GAME ---
const initializeTest = () => {
  const bank = (props.node.attrs.word_bank || []) as string[];
  const correctAnswers = ((props.node.attrs.pairs || []) as any[]).flatMap(
    (p) => (p.correct_answers || []) as string[],
  );
  const combinedItems = [...correctAnswers, ...bank];

  allCapsules.value = shuffleArray(
    combinedItems.map((text, index) => ({
      text,
      id: `caps-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    })),
  );

  const pairCount = props.node.attrs.pairs?.length || 0;
  // [PERBAIKAN] Pastikan ujiJawaban benar-benar kosong di awal
  ujiJawaban.value = Array(pairCount)
    .fill(0)
    .map(() => []);

  activeCapsule.value = null;
  isChecking.value = false;
  checkResults.value = {};
  scoreValue.value = 0;
};

// --- ANIMATION (FLIP) ---
const captureCapsulePositions = () => {
  const positions = new Map<string, DOMRect>();
  document
    .querySelectorAll('.soalkelompokan-wrapper [data-capsule-id]')
    .forEach((el) => {
      if (el instanceof HTMLElement && el.dataset.capsuleId) {
        positions.set(el.dataset.capsuleId, el.getBoundingClientRect());
      }
    });
  return positions;
};

const performFLIP = async (actionCallback: () => void) => {
  isAnimating.value = true;
  const firstPositions = captureCapsulePositions();

  actionCallback();
  await nextTick();

  document
    .querySelectorAll('.soalkelompokan-wrapper [data-capsule-id]')
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
          el.style.transform = `translate(${dx}px, ${dy}px)`;
          el.style.transition = 'none';
          el.classList.add('is-moving');

          requestAnimationFrame(() => {
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

// --- INTERACTION ---
const availableCapsules = computed(() => {
  if (!allCapsules.value) return [];
  const usedIds = ujiJawaban.value.flat().map((c) => c.id);
  return allCapsules.value.filter((c) => !usedIds.includes(c.id));
});

const startHolding = (capsule: Capsule, source: CapsuleSource) => {
  activeCapsule.value = { capsule, source };
};

const handleCapsuleClick = (capsule: Capsule, clickedSource: CapsuleSource) => {
  if (isChecking.value) return;

  if (!activeCapsule.value) {
    startHolding(capsule, clickedSource);
    return;
  }

  if (activeCapsule.value.capsule.id === capsule.id) {
    activeCapsule.value = null;
    return;
  }

  const heldCapsule = activeCapsule.value.capsule;
  const heldSource = activeCapsule.value.source;
  const isMacroSwap = heldSource.index > -1 && clickedSource.index > -1;

  if (isMacroSwap) {
    if ((document as any).startViewTransition) {
      (document as any).startViewTransition(() =>
        executeSwap(heldCapsule, heldSource, capsule, clickedSource),
      );
    } else {
      executeSwap(heldCapsule, heldSource, capsule, clickedSource);
    }
  } else {
    performFLIP(() => {
      executeSwap(heldCapsule, heldSource, capsule, clickedSource);
    });
  }
};

const executeSwap = (capsule1: Capsule, source1: CapsuleSource, capsule2: Capsule, source2: CapsuleSource) => {
  if (source1.index > -1) {
    ujiJawaban.value[source1.index] = ujiJawaban.value[source1.index].filter(
      (c) => c.id !== capsule1.id,
    );
  }
  if (source2.index > -1) {
    ujiJawaban.value[source2.index] = ujiJawaban.value[source2.index].filter(
      (c) => c.id !== capsule2.id,
    );
  }

  if (source2.index > -1) {
    ujiJawaban.value[source2.index].push(capsule1);
  }
  if (source1.index > -1) {
    ujiJawaban.value[source1.index].push(capsule2);
  }

  activeCapsule.value = null;
  if (feedbackType.value === 'immediate') {
    isChecking.value = false;
    checkResults.value = {};
  }
};

const executeMove = (capsule: Capsule, source: CapsuleSource, targetIndex: number) => {
  if (feedbackType.value === 'immediate') {
    isChecking.value = false;
    checkResults.value = {};
  }
  if (source.index > -1) {
    const sourceSlot = ujiJawaban.value[source.index];
    const idx = sourceSlot.findIndex((c) => c.id === capsule.id);
    if (idx > -1) sourceSlot.splice(idx, 1);
  }
  if (targetIndex > -1) {
    if (!ujiJawaban.value[targetIndex]) ujiJawaban.value[targetIndex] = [];
    ujiJawaban.value[targetIndex].push(capsule);
  }
  activeCapsule.value = null;
};

const placeActiveCapsule = (targetType: string, targetIndex: number) => {
  if (!activeCapsule.value) return;
  if (isChecking.value) return;
  const { capsule, source } = activeCapsule.value;
  performFLIP(() => {
    executeMove(capsule, source, targetIndex);
  });
};

// --- API ---
const setMode = (mode: string, type = 'immediate') => {
  // Prevent re-initialization loop
  if (currentMode.value === mode && feedbackType.value === type) return;

  currentMode.value = mode;
  feedbackType.value = type as 'immediate' | 'none';
  if (mode === 'public') {
    isTestMode.value = true;
    isChecking.value = false;
    // Only init if needed
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
  const userAnswerText = ujiJawaban.value.map((slot) =>
    slot.map((c) => c.text),
  );
  return {
    isAnswered: isAnswered.value,
    score: finalScore,
    maxScore: 100,
    userAnswer: userAnswerText,
  };
};

const reset = () => {
  if ((document as any).startViewTransition)
    (document as any).startViewTransition(() => initializeTest());
  else initializeTest();
};

const syncState = () => {
  if (examContext && examContext.mode)
    setMode(examContext.mode, examContext.feedbackType);
};

// --- ADMIN HANDLERS ---
const onFocus = () => props.editor.commands.setNodeSelection(props.getPos());
const handleWrapperMousedown = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  if (target.closest('textarea, button, input')) return;
  event.preventDefault();
  props.editor.commands.setNodeSelection(props.getPos());
};
const hapusKomponen = () => props.deleteNode();
const updateInstruction = (val: string) => {
  props.updateAttributes({ instruction: val });
};
const addWordBankItem = () => {
  const item = newWordBankItem.value.trim();
  if (!item || allExistingWords.value.has(item)) {
    newWordBankItem.value = '';
    return;
  }
  props.updateAttributes({
    word_bank: [...(props.node.attrs.word_bank || []), item],
  });
  newWordBankItem.value = '';
  nextTick(() => autoResizeTextarea(wordBankTextarea.value));
};
const removeWordBankItem = (idx: number) => {
  const c = [...(props.node.attrs.word_bank || [])];
  c.splice(idx, 1);
  props.updateAttributes({ word_bank: c });
};
const updatePairs = (val: any[]) => {
  props.updateAttributes({ pairs: val });
};
const addPair = () => {
  const c = [...(props.node.attrs.pairs || [])];
  c.push({ question: 'Pertanyaan...', correct_answers: [] });
  updatePairs(c);
};
const removePair = (idx: number) => {
  const c = [...(props.node.attrs.pairs || [])];
  if (c.length <= 1) return;
  c.splice(idx, 1);
  updatePairs(c);
};
const updatePairQuestion = (idx: number, val: string) => {
  const c = [...(props.node.attrs.pairs || [])];
  if (c[idx]) {
    c[idx].question = val;
    updatePairs(c);
  }
};
const addAnswer = (idx: number) => {
  const val = newAnswers.value[idx]?.trim();
  if (!val || allExistingWords.value.has(val)) {
    newAnswers.value[idx] = '';
    return;
  }
  const c = [...(props.node.attrs.pairs || [])];
  if (c[idx]) {
    c[idx].correct_answers.push(val);
    updatePairs(c);
  }
  newAnswers.value[idx] = '';
};
const removeAnswer = (pIdx: number, aIdx: number) => {
  const c = [...(props.node.attrs.pairs || [])];
  if (c[pIdx]) {
    c[pIdx].correct_answers.splice(aIdx, 1);
    updatePairs(c);
  }
};
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
const handleInput = (idx: number) => nextTick(() => autoResizeTextarea(answerTextareas[idx]));

const toggleTestMode = () => {
  isTestMode.value = !isTestMode.value;
  if (isTestMode.value) {
    if ((document as any).startViewTransition)
      (document as any).startViewTransition(() => initializeTest());
    else initializeTest();
  } else {
    activeCapsule.value = null;
    isChecking.value = false;
    checkResults.value = {};
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

// --- LIFECYCLE ---
onMounted(() => {
  const pairCount = props.node.attrs.pairs?.length || 0;
  newAnswers.value = Array(pairCount).fill('');

  // Pastikan inisialisasi awal bersih
  if (ujiJawaban.value.length !== pairCount)
    ujiJawaban.value = Array(pairCount)
      .fill(0)
      .map(() => []);

  nextTick(() => {
    document
      .querySelectorAll('textarea')
      .forEach((el) => autoResizeTextarea(el));
  });

  if (registry && registry.register) {
    registry.register(componentId, {
      setMode,
      submit,
      reset,
      checkStatus: () => ({
        isAnswered: isAnswered.value,
        score: calculateRawScore(),
        maxScore: 100,
        // PERBAIKAN: Jika belum dijawab, kirim array kosong agar Parent tidak salah hitung
        userAnswer: isAnswered.value
          ? ujiJawaban.value.map((c) =>
              c && c.length > 0 ? c.map((x) => x.text) : [],
            )
          : [],
      }),
    });
  }
  syncState();
});

onUnmounted(() => {
  if (registry && registry.unregister) registry.unregister(componentId);
});

watch(
  () => props.node.attrs,
  () => {
    const pairCount = props.node.attrs.pairs?.length || 0;
    newAnswers.value = Array(pairCount).fill('');
    if (ujiJawaban.value.length !== pairCount)
      ujiJawaban.value = Array(pairCount)
        .fill(0)
        .map(() => []);
    nextTick(() => {
      document
        .querySelectorAll('textarea')
        .forEach((el) => autoResizeTextarea(el));
    });
  },
  { deep: true },
);

watch(
  examContext,
  (newVal) => {
    if (newVal && newVal.mode) setMode(newVal.mode, newVal.feedbackType);
  },
  { deep: true },
);

defineExpose({
  checkStatus: () => ({
    isAnswered: isAnswered.value,
    score: calculateRawScore(),
    maxScore: 100,
    userAnswer: isAnswered.value
      ? ujiJawaban.value.map((c) =>
          c && c.length > 0 ? c.map((x) => x.text) : [],
        )
      : [],
  }),
  setTestMode: (val: boolean) => {
    if (isTestMode.value !== val) toggleTestMode();
  },
  setCheckMode: (val: boolean) => {
    if (isChecking.value !== val) toggleCheckMode();
  },
  isTestMode,
  isChecking,
  setMode,
  submit,
  reset,
});
</script>

<style scoped>
.button-list-move, .button-list-enter-active, .button-list-leave-active { transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.15s ease; }
.button-list-enter-from, .button-list-leave-to { opacity: 0; transform: translateX(10px); }
.button-list-leave-active { position: absolute; }
.capsule-item { will-change: transform; transform: translateZ(0); transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.2s ease; position: relative; }
.capsule-item.is-moving { z-index: 50 !important; pointer-events: none; }
@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes fade-out { from { opacity: 1; } to { opacity: 0; } }
::view-transition-group(capsule-*) { animation-duration: 350ms; animation-timing-function: cubic-bezier(0.2, 0.8, 0.2, 1); }
::view-transition-old(capsule-*) { animation: 150ms ease-in both fade-out; }
::view-transition-new(capsule-*) { animation: 250ms ease-out both fade-in; }

/* Fade-down Transition for Hint */
.fade-down-enter-active, .fade-down-leave-active { transition: all 0.3s ease-out; max-height: 200px; }
.fade-down-enter-from, .fade-down-leave-to { opacity: 0; max-height: 0; transform: translateY(-10px); }
</style>
