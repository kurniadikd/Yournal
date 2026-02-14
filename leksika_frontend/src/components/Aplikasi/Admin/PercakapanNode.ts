import { Node, mergeAttributes } from '@tiptap/core';
import { VueNodeViewRenderer } from '@tiptap/vue-3';
import PercakapanComponent from './PercakapanComponent.vue';

export const documentation = {
  title: 'Percakapan (Dwibahasa)',
  description: 'Dialog dwibahasa untuk latihan percakapan dengan terjemahan.',
  attrs: {
    messages: {
      type: 'array',
      description:
        'Array objek {speaker: "A"|"B", text: "...", translation: "..."}',
    },
  },
  jsonExample: `{ "type": "percakapan", "attrs": { "messages": [...] } }`,
  htmlExample: `<percakapan>
  <dialog tokoh="A" arti="Halo!">Привет!</dialog>
  <dialog tokoh="B" arti="Apa kabar?">Как дела?</dialog>
</percakapan>`,
};

export default Node.create({
  name: 'percakapan',

  group: 'block',

  atom: true,

  draggable: true,

  addAttributes() {
    return {
      speakers: {
        default: [],
        parseHTML: (element: HTMLElement) => {
           const speakersEl = element.querySelector('speakers');
           if (speakersEl) {
             return Array.from(speakersEl.querySelectorAll('speaker')).map(s => ({
               id: s.getAttribute('id') || '',
               name: s.getAttribute('name') || '',
             }));
           }
           return [];
        }
      },
      messages: {
        default: [
          { speaker: 'A', text: 'Privet!', translation: 'Halo!' },
          { speaker: 'B', text: 'Kak dela?', translation: 'Apa kabar?' },
        ],
        // PENTING: parseHTML untuk atribut
        parseHTML: (element: HTMLElement) => {
          const attr = element.getAttribute('messages');
          if (attr) {
            try {
              return JSON.parse(attr);
            } catch (e) {
              return [];
            }
          }
          return null;
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'percakapan',
        getAttrs: (node: string | HTMLElement) => {
          if (typeof node === 'string') return null;
          
          const result: any = {};

          // 1. Parse Speakers
          const speakersEl = node.querySelector('speakers');
          if (speakersEl) {
             result.speakers = Array.from(speakersEl.querySelectorAll('speaker')).map(s => ({
               id: s.getAttribute('id') || '',
               name: s.getAttribute('name') || '',
             }));
          }

          // 2. Parse Messages (Dialogs)
          // Prioritas 1: Baca dari Atribut JSON
          const messagesAttr = node.getAttribute('messages');
          if (messagesAttr) {
            try {
              result.messages = JSON.parse(messagesAttr);
            } catch (e) {}
          }

          // Prioritas 2: Baca dari Anak Elemen (<dialog>)
          if (!result.messages) {
            const dialogs = node.querySelectorAll('dialog');
            if (dialogs.length > 0) {
              result.messages = Array.from(dialogs).map((m) => ({
                speaker: m.getAttribute('id') || m.getAttribute('tokoh') || 'A', // Support ID or legacy tokoh
                text: m.textContent || '',
                translation: m.getAttribute('arti') || '',
              }));
            }
          }

          return result;
        },
      },
      {
        tag: 'div[data-type="percakapan"]',
      },
    ];
  },

  renderHTML({ node }) {
    const messages = (node.attrs.messages as any[]) || [];
    const speakers = (node.attrs.speakers as any[]) || [];

    // Render speakers definitions
    const speakerElements = speakers.map(s => [
      'speaker', { id: s.id, name: s.name }
    ]);
    
    // Render dialogs
    const dialogElements = messages.map((msg) => [
      'dialog',
      {
        id: msg.speaker || 'A', // Use ID usage for consistency
        arti: msg.translation || '',
      },
      msg.text || '',
    ]);

    const children = [];
    if (speakerElements.length > 0) {
        children.push(['speakers', {}, ...speakerElements]);
    }
    children.push(...dialogElements);

    return ['percakapan', {}, ...children];
  },

  addNodeView() {
    return VueNodeViewRenderer(PercakapanComponent);
  },

  addCommands() {
    return {
      insertPercakapan:
        () =>
        ({ commands }: { commands: any }) => {
          return commands.insertContent({
            type: this.name,
          });
        },
    } as any;
  },
});
