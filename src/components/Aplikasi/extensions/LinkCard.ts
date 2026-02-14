import { mergeAttributes, Node } from '@tiptap/core';
import { createSolidNodeView } from '../../../utils/SolidNodeView';
import LinkCardComponent from './LinkCardComponent';

export const LinkCard = Node.create({
  name: 'linkCard',

  group: 'block',

  // Atom true means it's treated as a single unit, cursor can't go inside
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

  addNodeView() {
    return createSolidNodeView(LinkCardComponent);
  },
});
