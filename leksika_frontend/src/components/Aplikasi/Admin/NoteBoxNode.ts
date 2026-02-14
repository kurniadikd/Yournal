import { Node, mergeAttributes } from '@tiptap/core';
import { VueNodeViewRenderer } from '@tiptap/vue-3';
import NoteBoxComponent from './NoteBoxComponent.vue';

export const documentation = {
  title: 'Note Box',
  description: 'Kotak informasi untuk catatan, tips, atau peringatan.',
  attrs: {
    type: {
      type: 'string',
      description: 'Tipe kotak: primary (info), secondary (tips), tertiary (warning).',
    },
    title: {
      type: 'string',
      description: 'Judul catatan.',
    },
  },
  htmlExample: `<note-box type="warning" title="Pengecualian">
  <p>Kata 'Who' tidak berubah menjadi 'Whom' dalam percakapan informal.</p>
</note-box>`,
};

export default Node.create({
  name: 'noteBox',

  group: 'block',
  content: 'block+',
  defining: true,
  draggable: true,

  addAttributes() {
    return {
      type: {
        default: 'primary',
        parseHTML: element => element.getAttribute('type'),
        renderHTML: attributes => ({
          type: attributes.type,
        }),
      },
      title: {
        default: 'Info',
        parseHTML: element => element.getAttribute('title'),
        renderHTML: attributes => ({
          title: attributes.title,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'note-box',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['note-box', mergeAttributes(HTMLAttributes), 0];
  },

  addNodeView() {
    return VueNodeViewRenderer(NoteBoxComponent);
  },

  addCommands() {
    return {
      insertNoteBox:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { type: 'primary', title: 'Info' },
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Tulis catatan di sini...' }] }],
          });
        },
    } as any;
  },
});
