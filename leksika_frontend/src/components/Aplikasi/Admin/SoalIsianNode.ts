import { Node, mergeAttributes } from '@tiptap/core';
import { VueNodeViewRenderer } from '@tiptap/vue-3';
import SoalIsianComponent from './SoalIsianComponent.vue';

// --- DOKUMENTASI KOMPONEN (Dibaca Dinamis oleh ManajemenMateriSource) ---
export const documentation = {
  title: 'Soal Isian / Essay',
  description:
    'Soal isian singkat atau esai. Bisa dikoreksi manual atau dengan AI.',
  attrs: {
    question: {
      type: 'string',
      description: 'Instruksi soal (di baris pertama)',
    },
    content: {
      type: 'string',
      description: 'Konten soal opsional, misal kalimat yang perlu dilengkapi',
    },
    correct_answers: {
      type: 'string[]',
      description: 'Daftar jawaban yang diterima',
    },
    is_ai_enabled: { type: 'boolean', description: 'Gunakan AI untuk menilai' },
    context: { type: 'string', description: 'Konteks untuk AI grader' },
    hint: { type: 'string', description: 'Petunjuk opsional' },
  },
  jsonExample: `{
  "type": "soalIsian",
  "attrs": {
    "question": "Lengkapi kalimat berikut dengan kata yang tepat:",
    "content": "Andi _____ roti di rumah.",
    "correct_answers": ["makan", "memakan"],
    "is_ai_enabled": false,
    "context": "",
    "hint": "Pikirkan aktivitas yang dilakukan dengan makanan"
  }
}`,
  htmlExample: `<soal-isian hint="Gunakan kata иду atau пошёл">
  <question>Terjemahkan kalimat berikut ke Bahasa Rusia:</question>
  <content>Saya pergi ke pasar</content>
  <kunci>Я иду на рынок</kunci>
  <kunci>Я пошёл на рынок</kunci>
</soal-isian>

<!-- Soal dengan konten kontekstual: -->
<soal-isian>
  <question>Lengkapi kalimat berikut dengan kata yang tepat:</question>
  <content>Dia _____ buku di perpustakaan kemarin.</content>
  <kunci>membaca</kunci>
</soal-isian>

<!-- Dengan AI grading: -->
<soal-isian auto-check>
  <question>Jelaskan dampak Revolusi Industri!</question>
  <context>Fokus pada aspek ekonomi</context>
</soal-isian>`,
};

export default Node.create({
  name: 'soalIsian',

  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    // Helper: Hapus nomor soal di awal teks
    const stripQuestionNumber = (text: string | null) => {
      if (!text) return text;
      return text.replace(/^\s*\d+[.):]\s*/g, '').trim();
    };

    return {
      question: {
        default: 'Tulis instruksi soal di sini...',
        parseHTML: (element: HTMLElement) =>
          stripQuestionNumber(
            element.querySelector('question')?.textContent ||
              element.getAttribute('question') ||
              '',
          ),
      },
      content: {
        default: '',
        parseHTML: (element: HTMLElement) =>
          element.querySelector('content')?.innerHTML.trim() ||
          element.getAttribute('content') ||
          '',
      },
      correct_answers: {
        default: [],
        parseHTML: (element: HTMLElement) => {
          const attr = element.getAttribute('correct_answers');
          if (attr) {
            try {
              const parsed = JSON.parse(attr);
              if (Array.isArray(parsed)) return parsed;
            } catch (e) {}
          }
          const keys = Array.from(element.querySelectorAll('kunci, answer')).map(
            (a) => a.textContent || '',
          );
          return keys.length > 0 ? keys : [];
        },
      },
      is_ai_enabled: {
        default: false,
        parseHTML: (element: HTMLElement) =>
          element.hasAttribute('auto-check') ||
          element.hasAttribute('is_ai_enabled') ||
          false,
      },
      context: {
        default: '',
        parseHTML: (element: HTMLElement) =>
          element.querySelector('context')?.textContent ||
          element.getAttribute('context') ||
          '',
      },
      hint: {
        default: '',
        parseHTML: (element: HTMLElement) =>
          element.getAttribute('hint') ||
          element.querySelector('hint')?.textContent ||
          '',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'soal-isian',
      },
    ];
  },

  renderHTML({ node }) {
    const correctAnswers = Array.isArray(node.attrs.correct_answers)
      ? node.attrs.correct_answers
      : [];
    const children: any[] = [['question', {}, node.attrs.question || '']];
    // Hanya tambahkan content jika tidak kosong
    if (node.attrs.content && node.attrs.content.trim()) {
      children.push(['content', {}, node.attrs.content]);
    }
    children.push(['context', {}, node.attrs.context || '']);
    children.push(...correctAnswers.map((ans) => ['kunci', {}, ans]));

    const attrs: any = {};
    if (node.attrs.is_ai_enabled) attrs['auto-check'] = true;
    if (node.attrs.hint) attrs['hint'] = node.attrs.hint;

    return ['soal-isian', attrs, ...children];
  },

  addNodeView() {
    return VueNodeViewRenderer(SoalIsianComponent);
  },

  addCommands() {
    return {
      insertSoalIsian:
        () =>
        ({ commands }: { commands: any }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { question: '', is_ai_enabled: false },
          });
        },
    } as any;
  },
});
