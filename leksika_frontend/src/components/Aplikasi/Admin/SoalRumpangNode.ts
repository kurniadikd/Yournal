import { Node, mergeAttributes } from '@tiptap/core';
import { VueNodeViewRenderer } from '@tiptap/vue-3';
import SoalRumpangComponent from './SoalRumpangComponent.vue';

// --- DOKUMENTASI KOMPONEN (Dibaca Dinamis oleh ManajemenMateriSource) ---
export const documentation = {
  title: 'Soal Kalimat Rumpang',
  description:
    'Kalimat dengan bagian kosong yang harus diisi dengan menarik kata (drag-and-drop).',
  attrs: {
    instruction: { type: 'string', description: 'Instruksi untuk siswa' },
    content: {
      type: 'string',
      description: 'Kalimat asli/sumber (opsional) untuk referensi terjemahan',
    },
    question: { type: 'string', description: 'Pertanyaan inti (mirip PG)' }, // [NEW] feature
    sentence: {
      type: 'string',
      description: 'Kalimat dengan [jawaban] dalam kurung siku',
    },
    distractors: { type: 'string[]', description: 'Kata-kata pengecoh' },
    hint: {
      type: 'string',
      description: 'Petunjuk opsional untuk membantu siswa',
    },
  },
  jsonExample: `{
  "type": "soalRumpang",
  "attrs": {
    "instruction": "Lengkapi kalimat",
    "content": "Mother went to market.",
    "question": "Terjemahkan kalimat ini",
    "sentence": "Ibu pergi ke [pasar].",
    "distractors": ["kantor"]
  }
}`,
  htmlExample: `<soal-rumpang>
  <instruction>Lengkapi kalimat</instruction>
  <sentence>Ibu pergi ke [pasar].</sentence>
  <content>Mother went to market.</content>
  <question>Terjemahkan kalimat ini</question>
  <distractors>kantor||sekolah||taman</distractors>
  <hint>Tempat belanja sayur</hint>
</soal-rumpang>`,
};

export default Node.create({
  name: 'soalRumpang',

  group: 'block',

  atom: true,

  draggable: true,

  addAttributes() {
    // Helper: Hapus nomor soal di awal teks (e.g., "1.", "14.", "1)", "1:")
    const stripQuestionNumber = (text: string | null) => {
      if (!text) return text;
      return text.replace(/^\s*\d+[.):]\s*/g, '').trim();
    };

    return {
      instruction: {
        default: '',
        parseHTML: (element: HTMLElement) =>
          stripQuestionNumber(element.querySelector('instruction')?.textContent || element.getAttribute('instruction')),
      },
      content: {
        default: '',
        parseHTML: (element: HTMLElement) => 
          element.querySelector('translation')?.textContent || 
          element.querySelector('content')?.textContent || 
          element.getAttribute('content'),
      },
      question: {
        default: '',
        parseHTML: (element: HTMLElement) =>
          stripQuestionNumber(element.querySelector('question')?.textContent || element.getAttribute('question')),
      },
      sentence: {
        default: '',
        parseHTML: (element: HTMLElement) => 
          element.querySelector('sentence')?.textContent || 
          element.getAttribute('sentence') || 
          null,
      },
      distractors: {
        default: [],
        parseHTML: (element: HTMLElement) => {
          const attr = element.getAttribute('distractors');
          if (attr) {
            try {
              const parsed = JSON.parse(attr);
              if (Array.isArray(parsed)) {
                return parsed.filter(item => typeof item === 'string' && item.length >= 1);
              }
            } catch (e) {}
          }
          
          // Child tag support
          let distractors = Array.from(element.querySelectorAll('distractors val')).map(n => n.textContent || '');
          if (distractors.length === 0) {
            const distractorsNode = element.querySelector('distractors');
            if (distractorsNode && distractorsNode.textContent && distractorsNode.textContent.includes('||')) {
              distractors = distractorsNode.textContent.split('||').map(s => s.trim()).filter(s => s);
            }
          }
          if (distractors.length === 0) {
            distractors = Array.from(element.querySelectorAll('distractor')).map(n => n.textContent || '');
          }
          return distractors.length > 0 ? distractors : [];
        },
      },
      hint: {
        default: '',
        parseHTML: (element: HTMLElement) => 
          element.querySelector('hint')?.textContent || 
          element.getAttribute('hint') || 
          '',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'soal-rumpang',
        getAttrs: (node: string | HTMLElement) => {
          if (typeof node === 'string') return null;

          // Priority 1: Check for JSON attributes (for round-trip)
          const sentenceAttr = node.getAttribute('sentence');
          const distractorsAttr = node.getAttribute('distractors');
          
          if (sentenceAttr && distractorsAttr) return null; // Let addAttributes handle it

          // Priority 2: Check for child elements (for AI generation / clean source)
          const instruction = node.querySelector('instruction')?.textContent || node.getAttribute('instruction') || '';
          const sentence = node.querySelector('sentence')?.textContent || node.getAttribute('sentence') || '';
          const content = node.querySelector('translation')?.textContent || node.querySelector('content')?.textContent || node.getAttribute('content') || '';
          const question = node.querySelector('question')?.textContent || node.getAttribute('question') || '';
          
          // Legacy support for <distractors><val>...
          let distractors = Array.from(node.querySelectorAll('distractors val')).map(n => n.textContent || '');
          
          // New support for <distractors>item1||item2</distractors>
          if (distractors.length === 0) {
            const distractorsNode = node.querySelector('distractors');
            if (distractorsNode && distractorsNode.textContent && distractorsNode.textContent.includes('||')) {
              distractors = distractorsNode.textContent.split('||').map(s => s.trim()).filter(s => s);
            }
          }

          // New support for individual <distractor>...
          if (distractors.length === 0) {
            distractors = Array.from(node.querySelectorAll('distractor')).map(n => n.textContent || '');
          }
          
          const hint = node.querySelector('hint')?.textContent || node.getAttribute('hint') || '';

          if (sentence) {
            return { instruction, sentence, content, question, distractors, hint };
          }

          return null;
        },
      },
    ];
  },

  renderHTML({ node }) {
    const distractors = Array.isArray(node.attrs.distractors)
      ? node.attrs.distractors
      : [];

    const children: any[] = [
      ['instruction', {}, node.attrs.instruction || ''],
      ['sentence', {}, node.attrs.sentence || ''],
    ];

    if (node.attrs.content) {
      children.push(['content', {}, node.attrs.content]);
    }

    if (node.attrs.question) {
      children.push(['question', {}, node.attrs.question]);
    }

    if (distractors.length > 0) {
      children.push(['distractors', {}, distractors.join('||')]);
    }

    if (node.attrs.hint) {
      children.push(['hint', {}, node.attrs.hint]);
    }

    return ['soal-rumpang', {}, ...children];
  },

  addNodeView() {
    return VueNodeViewRenderer(SoalRumpangComponent);
  },

  addCommands() {
    return {
      insertSoalRumpang:
        () =>
        ({ commands }: { commands: any }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              instruction: '',
              content: '',
              sentence: '',
              distractors: [],
            },
          });
        },
    } as any;
  },
});
