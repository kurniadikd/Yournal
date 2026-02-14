import { Node, mergeAttributes } from '@tiptap/core';
import { VueNodeViewRenderer } from '@tiptap/vue-3';
import SoalKelompokanComponent from './SoalKelompokanComponent.vue';

// --- DOKUMENTASI KOMPONEN (Dibaca Dinamis oleh ManajemenMateriSource) ---
export const documentation = {
  title: 'Soal Kelompokan',
  description:
    'Soal mengelompokkan item-item ke dalam kategori yang tepat. Setiap kategori bisa memiliki satu atau lebih jawaban benar.',
  attrs: {
    instruction: { type: 'string', description: 'Instruksi untuk siswa' },
    pairs: {
      type: 'array',
      description:
        'Array objek {question: "Nama kategori", correct_answers: ["item1", "item2"]}',
    },
    word_bank: {
      type: 'string[]',
      description:
        'Item tambahan sebagai pengecoh (tidak masuk kategori manapun)',
    },
    hint: {
      type: 'string',
      description: 'Petunjuk opsional untuk membantu siswa',
    },
  },
  jsonExample: `{
  "type": "soalKelompokan",
  "attrs": {
    "instruction": "Kelompokkan kata-kata berikut ke dalam kategori yang tepat",
    "pairs": [
      {"question": "Kata Benda", "correct_answers": ["Meja", "Kursi", "Buku"]},
      {"question": "Kata Kerja", "correct_answers": ["Berlari", "Menulis", "Membaca"]}
    ],
    "word_bank": ["Indah", "Cepat"]
  }
}`,
  htmlExample: `<soal-kelompokan instruction="Kelompokkan kata-kata berikut">
  <category name="Kata Benda" items="Meja||Kursi||Buku"></category>
  <category name="Kata Kerja" items="Berlari||Menulis"></category>
  <bank>Indah</bank>
  <bank>Cepat</bank>
  <hint>Perhatikan jenis katanya</hint>
</soal-kelompokan>`,
};

export default Node.create({
  name: 'soalKelompokan',
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
      instruction: {
        default: 'Kelompokkan item berikut ke dalam kategori yang benar!',
        parseHTML: (element: HTMLElement) =>
          stripQuestionNumber(
            element.querySelector('instruction')?.textContent ||
              element.getAttribute('instruction'),
          ),
      },
      word_bank: {
        default: [],
        parseHTML: (element: HTMLElement) => {
          const attr = element.getAttribute('word_bank');
          if (attr) {
            try {
              return JSON.parse(attr);
            } catch (e) {}
          }
          const bankItems = Array.from(element.querySelectorAll('bank')).map(
            (b) => b.textContent || '',
          );
          return bankItems.length > 0 ? bankItems : [];
        },
      },
      pairs: {
        default: [],
        parseHTML: (element: HTMLElement) => {
          const attr = element.getAttribute('pairs');
          if (attr) {
            try {
              return JSON.parse(attr);
            } catch (e) {}
          }
          const categoryNodes = element.querySelectorAll('category, pair');
          if (categoryNodes.length > 0) {
            return Array.from(categoryNodes).map((c) => ({
              question: c.getAttribute('name') || c.getAttribute('q') || '',
              correct_answers: (c.getAttribute('items') || c.getAttribute('a') || '')
                .split('||')
                .filter((i) => i),
            }));
          }
          return [];
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
      { tag: 'soal-kelompokan' },
      { tag: 'soal-cocokan' },
      { tag: 'soal-jodohkan' },
    ];
  },
  renderHTML({ node }) {
    const pairs = Array.isArray(node.attrs.pairs) ? node.attrs.pairs : [];
    const wordBank = Array.isArray(node.attrs.word_bank)
      ? node.attrs.word_bank
      : [];

    const children: any[] = [
      ['instruction', {}, node.attrs.instruction || ''],
    ];

    children.push(...pairs.map(p => ['category', { name: p.question, items: (p.correct_answers || []).join('||') }]));
    
    children.push(...wordBank.map(item => ['bank', {}, item]));

    if (node.attrs.hint) {
      children.push(['hint', {}, node.attrs.hint]);
    }

    return ['soal-kelompokan', {}, ...children];
  },
  addNodeView() {
    return VueNodeViewRenderer(SoalKelompokanComponent);
  },
  addCommands() {
    return {
      insertSoalKelompokan:
        () =>
        ({ commands }: { commands: any }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              word_bank: [],
              pairs: [{ question: 'Kategori...', correct_answers: [] }],
            },
          });
        },
    } as any;
  },
});
