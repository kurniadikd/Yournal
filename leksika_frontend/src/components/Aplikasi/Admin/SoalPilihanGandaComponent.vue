<template>
  <node-view-wrapper as="div" class="my-6">
    <div :class="{ 'ring-2 ring-[var(--color-primary)]': iCA && !tM }"
      class="relative bg-[var(--color-surface-container)] rounded-xl p-4 transition-all duration-200" @mousedown="hWM">
      <!-- ACTION BUTTONS -->
      <div v-if="!tM || (tM && feedbackType === 'immediate')"
        :class="{ 'opacity-100': iCA || tM, 'opacity-0 pointer-events-none': !iCA && !tM }"
        class="absolute top-4 right-4 z-20 transition-opacity duration-200">
        <TransitionGroup tag="div" name="button-list" class="flex items-center gap-2">
          <button v-if="!tM || feedbackType === 'immediate'" key="play" @click.stop="tTM"
            :title="tM ? 'Keluar Mode Uji' : 'Masuk Mode Uji'"
            class="w-7 h-7 flex items-center justify-center rounded-full transition-transform cursor-pointer" :class="tM
              ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]'
              : 'text-[var(--color-primary)] hover:bg-[var(--color-primary-container)]'">
            <span class="material-symbols-outlined text-lg">play_arrow</span>
          </button>

          <button v-if="tM && feedbackType === 'immediate'" key="check" @click.stop="tCM" title="Koreksi Jawaban"
            :disabled="!isAnswered"
            class="w-7 h-7 flex items-center justify-center rounded-full transition-transform cursor-pointer" :class="[
              cK
                ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]'
                : 'text-[var(--color-primary)] hover:bg-[var(--color-primary-container)]',
              !isAnswered ? 'cursor-not-allowed opacity-70' : ''
            ]">
            <span class="material-symbols-outlined text-xl">check_circle</span>
          </button>

          <button v-if="!tM" key="ai_gen" @click.stop="generateWithAI"
            class="w-7 h-7 flex items-center justify-center rounded-full text-[var(--color-primary)] hover:bg-[var(--color-primary-container)] transition-transform cursor-pointer"
            :class="{ 'opacity-50 cursor-wait': isGenerating }"
            :title="isGenerating ? 'Sedang membuat...' : 'Buat Soal dengan AI'">
            <span :class="['material-symbols-outlined text-xl', isGenerating ? 'animate-spin' : '']">{{ isGenerating ?
              'sync' : 'auto_awesome' }}</span>
          </button>

          <button v-if="!tM" key="delete" @click.stop="p.deleteNode()"
            class="w-7 h-7 flex items-center justify-center rounded-full text-[var(--color-primary)] hover:text-[var(--color-error)] hover:bg-[var(--color-error-container)] transition-transform cursor-pointer"
            title="Hapus Soal">
            <span class="material-symbols-outlined text-xl">close</span>
          </button>

          <button v-if="tM && feedbackType === 'immediate'" key="reset" @click.stop="rS" title="Reset Soal"
            class="w-7 h-7 flex items-center justify-center rounded-full text-[var(--color-primary)] hover:text-[var(--color-error)] hover:bg-[var(--color-surface-container-high)] transition-transform cursor-pointer">
            <span class="material-symbols-outlined text-xl">refresh</span>
          </button>
        </TransitionGroup>
      </div>

      <div class="flex items-start mb-2">
        <div data-drag-handle class="pt-1 pr-4 cursor-grab" style="touch-action: none;">
          <span
            class="w-7 h-7 flex items-center justify-center bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-full font-bold text-sm flex-shrink-0">
            {{ qN }}
          </span>
          <div v-if="tM && cK" class="text-xs font-bold mt-1 text-center"
            :class="score === 100 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'">
            {{ earnedPoints }} pts
          </div>
        </div>

        <div class="w-full">
          <!-- INSTRUKSI -->
          <div v-if="!tM" class="text-xs font-bold text-[var(--color-primary)] mb-1 uppercase tracking-wider">Instruksi
          </div>
          <div v-if="tM"
            class="w-full font-bold text-lg p-1 bg-transparent text-[var(--color-on-surface)] cursor-default select-text resize-none overflow-hidden mb-3"
            v-html="p.node.attrs.instruction">
          </div>
          <textarea v-else :value="p.node.attrs.instruction" @input="hIQ" @focus="onF"
            class="w-full font-bold text-lg p-1 bg-transparent focus:outline-none placeholder-[var(--color-outline)] text-[var(--color-on-surface)] resize-none overflow-hidden mb-3 border-b border-transparent hover:border-[var(--color-outline-variant)] focus:border-[var(--color-primary)] transition-colors"
            placeholder="Tulis instruksi soal..." rows="1" ref="qTa"></textarea>

          <!-- KONTEN (CONTEXT) -->
          <div v-if="!tM" class="flex items-center gap-2 mb-2">
            <span class="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider">Konten
              Penunjang:</span>
            <div class="flex bg-[var(--color-surface-container-high)] rounded-lg p-0.5">
              <button @click="setContentType('none')"
                :class="['px-2 py-0.5 text-xs rounded-md transition-all', contentType === 'none' ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]' : 'text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-highest)]']">None</button>
              <button @click="setContentType('text')"
                :class="['px-2 py-0.5 text-xs rounded-md transition-all', contentType === 'text' ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]' : 'text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-highest)]']">Teks</button>
              <button @click="setContentType('dialogue')"
                :class="['px-2 py-0.5 text-xs rounded-md transition-all', contentType === 'dialogue' ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]' : 'text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-highest)]']">Dialog</button>
            </div>
          </div>

          <!-- RENDER KONTEN: TEXT -->
          <div v-if="contentType === 'text'" class="mb-4">
            <div v-if="tM"
              class="w-full p-4 bg-[var(--color-surface-container-low)] rounded-xl text-[var(--color-on-surface)] border border-[var(--color-outline-variant)]/50 select-text prose-sm max-w-none"
              v-html="p.node.attrs.content_data">
            </div>
            <textarea v-else :value="p.node.attrs.content_data" @input="hICT" @focus="onF"
              class="w-full p-3 bg-[var(--color-surface-container-high)] rounded-lg text-[var(--color-on-surface)] focus:outline-none resize-none overflow-hidden"
              placeholder="Tulis teks cerita/bacaan di sini..." rows="2" ref="cTa"></textarea>
          </div>

          <!-- RENDER KONTEN: DIALOGUE (EMBEDDED) -->
          <div v-if="contentType === 'dialogue'" class="mb-4">
            <PercakapanComponent v-if="dM.length > 0 || !tM" :node="{
              attrs: {
                messages: dM,
                speakers: speakers
              }
            } as any" :updateAttributes="handlePercakapanUpdate" :selected="iCA" :editor="p.editor" :getPos="p.getPos"
              :deleteNode="() => { }" :isEmbedded="true" :decorations="[] as any" :extension="{} as any"
              :view="p.editor.view" :innerDecorations="[] as any" :HTMLAttributes="{}" />
          </div>

          <!-- PERTANYAAN INTI -->
          <div class="mb-2" v-if="contentType !== 'none'">
            <div v-if="!tM" class="text-xs font-bold text-[var(--color-primary)] mb-1 uppercase tracking-wider">
              Pertanyaan Inti
            </div>
            <div v-if="tM"
              class="w-full font-bold text-lg p-1 bg-transparent text-[var(--color-on-surface)] cursor-default select-text resize-none overflow-hidden"
              v-html="p.node.attrs.question">
            </div>
            <textarea v-else :value="p.node.attrs.question" @input="hIP" @focus="onF"
              class="w-full font-bold text-lg p-1 bg-transparent focus:outline-none placeholder-[var(--color-outline)] text-[var(--color-on-surface)] resize-none overflow-hidden"
              placeholder="Tulis pertanyaan inti (e.g. Siapa yang berbicara?)..." rows="1" ref="qpTa"></textarea>
          </div>
        </div>
      </div>

      <div v-if="!tM" class="ml-11 mb-4">
        <div
          class="p-2 rounded-xl bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)]/30">
          <label class="block text-xs font-bold text-[var(--color-primary)] mb-1 px-1">Petunjuk:</label>
          <textarea :value="safeHint"
            @input="(e: Event) => { p.updateAttributes({ hint: (e.target as HTMLTextAreaElement).value }); aR(e.target); }"
            @focus="onF"
            class="w-full text-sm p-1 bg-transparent focus:outline-none placeholder-[var(--color-outline)] text-[var(--color-on-surface-variant)] resize-none overflow-hidden"
            placeholder="Tulis petunjuk untuk membantu pengguna (opsional)..." rows="1" ref="hTa"></textarea>
        </div>
      </div>

      <div v-if="tM && hasHint" class="ml-11 mb-4">
        <button @click="showHint = !showHint"
          class="flex items-center gap-2 text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-fixed-dim)] transition-colors py-1 px-3 rounded-full bg-[var(--color-surface-container-high)]">
          <span class="material-symbols-outlined !text-sm">info</span>
          {{ showHint ? 'Sembunyikan Petunjuk' : 'Tampilkan Petunjuk' }}
        </button>
        <Transition name="fade-down">
          <div v-if="showHint"
            class="mt-2 p-3 rounded-xl bg-[var(--color-surface-container-high)] text-sm text-[var(--color-on-surface-variant)]">
            {{ safeHint }}
          </div>
        </Transition>
      </div>

      <div class="space-y-3 ml-11">
        <div v-for="(option, i) in optionsList" :key="i" class="relative flex items-start w-full">

          <div class="absolute -left-11 top-3 w-7 h-7 flex items-center justify-center">
            <button v-if="!tM" @click.stop="tCA(i)" :class="[
              'w-7 h-7 flex items-center justify-center rounded-full transition-all',
              iC(i)
                ? 'text-[var(--color-primary)]'
                : 'text-[var(--color-outline)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-container)]',
              iCA || iC(i) ? 'opacity-100' : 'opacity-0 pointer-events-none'
            ]" :title="iC(i) ? 'Batalkan Jawaban Benar' : 'Jadikan Jawaban Benar'">
              <span class="material-symbols-outlined text-xl">
                {{ iC(i) ? 'check_circle' : 'check' }}
              </span>
            </button>

            <div v-if="tM && cK" class="transition-opacity duration-300">
              <span v-if="iC(i) && (uA || []).includes(i)"
                class="material-symbols-outlined text-[var(--color-success)]">check_circle</span>
              <span v-if="!iC(i) && (uA || []).includes(i)"
                class="material-symbols-outlined text-[var(--color-error)]">cancel</span>
              <span v-if="iC(i) && !(uA || []).includes(i)"
                class="material-symbols-outlined text-[var(--color-success)]">check_circle</span>
            </div>
          </div>

          <div @click.stop="tM && sA(i)" :class="[
            'flex items-start text-left p-3 rounded-xl transition-all duration-200 flex-grow border',
            tM ? 'cursor-pointer' : '',
            gOC(i)
          ]">
            <span :class="[
              'font-bold w-6 h-6 flex items-center justify-center rounded-full mr-3 text-sm flex-shrink-0 transition-colors',
              gOLC(i)
            ]">
              {{ String.fromCharCode(65 + i) }}
            </span>

            <div v-if="tM"
              :class="['w-full bg-transparent resize-none overflow-hidden font-medium select-none', gOTC(i)]"
              v-html="option.text">
            </div>
            <textarea v-else :ref="(el) => oTa[i] = el as HTMLTextAreaElement | null" :value="option.text"
              @input="(e: Event) => hIO(i, (e.target as HTMLTextAreaElement).value)" @focus="hOF" @blur="hOB" :class="[
                'w-full bg-transparent focus:outline-none placeholder-[var(--color-outline)] resize-none overflow-hidden font-medium',
                gOTC(i)
              ]" placeholder="Teks Opsi" rows="1"></textarea>
          </div>

          <button v-if="!tM" @click.stop="hHO(i)" :class="[
            'ml-2 mt-2 w-7 h-7 flex items-center justify-center rounded-full text-[var(--color-outline)] hover:text-[var(--color-error)] transition-all flex-shrink-0 hover:bg-[var(--color-error-container)]',
            iCA ? 'opacity-100' : 'opacity-0 pointer-events-none'
          ]">
            <span class="material-symbols-outlined text-xl">delete</span>
          </button>
        </div>

        <div v-if="!tM" class="flex items-center w-full">
          <button @click.stop="hAO"
            class="flex-grow text-sm text-center text-[var(--color-outline)] hover:text-[var(--color-primary)] bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-container-highest)] rounded-lg py-2 transition-colors duration-200">
            + Tambah Opsi
          </button>
          <div class="ml-2 w-7 h-7 flex-shrink-0"></div>
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
  TransitionGroup,
  type Ref,
  type ComputedRef
} from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { api } from '@/utils/api';
// --- IMPORT PERCAKAPAN ---
import PercakapanComponent from './PercakapanComponent.vue';

const p = defineProps(nodeViewProps);

// --- INTERFACES ---
interface Option {
  text: string;
}

interface DialogueMessage {
  speaker: string;
  text: string;
  translation: string;
}

interface QuestionAttrs {
  question: string;
  options: Option[];
  correct_answers: number[];
  hint?: string;
  instruction?: string;
  content_type?: 'none' | 'text' | 'dialogue';
  content_data?: string | DialogueMessage[];
  question_prompt?: string;
}

interface ExamContext {
  mode: 'public' | 'admin';
  feedbackType: 'immediate' | 'none';
}

interface MaterialContext {
  moduleId: string | number;
  sourceLang: string;
  targetLang: string;
  topic?: string;
  description?: string;
  learningObjectives?: string;
}

interface QuestionRegistry {
  register: (id: string, methods: any) => void;
  unregister: (id: string) => void;
}

// --- INJECT ---
const examContext = inject<ExamContext>('examContext', {
  mode: 'public',
  feedbackType: 'none',
});
const materialContext = inject<Ref<MaterialContext>>('materialContext', ref({
  moduleId: '',
  sourceLang: 'id',
  targetLang: 'en',
  topic: 'General Knowledge',
}));
const registry = inject<QuestionRegistry | null>('questionRegistry', null);
const componentId = `pg-${Math.random().toString(36).substr(2, 9)}`;

// --- REFS ---
const qTa = ref<HTMLTextAreaElement | null>(null);
const oTa = reactive<Record<number, HTMLTextAreaElement | null>>({});
const hTa = ref<HTMLTextAreaElement | null>(null);

// --- STATE ---
const tM = ref(false); // testMode (UI Clean)
const cK = ref(false); // checkMode (Feedback Warna)
const uA = ref<number[]>([]); // User Answer (Indices)
const showHint = ref(false);
const isGenerating = ref(false); // AI State

const currentMode = ref('admin');
const feedbackType = ref('immediate');

// --- SPEAKERS LOGIC ---
const speakers = computed(() => {
  const s = p.node.attrs.speakers;
  return Array.isArray(s) ? s : [];
});

const speakerMap = computed(() => {
  const map: Record<string, string> = {};
  speakers.value.forEach((s: any) => {
    if (s.id) map[s.id] = s.name;
    // Map both ways or just ID? Just ID to Name
  });
  return map;
});

const getSpeakerName = (id: string) => {
  return speakerMap.value[id] || id;
};

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
    console.warn(
      '[SoalPG] Missing context for AI generation',
      materialContext.value,
    );
    if (!moduleId)
      alert(
        'Mohon simpan modul terlebih dahulu atau refresh halaman untuk mengaktifkan AI.',
      );
    return;
  }

  isGenerating.value = true;
  try {
    const currentQ = p.node.attrs.question || '';
    // Gunakan Endpoint Admin Modul
    const url = `/admin/${sourceLang}-${targetLang}/learn/lesson/${moduleId}/`;

    // Build Rich Context
    let contextStr = `Material Description: ${description || '-'}. \nLearning Objectives: ${learningObjectives || '-'}.`;
    if (currentQ.length > 3) {
      contextStr += `\nSpecific Instruction/Draft: ${currentQ}`;
    }

    const res = await api.patch(url, {
      ai_action: 'generate_question',
      question_type: 'soalPilihanGanda',
      topic: topic || 'General',
      source_lang: sourceLang,
      target_lang: targetLang,
      additional_context: contextStr,
    });

    if (res.data && res.data.content) {
      let rawStr = res.data.content.trim();

      // Remove markdown fences
      if (rawStr.includes('```')) {
        rawStr = rawStr.replace(/```(xml|html|json)?/gi, '').replace(/```/g, '').trim();
      }

      // Check format
      const isXml = rawStr.startsWith('<');

      try {
        const data: any = {};

        if (isXml) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(rawStr, 'text/html'); // generic HTML parser
          const root = doc.body.firstElementChild; // <soal-pg>

          if (root) {
            data.question = root.querySelector('question')?.textContent || root.getAttribute('question') || '';
            // Instruction
            data.instruction = root.querySelector('instruction')?.textContent || root.getAttribute('instruction') || '';

            // Context
            const contextEl = root.querySelector('context') || root.querySelector('content');
            if (contextEl) {
              const isDialogue = contextEl.getAttribute('type') === 'dialogue' || contextEl.querySelector('dialog');
              if (isDialogue) {
                data.content_type = 'dialogue';

                // Parse Speakers
                const speakersEl = contextEl.querySelector('speakers');
                if (speakersEl) {
                  data.speakers = Array.from(speakersEl.querySelectorAll('speaker')).map(s => ({
                    id: s.getAttribute('id') || '',
                    name: s.getAttribute('name') || ''
                  }));
                }

                data.content_data = Array.from(contextEl.querySelectorAll('dialog')).map(d => ({
                  speaker: d.getAttribute('id') || d.getAttribute('tokoh') || 'A',
                  text: d.textContent || '',
                  translation: d.getAttribute('arti') || ''
                }));
              } else {
                data.content_type = 'text';
                data.content_data = contextEl.innerHTML.trim();
              }
            }

            // Options
            const opts = Array.from(root.querySelectorAll('option'));
            data.options = opts.map(o => ({ text: o.innerHTML || o.textContent || '' }));
            data.correct_answers = opts
              .map((o, i) => (o.hasAttribute('kunci') ? i : -1))
              .filter(i => i !== -1);

            data.hint = root.querySelector('hint')?.textContent || root.getAttribute('hint') || '';
          }
        } else {
          // JSON Fallback
          const parsed = JSON.parse(rawStr);
          Object.assign(data, parsed);
        }

        // Apply Data
        // [BUG FIX] AI sometimes returns object for content_data on text type.
        if (data.content_type === 'text' && data.content_data && typeof data.content_data === 'object') {
          if ('text' in data.content_data) {
            data.content_data = data.content_data.text;
          } else {
            data.content_data = JSON.stringify(data.content_data, null, 2);
          }
        }

        // Update Attributes
        p.updateAttributes({
          question: data.question || '',
          instruction: data.instruction || '',
          content_type: data.content_type || 'none',
          content_data: data.content_data || null,
          question_prompt: data.question_prompt || '', // Legacy
          options: data.options || [],
          correct_answers: data.correct_answers || [],
          hint: data.hint || '',
          speakers: data.speakers || [] // Update speakers
        });

        // Resize Textareas
        nextTick(() => {
          if (qTa.value) aR(qTa.value);
          if (Object.keys(oTa).length > 0)
            Object.values(oTa).forEach((el) => el && aR(el));
          // Resize new content textareas if they exist
          const cTa = document.querySelector(
            'textarea[placeholder*="teks cerita"]',
          ) as HTMLTextAreaElement | null;
          if (cTa) aR(cTa);
          const qpTa = document.querySelector(
            'textarea[placeholder*="Pertanyaan inti"]',
          ) as HTMLTextAreaElement | null;
          if (qpTa) aR(qpTa);
        });
      } catch (err) {
        console.error('Parsing Error', err);
      }
    }
  } catch (e) {
    console.error('AI Error', e);
  } finally {
    isGenerating.value = false;
  }
};

// --- HELPERS ---
const optionsList = computed<Option[]>(() => (p.node.attrs.options || []) as Option[]);
const iCA = computed(() => p.selected);
const iSAM = computed(() => (p.node.attrs.correct_answers || []).length === 1);
const safeHint = computed(() => p.node.attrs.hint || '');
const hasHint = computed(() => safeHint.value.trim().length > 0);

// [PERBAIKAN LOGIKA] Hanya dianggap terjawab jika array uA ada isinya
const isAnswered = computed(() => uA.value && uA.value.length > 0);

// --- LOGIKA HITUNG SKOR ---
const calculateRawScore = () => {
  const user = uA.value || [];
  if (user.length === 0) return 0;

  const correct = p.node.attrs.correct_answers || [];
  const isSingle = p.node.attrs.options.length > 0 && correct.length === 1;

  if (isSingle) {
    return user[0] === correct[0] ? 100 : 0;
  } else {
    const correctCount = user.filter((a) => (correct || []).includes(a)).length;
    const incorrectCount = user.filter(
      (a) => !(correct || []).includes(a),
    ).length;
    const totalCorrectAvailable = (correct || []).length;

    if (totalCorrectAvailable === 0) return 0;
    const netScore = correctCount - incorrectCount;
    const finalScore = Math.max(0, netScore);

    return Math.round((finalScore / totalCorrectAvailable) * 100);
  }
};

const score = computed(() => {
  if (!cK.value) return 0;
  return calculateRawScore();
});

// --- POINTS CALCULATION ---
const totalQuestions = computed(() => {
  let count = 0;
  p.editor.state.doc.content.forEach((n: any) => {
    if (n.type.name.startsWith('soal')) count++;
  });
  return count || 1; // Prevent division by zero
});

const pointsPerQuestion = computed(
  () => Math.round((100 / totalQuestions.value) * 10) / 10,
);
const earnedPoints = computed(
  () => Math.round((score.value / 100) * pointsPerQuestion.value * 10) / 10,
);

const aR = (t: HTMLElement | EventTarget | null) => {
  if (!t) return;
  const el = t as HTMLElement;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
};

// --- RESET STATE ---
const rS = () => {
  uA.value = [];
  cK.value = false;
  showHint.value = false;
};

// --- SYNC STATE ---
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
const tCM = () => {
  cK.value = !cK.value;
};

const safeCorrectAnswers = () => {
  const val = p.node.attrs.correct_answers;
  if (Array.isArray(val)) return val;
  if (typeof val === 'number') return [val];
  return [];
};

const iC = (i: number) => safeCorrectAnswers().includes(i);

const hWM = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (target.closest('textarea, button') || tM.value) return;
  e.preventDefault();
  onF();
};

const onF = () => p.editor.commands.setNodeSelection(p.getPos());
const hOF = () => onF();
const hOB = () => { };
const hIQ = (e: Event) => {
  const target = e.target as HTMLTextAreaElement;
  p.updateAttributes({ instruction: target.value });
  aR(target);
};
const hIP = (e: Event) => {
  const target = e.target as HTMLTextAreaElement;
  p.updateAttributes({ question: target.value });
  aR(target);
};
const hIO = (i: number, t: string) => {
  const nO = [...(p.node.attrs.options || [])];
  nO[i] = { ...nO[i], text: t };
  p.updateAttributes({ options: nO });
  aR(oTa[i]);
};
const hAO = () =>
  p.updateAttributes({
    options: [...(p.node.attrs.options || []), { text: '' }],
  });
const hHO = (i: number) => {
  if ((p.node.attrs.options || []).length <= 1) return;
  const nO = [...(p.node.attrs.options || [])];
  nO.splice(i, 1);
  const cA = [...safeCorrectAnswers()];
  let newUA = cA
    .filter((idx) => idx !== i)
    .map((idx) => (idx > i ? idx - 1 : idx));
  if (newUA.length === 0 && nO.length > 0) newUA.push(0);
  p.updateAttributes({ options: nO, correct_answers: newUA });
};
const tCA = (i: number) => {
  const cA = [...safeCorrectAnswers()];
  const pos = cA.indexOf(i);
  if (pos > -1) {
    if (cA.length > 1) cA.splice(pos, 1);
  } else {
    cA.push(i);
  }
  p.updateAttributes({ correct_answers: cA.sort((a, b) => a - b) });
};

const sA = (i: number) => {
  if (cK.value) return;

  if (iSAM.value) {
    uA.value = (uA.value || [])[0] === i ? [] : [i];
  } else {
    const p = (uA.value || []).indexOf(i);
    if (p > -1) uA.value.splice(p, 1);
    else uA.value.push(i);
    uA.value.sort((a, b) => a - b);
  }
};

// --- CONTENT MANAGMENT ---
const contentType = computed(() => (p.node.attrs.content_type as string) || 'none');
const contentData = computed(() => p.node.attrs.content_data);
const questionPrompt = computed(() => p.node.attrs.question_prompt || '');

const setContentType = (type: string) => {
  let data: any = null;
  if (type === 'text') data = '';
  else if (type === 'dialogue') data = [];
  p.updateAttributes({ content_type: type, content_data: data });
};

// Text Content Logic
const hICT = (e: Event) => {
  const target = e.target as HTMLTextAreaElement;
  p.updateAttributes({ content_data: target.value });
  aR(target);
};

// Dialog Content Logic
// Dialog Content Logic
const dM = computed<DialogueMessage[]>(() => (Array.isArray(contentData.value) ? contentData.value : []));

// Handler for updates from embedded PercakapanComponent
const handlePercakapanUpdate = (attrs: any) => {
  const updates: any = {};

  if (attrs.messages) {
    updates.content_data = attrs.messages;
  }

  if (attrs.speakers) {
    // If SoalPG node has speakers attribute (it should now)
    updates.speakers = attrs.speakers;
  }

  p.updateAttributes(updates);
};

// Prompt Logic
const hIQP = (e: Event) => {
  const target = e.target as HTMLTextAreaElement;
  p.updateAttributes({ question_prompt: target.value });
  aR(target);
};

const qN = computed(() => {
  if (typeof (p as any).getPos !== 'function') return '';
  let q = 0;
  let f = false;
  p.editor.state.doc.content.forEach((n, o) => {
    if (f) return;
    if (n.type.name.startsWith('soal')) {
      q++;
      if (o === p.getPos()) f = true;
    }
  });
  return q;
});

// --- STYLING ---
const gOC = (i: number) => {
  if (tM.value) {
    const iS = (uA.value || []).includes(i);
    if (cK.value) {
      const iCA = iC(i);
      if (iS && iCA)
        return 'bg-[var(--color-success)] border-[var(--color-success)]';
      if (iS && !iCA)
        return 'bg-[var(--color-error)] border-[var(--color-error)]';
      if (!iS && iCA)
        return 'bg-[var(--color-surface-container)] border-[var(--color-success)] border-dashed border-2 opacity-70';
      return 'bg-[var(--color-surface-container-low)] opacity-50 border-transparent';
    } else {
      if (iS)
        return 'bg-[var(--color-primary)] border-[var(--color-primary)] transform scale-[1.01]';
      return 'bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-container-highest)] border-transparent hover:border-[var(--color-outline-variant)]';
    }
  }
  return 'bg-[var(--color-surface-container-high)] border-[var(--color-outline-variant)]';
};

const gOLC = (i: number) => {
  if (tM.value) {
    const iS = (uA.value || []).includes(i);
    if (cK.value) {
      const iCA = iC(i);
      if (iS && iCA)
        return 'bg-[var(--color-on-success)] text-[var(--color-success)]';
      if (iS && !iCA)
        return 'bg-[var(--color-on-error)] text-[var(--color-error)]';
      if (!iS && iCA)
        return 'bg-[var(--color-success)] text-[var(--color-on-success)]';
      return 'bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]';
    }
    if ((uA.value || []).includes(i))
      return 'bg-[var(--color-on-primary)] text-[var(--color-primary)]';
    return 'bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]';
  }
  if (iC(i))
    return 'bg-[var(--color-secondary)] text-[var(--color-on-secondary)]';
  return 'bg-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)]';
};

const gOTC = (i: number) => {
  if (tM.value) {
    const iS = (uA.value || []).includes(i);
    if (cK.value) {
      const iCA = iC(i);
      if (iS && iCA) return 'text-[var(--color-on-success)] font-bold';
      if (iS && !iCA) return 'text-[var(--color-on-error)] font-bold';
      if (!iS && iCA) return 'text-[var(--color-success)] font-semibold';
      return 'text-[var(--color-on-surface)] opacity-50';
    }
    if (iS) return 'text-[var(--color-on-primary)] font-bold';
    return 'text-[var(--color-on-surface)]';
  }
  return 'text-[var(--color-on-surface)]';
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
  return {
    isAnswered: (uA.value || []).length > 0,
    score: finalScore,
    maxScore: 100,
  };
};

const reset = () => {
  rS();
};

// --- LIFECYCLE ---
onMounted(() => {
  if (registry && registry.register) {
    registry.register(componentId, {
      setMode,
      submit,
      reset,
      // Expose checkStatus agar Parent bisa cek realtime
      checkStatus: () => ({
        isAnswered: isAnswered.value,
        score: calculateRawScore(),
        maxScore: 100,
        userAnswer: iSAM.value ? (uA.value || [])[0] : uA.value,
      }),
    });
  }

  syncState();

  nextTick(() => {
    if (qTa.value) aR(qTa.value);
    if (hTa.value) aR(hTa.value);
    Object.values(oTa).forEach((el) => el && aR(el));
  });
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
  () => p.node.attrs.question,
  () => {
    nextTick(() => {
      if (qTa.value) aR(qTa.value);
    });
  },
);
watch(
  () => p.node.attrs,
  () => {
    nextTick(() => {
      if (hTa.value) aR(hTa.value);
      Object.values(oTa).forEach((el) => el && aR(el));
    });
  },
  { deep: true },
);

// --- EXPOSE API ---
defineExpose({
  setMode,
  submit,
  reset,
  checkStatus: () => ({
    isAnswered: isAnswered.value,
    score: calculateRawScore(),
    maxScore: 100,
    userAnswer: iSAM.value ? (uA.value || [])[0] : uA.value,
  }),
  setTestMode: (val) => {
    if (val !== tM.value) tTM();
  },
  setCheckMode: (val) => {
    if (val !== cK.value) tCM();
  },
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
