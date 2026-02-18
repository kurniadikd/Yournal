import { mergeAttributes, Node, nodeInputRule } from '@tiptap/core';
import { createSolidNodeView } from '../../../utils/SolidNodeView';
import MathComponent from './MathComponent';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    equation: {
      setEquation: (options: { latex: string }) => ReturnType;
    };
  }
}

export const Mathematics = Node.create({
  name: 'equation',

  group: 'block',

  atom: true,

  draggable: true,

  addAttributes() {
    return {
      latex: {
        default: 'E = mc^2',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="equation"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'equation' })];
  },

  addNodeView() {
    return createSolidNodeView(MathComponent);
  },

  addCommands() {
    return {
      setEquation:
        (options: { latex: string }) =>
        ({ commands }: { commands: any }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: /^\$\$ $/,
        type: this.type,
      }),
    ];
  },
});
