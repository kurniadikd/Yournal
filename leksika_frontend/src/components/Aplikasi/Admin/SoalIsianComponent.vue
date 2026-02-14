<template>
  <node-view-wrapper as="div" class="my-6">
    <div
      :class="{ 'ring-2 ring-[var(--color-primary)]': iCA && !tM }"
      class="relative bg-[var(--color-surface-container)] rounded-xl p-4 transition-all duration-200"
       @mousedown.stop="hWM"
    >
      <div
        v-if="!tM || (tM && feedbackType === 'immediate')"
        :class="{ 'opacity-100': iCA || tM, 'opacity-0 pointer-events-none': !iCA && !tM }"
        class="absolute top-4 right-4 z-20 transition-opacity duration-200"
      >
        <TransitionGroup tag="div" name="button-list" class="flex items-center gap-2">
           <button
            key="play"
            @click.stop="tTM"
            :title="tM ? 'Keluar Mode Uji' : 'Masuk Mode Uji'"
            class="w-7 h-7 flex items-center justify-center rounded-full transition-all cursor-pointer"
            :class="tM ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-sm' : 'text-[var(--color-primary)] hover:bg-[var(--color-primary-container)]'"
          >
            <span class="material-symbols-outlined text-lg">play_arrow</span>
          </button>
          
          <button
            v-if="tM && feedbackType === 'immediate'"
            key="check"
            @click.stop="cA"
            :title="p.node.attrs.is_ai_enabled ? 'Koreksi dengan AI' : 'Koreksi Jawaban'"
            :disabled="isChecking"
            class="w-7 h-7 flex items-center justify-center rounded-full transition-all cursor-pointer"
            :class="[
              isChecking ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-sm animate-pulse' : 'text-[var(--color-primary)] hover:bg-[var(--color-primary-container)]',
              isChecking ? 'cursor-not-allowed opacity-70' : ''
            ]"
          >
            <LoadingSpinner v-if="isChecking" size="sm" color="on-primary" />
            <span v-else class="material-symbols-outlined text-xl">check_circle</span>
          </button>

          <button
            v-if="!tM"
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
            v-if="!tM"
            key="delete"
            @click.stop="p.deleteNode"
            class="w-7 h-7 flex items-center justify-center rounded-full text-[var(--color-primary)] hover:text-[var(--color-error)] hover:bg-[var(--color-error-container)] transition-all cursor-pointer"
            title="Hapus Soal"
          >
            <span class="material-symbols-outlined text-xl">close</span>
          </button>

          <button
            v-if="tM && feedbackType === 'immediate'"
            key="reset"
            @click.stop="rS"
            title="Reset Soal"
            class="w-7 h-7 flex items-center justify-center rounded-full text-[var(--color-primary)] hover:text-[var(--color-error)] hover:bg-[var(--color-surface-container-high)] transition-all cursor-pointer"
          >
            <span class="material-symbols-outlined text-xl">refresh</span>
          </button>
        </TransitionGroup>
      </div>

      <div class="flex items-start">
        <div data-drag-handle class="pt-1 pr-4 cursor-grab" style="touch-action: none;">
          <span class="w-7 h-7 flex items-center justify-center bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-full font-bold text-sm flex-shrink-0 shadow-sm">
            {{ qN }}
          </span>
          <div v-if="tM && checkResultComputed" 
               class="text-xs font-bold mt-1 text-center"
               :class="scoreValue === 100 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'">
            {{ scoreValue }}%
          </div>
          </div>
        <textarea
          :value="p.node.attrs.question"
          @input="hIQ"
          @focus="onF"
          :readonly="tM"
          :class="{ 'cursor-default': tM }"
          class="w-full font-semibold text-lg p-1 bg-transparent focus:outline-none placeholder-[var(--color-outline)] text-[var(--color-on-surface)] resize-none overflow-hidden"
          placeholder="Tulis instruksi soal di sini..."
          rows="1"
          ref="qTa"
        ></textarea>
      </div>

      <!-- CONTENT AREA (Opsional) - Hanya di Edit Mode -->
      <div v-if="!tM" class="ml-11 mt-2">
        <div class="relative">
          <textarea
            :value="p.node.attrs.content || ''"
            @input="hICont"
            @focus="onF"
            class="w-full text-base p-3 rounded-xl bg-[var(--color-surface-container-high)] focus:outline-none placeholder-[var(--color-outline)] text-[var(--color-on-surface)] resize-none overflow-hidden focus:ring-2 focus:ring-[var(--color-primary)]/50 transition-shadow leading-relaxed"
            placeholder="Konten soal opsional, misal: 'Andi _____ roti di rumah.' (kosongkan jika tidak perlu)"
            rows="1"
            ref="contTa"
          ></textarea>
          <div class="absolute -left-11 top-3 w-7 h-7 flex items-center justify-center">
            <span class="w-7 h-7 flex items-center justify-center rounded-full text-[var(--color-outline)]" title="Konten Soal">
              <span class="material-symbols-outlined text-xl">article</span>
            </span>
          </div>
        </div>
      </div>

      <!-- CONTENT DISPLAY (Test Mode) - Hanya jika ada isinya -->
      <div v-if="tM && hasContent" class="ml-11 mt-2">
        <div class="text-base p-3 rounded-xl bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] leading-relaxed">
          {{ p.node.attrs.content }}
        </div>
      </div>

      <div v-if="!tM" class="ml-11 mt-2 pt-2 space-y-3">
        <div v-if="p.node.attrs.is_ai_enabled" class="relative">
          <textarea
            :value="p.node.attrs.context"
            @input="hIC"
            @focus="onF"
            class="w-full text-sm p-3 rounded-xl bg-[var(--color-surface-container-high)] focus:outline-none placeholder-[var(--color-outline)] text-[var(--color-on-surface-variant)] resize-none overflow-hidden focus:ring-2 focus:ring-[var(--color-primary)]/50 transition-shadow"
            placeholder="Tambahkan konteks untuk AI (opsional)..."
            rows="2"
            ref="cTa"
          ></textarea>
        </div>
        
        <div class="relative">
          <textarea
            :value="safeHint"
            @input="(e: Event) => { p.updateAttributes({ hint: (e.target as HTMLTextAreaElement).value }); aR(e.target as HTMLElement); }"
            @focus="onF"
            class="w-full text-sm p-3 rounded-xl bg-[var(--color-surface-container-high)] focus:outline-none placeholder-[var(--color-outline)] text-[var(--color-on-surface-variant)] resize-none overflow-hidden focus:ring-2 focus:ring-[var(--color-primary)]/50 transition-shadow"
            placeholder="Petunjuk untuk soal (opsional)..."
            rows="1"
            ref="hTa"
          ></textarea>
          <div class="absolute -left-11 top-3 w-7 h-7 flex items-center justify-center">
            <span class="w-7 h-7 flex items-center justify-center rounded-full text-[var(--color-outline)]" title="Petunjuk">
              <span class="material-symbols-outlined text-xl">info</span>
            </span>
          </div>
        </div>

        <div class="relative w-full p-2 rounded-xl bg-[var(--color-surface-container-low)] flex flex-wrap gap-2 min-h-[44px] items-center border border-[var(--color-outline-variant)]/30">
           <div class="absolute -left-11 top-3 w-7 h-7 flex items-center justify-center">
            <span class="w-7 h-7 flex items-center justify-center rounded-full text-[var(--color-primary)]" title="Jawaban Benar">
              <span class="material-symbols-outlined text-xl">check_circle</span>
            </span>
          </div>

          <template v-if="!p.node.attrs.is_ai_enabled">
            <span v-for="(answer, i) in correctAnswersList" :key="i" class="text-sm flex items-center bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)] font-medium px-3 py-1 rounded-full shadow-sm">
              {{ answer }}
              <button @click.stop="rA(i)" class="ml-1.5 text-[var(--color-on-secondary-container)] hover:text-[var(--color-error)] flex items-center justify-center rounded-full hover:bg-[var(--color-surface-container)]/50 transition-colors">
                <span class="material-symbols-outlined text-base">close</span>
              </button>
            </span>
            <textarea ref="aTa" v-model="nA" @keydown.enter.prevent="hAA" @input="hI" @focus="onF"
              :placeholder="p.node.attrs.correct_answers.length > 0 ? '' : 'Ketik kunci jawaban, lalu tekan Enter...'"
              rows="1" class="flex-grow bg-transparent text-sm focus:outline-none resize-none overflow-hidden placeholder-[var(--color-outline)] text-[var(--color-on-surface)] min-w-[150px]"></textarea>
          </template>

          <p v-else class="text-sm italic text-[var(--color-primary)] px-2 flex items-center gap-2">
            <span class="material-symbols-outlined text-lg">smart_toy</span>
            Penilaian akan dilakukan secara otomatis oleh AI.
          </p>

          <div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
            <button v-if="!p.node.attrs.is_ai_enabled && iCA && nA.trim().length > 0" @click.stop="hAA"
              class="w-7 h-7 flex items-center justify-center rounded-full text-[var(--color-primary)] hover:bg-[var(--color-primary-container)] transition-colors" title="Tambahkan Jawaban">
              <span class="material-symbols-outlined text-xl">check</span>
            </button>
            
            <button v-if="iCA && !(!p.node.attrs.is_ai_enabled && nA.trim().length > 0)" @click.stop="tAI"
              class="w-8 h-8 flex items-center justify-center rounded-full transition-all duration-300" 
              :class="p.node.attrs.is_ai_enabled ? 'bg-[var(--color-success)] text-[var(--color-on-success)] shadow-md' : 'text-[var(--color-outline)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-container-high)]'"
              :title="p.node.attrs.is_ai_enabled ? 'Nonaktifkan Penilaian AI' : 'Aktifkan Penilaian AI'">
              <span class="material-symbols-outlined text-xl">smart_toy</span>
            </button>
          </div>
        </div>
      </div>
      
      <div v-else class="ml-11 mt-2 pt-2">
        <div v-if="hasHint" class="mb-4">
            <button 
                @click="showHint = !showHint" 
                class="flex items-center gap-2 text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-fixed-dim)] transition-colors py-1 px-3 rounded-full bg-[var(--color-surface-container-high)] shadow-sm"
            >
                <span class="material-symbols-outlined !text-sm">info</span>
                {{ showHint ? 'Sembunyikan Petunjuk' : 'Tampilkan Petunjuk' }}
            </button>
            <Transition name="fade-down">
                <div v-if="showHint" class="mt-2 p-3 rounded-xl bg-[var(--color-surface-container-high)] text-sm text-[var(--color-on-surface-variant)]">
                    {{ safeHint }}
                </div>
            </Transition>
        </div>
        
        <div class="relative">
          <div class="absolute -left-11 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center transition-opacity duration-300" :class="checkResultComputed ? 'opacity-100' : 'opacity-0'">
              <span v-if="checkResultComputed === 'correct'" class="material-symbols-outlined text-2xl text-[var(--color-success)]">check_circle</span>
              <span v-if="checkResultComputed === 'incorrect'" class="material-symbols-outlined text-2xl text-[var(--color-error)]">cancel</span>
          </div>
          <textarea
            v-model="uA"
            @input="hUT"
            @keydown.enter.prevent="cA"
            :readonly="checkResultComputed !== null"
            :class="[
              'w-full border-2 rounded-xl px-4 py-2.5 focus:outline-none transition-colors duration-200 placeholder-[var(--color-outline)] resize-none overflow-hidden min-h-[50px]',
              checkResultComputed === 'correct' ? 'border-[var(--color-success)] bg-[var(--color-success-container)] text-[var(--color-on-success-container)]' : '',
              checkResultComputed === 'incorrect' ? 'border-[var(--color-error)] bg-[var(--color-error-container)] text-[var(--color-on-error-container)]' : 'border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] text-[var(--color-on-surface)] focus:border-[var(--color-primary)]',
              checkResultComputed !== null ? 'cursor-default' : ''
            ]"
            placeholder="Ketik jawabanmu di sini..."
            rows="1" ref="uTa"
          ></textarea>
        </div>
        <div v-if="aF" class="text-sm mt-3 p-3 rounded-lg bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] border border-[var(--color-outline-variant)]/50 flex gap-2 items-start">
           <span class="material-symbols-outlined text-lg text-[var(--color-primary)] mt-0.5">smart_toy</span>
           <span><strong class="text-[var(--color-primary)]">AI:</strong> {{ aF }}</span>
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
  type Ref,
  type ComputedRef
} from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { api } from '@/utils/api';
import { useLanguageStore } from '@/stores/language';

const p = defineProps(nodeViewProps);
const languageStore = useLanguageStore();

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

interface AIResponse {
  is_correct: boolean;
  score?: number;
  feedback?: string;
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
const componentId = `isian-${Math.random().toString(36).substr(2, 9)}`;

// --- REFS ---
const qTa = ref<HTMLTextAreaElement | null>(null);
const contTa = ref<HTMLTextAreaElement | null>(null);
const aTa = ref<HTMLTextAreaElement | null>(null);
const cTa = ref<HTMLTextAreaElement | null>(null);
const hTa = ref<HTMLTextAreaElement | null>(null);
const uTa = ref<HTMLTextAreaElement | null>(null);
const nA = ref('');
const isGenerating = ref(false);

// --- STATE ---
const tM = ref(false);
const isChecking = ref(false);
const cK = ref(false);
const uA = ref('');
const cR = ref<'correct' | 'incorrect' | null>(null);
const aF = ref('');
const scoreValue = ref(0);
const showHint = ref(false);

const currentMode = ref('admin');
const feedbackType = ref('immediate');

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
    const currentQ = p.node.attrs.question || '';
    const url = `/admin/${sourceLang}-${targetLang}/learn/lesson/${moduleId}/`;

    let contextStr = `Description: ${description || '-'}. Objectives: ${learningObjectives || '-'}.`;
    if (currentQ.length > 3) contextStr += `\nDraft: ${currentQ}`;

    const res = await api.patch(url, {
      ai_action: 'generate_question',
      question_type: 'soalIsian',
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
        p.updateAttributes({
          question: data.question,
          content: data.content || '',
          correct_answers: data.correct_answers || [],
        });
        nextTick(() => {
          if (qTa.value) aR(qTa.value);
          if (contTa.value) aR(contTa.value);
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
const iCA = computed(() => p.selected);
const correctAnswersList = computed<string[]>(() => (p.node.attrs.correct_answers || []) as string[]);
const safeHint = computed(() => p.node.attrs.hint || '');
const hasHint = computed(() => safeHint.value.trim().length > 0);
const hasContent = computed(() => (p.node.attrs.content || '').trim().length > 0);

// [PERBAIKAN LOGIKA] Hanya bernilai true jika ada isi teks di input
const isAnswered = computed(() => uA.value.trim().length > 0);

// --- LOGIKA HITUNG SKOR ---
const calculateRawScore = () => {
  const answer = uA.value.trim().toLowerCase();
  if (!answer) return 0;

  if (p.node.attrs.is_ai_enabled) {
    return scoreValue.value;
  }

  const correctAnswers = (p.node.attrs.correct_answers || []).map((a: string) =>
    a.toLowerCase().trim(),
  );
  if (correctAnswers.length === 0) return 0;

  const isCorrect = correctAnswers.includes(answer);
  return isCorrect ? 100 : 0;
};

const checkResultComputed = computed(() => {
  if (!cK.value) return null;
  if (cR.value) return cR.value;

  if (!p.node.attrs.is_ai_enabled) {
    return calculateRawScore() === 100 ? 'correct' : 'incorrect';
  }
  return null;
});

// --- RESET STATE ---
const rS = () => {
  uA.value = '';
  isChecking.value = false;
  cK.value = false;
  cR.value = null;
  aF.value = '';
  scoreValue.value = 0;
  showHint.value = false;
  
  if (feedbackType.value === 'immediate' && tM.value) {
     nextTick(() => {
        if (uTa.value) aR(uTa.value);
     })
  }
};

// --- API IMPLEMENTATION ---
const setMode = (mode: string, type = 'immediate') => {
  currentMode.value = mode;
  feedbackType.value = type as 'immediate' | 'none';

  if (mode === 'public') {
    tM.value = true;
    cK.value = false;
    showHint.value = false;
  } else {
    tM.value = false;
    cK.value = false;
  }
};

const submit = () => {
  cK.value = true;
  const finalScore = calculateRawScore();

  if (!p.node.attrs.is_ai_enabled) {
    scoreValue.value = finalScore;
  }

  return {
    isAnswered: uA.value.trim().length > 0,
    score: finalScore,
    maxScore: 100,
  };
};

const reset = () => {
  rS();
};

const syncState = () => {
  if (examContext && examContext.mode) {
    setMode(examContext.mode, examContext.feedbackType);
  }
};

// --- HANDLERS ---
const tTM = () => {
  tM.value = !tM.value;
  if (tM.value) {
    currentMode.value = 'public';
    feedbackType.value = 'immediate';
  } else {
    currentMode.value = 'admin';
  }
  rS();
};

const cA = async () => {
  if (isChecking.value) return;

  isChecking.value = true;
  aF.value = '';
  cR.value = null;
  cK.value = true;

  if (p.node.attrs.is_ai_enabled) {
    aF.value = 'AI sedang berpikir...';
    try {
      const response = await api.post('/ai/dispatch/', {
        action: 'assess_essay',
        context: {
          question: p.node.attrs.question,
          context: p.node.attrs.context,
          target_lang: languageStore.selectedTarget?.kodeBahasa || 'unknown',
          source_lang: languageStore.selectedAsal?.kodeBahasa || 'unknown',
        },
        payload: {
          user_answer: uA.value,
          correct_answers: p.node.attrs.correct_answers,
        },
      });

      const result = response.data as AIResponse;
      cR.value = result.is_correct ? 'correct' : 'incorrect';
      scoreValue.value =
        result.score !== undefined ? result.score : result.is_correct ? 100 : 0;
      aF.value = result.feedback || 'Penilaian selesai.';
    } catch (error) {
      console.error('AI Error:', error);
      cR.value = 'incorrect';
      aF.value = 'Gagal menghubungi AI.';
      scoreValue.value = 0;
    } finally {
      isChecking.value = false;
    }
  } else {
    const score = calculateRawScore();
    scoreValue.value = score;
    cR.value = score === 100 ? 'correct' : 'incorrect';
    isChecking.value = false;
  }
};

const hUT = (e: Event) => {
  const target = e.target as HTMLTextAreaElement;
  aR(target);
  if (feedbackType.value === 'immediate' && cK.value) {
    cK.value = false;
    cR.value = null;
    scoreValue.value = 0;
  }
};

const onF = () => p.editor.commands.setNodeSelection(p.getPos());

const hWM = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  if (tM.value || target.closest('textarea, button, input')) return;
  event.preventDefault();
  onF();
};

const tAI = () => {
  p.updateAttributes({ is_ai_enabled: !p.node.attrs.is_ai_enabled });
};
const aR = (textarea: HTMLElement | null) => {
  if (!textarea || !textarea.style) return;
  textarea.style.height = 'auto';
  textarea.style.height = `${textarea.scrollHeight}px`;
};

const hAA = () => {
  const answer = nA.value.trim();
  if (!answer) return;
  const currentAnswers = (p.node.attrs.correct_answers || []) as string[];
  if (
    currentAnswers.map((a) => a.toLowerCase()).includes(answer.toLowerCase())
  ) {
    nA.value = '';
    return;
  }
  const updatedAnswers = [...currentAnswers, answer];
  p.updateAttributes({ correct_answers: updatedAnswers });
  nA.value = '';
  nextTick(() => {
    if (aTa.value) {
      aR(aTa.value);
      aTa.value.focus();
    }
  });
};

const rA = (i: number) => {
  const currentAnswers = p.node.attrs.correct_answers || [];
  const updatedAnswers = currentAnswers.filter((_: any, idx: number) => idx !== i);
  p.updateAttributes({ correct_answers: updatedAnswers });
  nextTick(() => {
    if (aTa.value) {
      aR(aTa.value);
      aTa.value.focus();
    }
  });
};

const hIQ = (e: Event) => {
  const target = e.target as HTMLTextAreaElement;
  p.updateAttributes({ question: target.value });
  aR(target);
};
const hICont = (e: Event) => {
  const target = e.target as HTMLTextAreaElement;
  p.updateAttributes({ content: target.value });
  aR(target);
}; // NEW: Content handler
const hIC = (e: Event) => {
  const target = e.target as HTMLTextAreaElement;
  p.updateAttributes({ context: target.value });
  aR(target);
};
const hI = (e: Event) => {
  const target = e.target as HTMLTextAreaElement;
  nextTick(() => aR(target));
};

const qN = computed(() => {
  if (typeof (p as any).getPos !== 'function') return 0;
  let q = 0;
  let f = false;
  p.editor.state.doc.content.forEach((n: any, o: number) => {
    if (f) return;
    if (n.type.name.startsWith('soal')) {
      q++;
      if (o === p.getPos()) f = true;
    }
  });
  return q;
});

const aRA = () => {
  nextTick(() => {
    if (qTa.value) aR(qTa.value);
    if (contTa.value) aR(contTa.value);
    if (aTa.value) aR(aTa.value);
    if (cTa.value) aR(cTa.value);
    if (hTa.value) aR(hTa.value);
    if (uTa.value) aR(uTa.value);
  });
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
        userAnswer: uA.value,
      }),
    });
  }

  syncState();
  aRA();
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

watch(
  () => p.node.attrs,
  () => {
    aRA();
  },
  { deep: true },
);
watch(uA, () => {
  nextTick(() => {
    if(uTa.value) aR(uTa.value);
  });
});

// --- EXPOSE ---
defineExpose({
  checkStatus: () => ({
    isAnswered: isAnswered.value,
    score: calculateRawScore(),
    maxScore: 100,
    userAnswer: uA.value,
  }),
  setTestMode: (val: boolean) => {
    if (val !== tM.value) tTM();
  },
  setCheckMode: async (val: boolean) => {
    if (val && !cK.value) await cA();
    else if (!val && cK.value) rS();
  },
  setMode,
  submit,
  reset,
  checkResultComputed,
});
</script>

<style>
.button-list-move,
.button-list-enter-active,
.button-list-leave-active {
  transition: all 0.3s ease-in-out;
}
.button-list-enter-from,
.button-list-leave-to {
  opacity: 0;
  transform: translateX(15px);
}
.button-list-leave-active {
  position: absolute;
}
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
