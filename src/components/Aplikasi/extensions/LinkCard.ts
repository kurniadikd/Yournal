import { mergeAttributes, Node, nodePasteRule, InputRule } from '@tiptap/core';
import { createSolidNodeView } from '../../../utils/SolidNodeView';
import LinkCardComponent from './LinkCardComponent';

export const LinkCard = Node.create({
  name: 'linkCard',

  group: 'block',

  atom: true, 

  draggable: true,

  addAttributes() {
    return {
      href: {
        default: null,
      },
      title: {
        default: null,
      },
      description: {
        default: null,
      },
      image: {
        default: null,
      },
      domain: {
        default: null,
      },
      favicon: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="link-card"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'link-card' })];
  },

  addCommands() {
    return {
      setLinkCard: (attributes) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: attributes,
        });
      },
    };
  },

  addPasteRules() {
    return [
      nodePasteRule({
        find: /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&//=]*)/g,
        type: this.type,
        getAttributes: (match) => ({
          href: match[0],
        }),
      }),
    ];
  },

  addInputRules() {
    return [
      new InputRule({
        find: /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&//=]*)\s$/g,
        handler: ({ state, range, match }) => {
          const { tr } = state;
          const start = range.from;
          const end = range.to;
          
          tr.replaceWith(start, end, this.type.create({
            href: match[0].trim(),
          }));
        },
      }),
    ];
  },

  addNodeView() {
    return createSolidNodeView(LinkCardComponent);
  },
});
