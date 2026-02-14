import { Node, mergeAttributes } from '@tiptap/core';
import { VueNodeViewRenderer } from '@tiptap/vue-3';
import SoalPilihanGandaComponent from './SoalPilihanGandaComponent.vue';

// --- DOKUMENTASI KOMPONEN (Dibaca Dinamis oleh ManajemenMateriSource) ---
export const documentation = {
  title: 'Soal Pilihan Ganda',
  description:
    'Soal dengan beberapa pilihan jawaban. Bisa memiliki satu atau lebih jawaban benar.',
  attrs: {
    instruction: {
      type: 'string',
      description:
        'Instruksi soal (e.g. "Baca teks berikut..."). JIKA content_type="none", tulis pertanyaan lengkap di sini.',
    },
    question: {
      type: 'string',
      description:
        'Pertanyaan inti (e.g. "Siapa nama tokoh utama?"). KOSONGKAN jika content_type="none".',
    },
    content_type: {
      type: 'string',
      description: "'text' | 'dialogue' | 'none'",
    },
    content_data: {
      type: 'string|json',
      description:
        'Teks bacaan ATAU Array Dialog [{"speaker":"A", "text":"..."}]',
    },
    options: { type: 'array', description: 'Array objek {text: "..."}' },
    correct_answers: {
      type: 'number[]',
      description: 'Index jawaban benar (0-based)',
    },
    hint: { type: 'string', description: 'Petunjuk opsional' },
  },
  jsonExample: `{
  "type": "soalPilihanGanda",
  "attrs": {
    "instruction": "Pilih jawaban yang benar: I ... (eat) apple.",
    "question": "",
    "content_type": "none",
    "content_data": null,
    "options": [{"text":"ate"},{"text":"eaten"}],
    "correct_answers": [0]
  }
}`,
  htmlExample: `<soal-pg hint="Petunjuk opsional">
  <instruction>Pilih jawaban yang benar:</instruction>
  <question>I ... (eat) apple.</question>
  <option correct="true">ate</option>
  <option>eaten</option>
</soal-pg>`,
};

export default Node.create({
  name: 'soalPilihanGanda',

  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    // Helper: Hapus nomor soal di awal teks (e.g., "1.", "14.", "1)", "1:")
    const stripQuestionNumber = (text: string | null) => {
      if (!text) return text;
      // Pattern: nomor di awal, diikuti titik/kurung/titik dua, lalu spasi
      // Contoh yang akan dihapus: "1. ", "14. ", "1) ", "1: ", "1.", "14."
      return text.replace(/^\s*\d+[.):]\s*/g, '').trim();
    };

    return {
      instruction: {
        default: 'Tulis instruksi di sini...',
        parseHTML: (element: HTMLElement) => {
          const raw =
            element.querySelector('instruction')?.innerHTML ||
            element.getAttribute('instruction') ||
            element.querySelector('question')?.innerHTML || // Legacy fallback
            element.getAttribute('question') ||
            null;
          return stripQuestionNumber(raw);
        },
      },
      speakers: {
        default: [],
        parseHTML: (element: HTMLElement) => {
           // Parse speakers from content/context
           const contentEl = element.querySelector('content') || element.querySelector('context');
           if (contentEl) {
             const speakersEl = contentEl.querySelector('speakers');
             if (speakersEl) {
                return Array.from(speakersEl.querySelectorAll('speaker')).map(s => ({
                  id: s.getAttribute('id') || '',
                  name: s.getAttribute('name') || '',
                }));
             }
           }
           return [];
        }
      },
      content_type: {
        default: 'none',
        parseHTML: (element: HTMLElement) => {
          const attr = element.getAttribute('content_type');
          if (attr) return attr;
          const contentEl = element.querySelector('content') || element.querySelector('context');
          if (contentEl) {
            // Check for dialogue
            const isDialogue = 
                contentEl.getAttribute('type') === 'dialogue' || 
                contentEl.querySelector('dialog') ||
                contentEl.querySelector('speakers') || // Also check for speakers
                // Check if inner content is escaped HTML that decodes to dialogue
                (contentEl.textContent && contentEl.textContent.includes('&lt;dialog'));
            
            return isDialogue ? 'dialogue' : 'text';
          }
          return 'none';
        },
      },
      content_data: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const attr = element.getAttribute('content_data');
          if (attr) {
            try { return JSON.parse(attr); } catch (e) { return attr; }
          }
          const contentEl = element.querySelector('content') || element.querySelector('context');
          if (contentEl) {
            // Helper to decode HTML entities
            const decodeHtml = (html: string) => {
              const txt = document.createElement('textarea');
              txt.innerHTML = html;
              return txt.value;
            };

            let rawHTML = contentEl.innerHTML;
            // Defensive: If it looks like double escaped HTML (starts with &lt;), decode it
            if (rawHTML.trim().startsWith('&lt;') || contentEl.textContent?.trim().startsWith('<')) {
                 // Try getting textContent which usually unescapes one level if it was treated as text
                 rawHTML = contentEl.textContent || rawHTML; 
            }

            // Create a temp container to parse the potentially decoded HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = rawHTML;

            const isDialogue = 
                contentEl.getAttribute('type') === 'dialogue' || 
                tempDiv.querySelector('dialog') ||
                tempDiv.querySelector('speakers');
            
            if (isDialogue) {
              return Array.from(tempDiv.querySelectorAll('dialog')).map(d => ({
                speaker: d.getAttribute('id') || d.getAttribute('tokoh') || d.getAttribute('speaker') || d.getAttribute('name') || '',
                text: d.textContent || '',
                translation: d.getAttribute('arti') || d.getAttribute('translation') || ''
              }));
            }
            return rawHTML.trim();
          }
          return null;
        },
      },
      question: {
        default: '',
        parseHTML: (element: HTMLElement) => {
          const qTag = element.querySelector('question');
          if (qTag && (element.querySelector('instruction') || element.hasAttribute('instruction'))) {
             return qTag.innerHTML.trim();
          }
          const oldPrompt = element.getAttribute('question_prompt') || element.querySelector('question_prompt')?.textContent;
          if (oldPrompt) return oldPrompt;
          if (element.hasAttribute('instruction') || element.querySelector('instruction')) {
            return element.getAttribute('question') || '';
          }
          return '';
        },
      },
      options: {
        default: [{ text: 'Opsi A' }, { text: 'Opsi B' }],
        parseHTML: (element: HTMLElement) => {
          const attr = element.getAttribute('options');
          if (attr) {
            try { return JSON.parse(attr); } catch (e) { return null; }
          }
          const opts = Array.from(element.querySelectorAll('option'));
          if (opts.length > 0) {
            return opts.map(opt => ({ text: opt.innerHTML || '' }));
          }
          return null;
        },
      },
      correct_answers: {
        default: [0],
        parseHTML: (element: HTMLElement) => {
          const attr = element.getAttribute('correct_answers');
          if (attr) {
            try {
              const parsed = JSON.parse(attr);
              return Array.isArray(parsed) ? parsed : [parsed];
            } catch (e) { return null; }
          }
          const opts = Array.from(element.querySelectorAll('option'));
          if (opts.length > 0) {
            return opts.map((opt, idx) => opt.hasAttribute('kunci') ? idx : -1).filter(idx => idx !== -1);
          }
          return null;
        },
      },
      hint: {
        default: '',
        parseHTML: (element: HTMLElement) =>
          element.querySelector('hint')?.innerHTML ||
          element.getAttribute('hint') ||
          null,
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'soal-pilihan-ganda' },
      {
        tag: 'soal-pg',
        getAttrs: (node: string | HTMLElement) => {
          if (typeof node === 'string') return null;
          // Prioritas 1: Baca dari atribut JSON
          const optionsAttr = node.getAttribute('options');
          const correctAttr = node.getAttribute('correct_answers');

          if (optionsAttr) {
            try {
              const options = JSON.parse(optionsAttr);
              const correct_answers = correctAttr
                ? JSON.parse(correctAttr)
                : [0];
              // Parse Instruction & Question
              const instruction =
                node.getAttribute('instruction') ||
                node.getAttribute('question') ||
                node.querySelector('instruction')?.textContent ||
                node.querySelector('question')?.textContent ||
                '';

              const oldPrompt = node.getAttribute('question_prompt');
              const hasInstruction =
                node.hasAttribute('instruction') ||
                node.querySelector('instruction');

              let question = '';
              if (oldPrompt) question = oldPrompt;
              else if (hasInstruction)
                question = node.getAttribute('question') || '';

              const hint = node.getAttribute('hint') || '';

              // Ensure vars are defined before return
              const content_type = node.getAttribute('content_type') || 'none';
              const content_data_attr = node.getAttribute('content_data');
              let content_data = null;
              if (content_data_attr) {
                  try {
                      content_data = JSON.parse(content_data_attr);
                  } catch (e) {
                      content_data = content_data_attr;
                  }
              }

              // Parse speakers from JSON if available? No, usually in content structure.
              // We'll rely on parseHTML defaults or check attrs
              const speakers = []; 

              return {
                instruction,
                options,
                correct_answers,
                hint,
                content_type,
                content_data,
                question,
                speakers
              };
            } catch (e) {
              // Fallback ke parsing elemen anak
            }
          }

          // Prioritas 2: Baca dari elemen anak (Backward Compatibility)
          const instruction =
            node.querySelector('instruction')?.innerHTML ||
            node.querySelector('question')?.innerHTML ||
            '';
          const optionElements = Array.from(node.querySelectorAll('option'));
          const options = optionElements.map((opt) => ({
            text: opt.innerHTML || '',
          }));
          const correct_answers = optionElements
            .map((opt, index) => (opt.hasAttribute('kunci') ? index : -1))
            .filter((index) => index !== -1);

          const hint =
            node.getAttribute('hint') ||
            node.querySelector('hint')?.textContent ||
            '';

          // Context / Content Data Parsing
          let content_type = node.getAttribute('content_type') || 'none';
          let content_data: any = null;
          let speakers: any[] = [];

          // Coba baca dari atribut content_data dulu
          const contentDataAttr = node.getAttribute('content_data');
          if (contentDataAttr) {
            try { content_data = JSON.parse(contentDataAttr); } catch(e) { content_data = contentDataAttr; }
          }

          // Jika tidak ada di atribut, cari elemen <content> (Preferred) atau <context> (Legacy)
          if (!content_data) {
             const contentEl = node.querySelector('content') || node.querySelector('context');
             if (contentEl) {
                // Cek apakah mode dialog (punya anak <dialog> atau atribut type="dialogue")
                const isDialogue = contentEl.getAttribute('type') === 'dialogue' || contentEl.querySelector('dialog') || contentEl.querySelector('speakers');
                
                if (isDialogue) {
                    content_type = 'dialogue';
                    
                    // Parse Speakers
                    const speakersEl = contentEl.querySelector('speakers');
                    if (speakersEl) {
                        speakers = Array.from(speakersEl.querySelectorAll('speaker')).map(s => ({
                            id: s.getAttribute('id') || '',
                            name: s.getAttribute('name') || ''
                        }));
                    }

                    // Parse Dialogs
                    content_data = Array.from(contentEl.querySelectorAll('dialog')).map(d => ({
                        speaker: d.getAttribute('id') || d.getAttribute('tokoh') || d.getAttribute('speaker') || 'A',
                        text: d.textContent || '',
                        translation: d.getAttribute('arti') || d.getAttribute('translation') || ''
                    }));
                } else {
                    content_type = 'text';
                    content_data = contentEl.innerHTML.trim();
                }
             }
          }

          // Prioritize explicit <question> tag if present
          const questionEl = node.querySelector('question');
          let question = questionEl ? questionEl.innerHTML.trim() : '';
          
          // If no <question> tag, check legacy logic (instruction as question?)
          if (!question) {
             const oldPrompt = node.getAttribute('question_prompt');
             const hasInstruction = node.hasAttribute('instruction') || node.querySelector('instruction');
             if (oldPrompt) question = oldPrompt;
             else if (hasInstruction) question = node.getAttribute('question') || '';
          }

          return { instruction, options, correct_answers, hint, content_type, content_data, question, speakers };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const options = Array.isArray(node.attrs.options) ? node.attrs.options : [];
    const correctAnswers = Array.isArray(node.attrs.correct_answers)
      ? node.attrs.correct_answers
      : [0];
    const speakers = Array.isArray(node.attrs.speakers) ? node.attrs.speakers : [];

    // children structure
    const children: any[] = [
      ['instruction', {}, node.attrs.instruction || ''],
    ];

    if (node.attrs.question) {
      children.push(['question', {}, node.attrs.question]);
    }

    if (node.attrs.content_type && node.attrs.content_type !== 'none') {
      if (node.attrs.content_type === 'dialogue' && Array.isArray(node.attrs.content_data)) {
         
         const contentChildren = [];
         
         // Render Speakers if exist
         if (speakers.length > 0) {
            const speakerNodes = speakers.map((s: any) => ['speaker', { id: s.id, name: s.name }]);
            contentChildren.push(['speakers', {}, ...speakerNodes]);
         }

         const dialogs = node.attrs.content_data.map((d: any) => [
            'dialog', 
            { id: d.speaker, arti: d.translation }, // Use 'id' now, maps to old 'tokoh'
            d.text
         ]);
         
         contentChildren.push(...dialogs);

         children.push(['content', { type: 'dialogue' }, ...contentChildren]);
      } else {
         children.push(['content', {}, node.attrs.content_data || '']);
      }
    }

    children.push(...options.map((opt, idx) => {
      const attrs: any = {};
      if (correctAnswers.includes(idx)) attrs.kunci = 'true';
      return ['option', attrs, opt.text];
    }));

    if (node.attrs.hint) {
      children.push(['hint', {}, node.attrs.hint]);
    }

    return ['soal-pg', {}, ...children];
  },

  addNodeView() {
    return VueNodeViewRenderer(SoalPilihanGandaComponent);
  },

  addCommands() {
    return {
      insertSoalPilihanGanda:
        () =>
        ({ commands }: { commands: any }) => {
          return commands.insertContent({
            type: this.name,
          });
        },
    } as any;
  },
});
