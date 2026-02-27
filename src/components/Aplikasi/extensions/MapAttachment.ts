import { mergeAttributes, Node } from '@tiptap/core';
import { createSolidNodeView } from '../../../utils/SolidNodeView';
import MapAttachmentComponent from './MapAttachmentComponent';

export const MapAttachment = Node.create({
  name: 'mapAttachment',

  group: 'block',

  atom: true,

  draggable: true,

  addAttributes() {
    return {
      name: {
        default: null,
      },
      lat: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const val = element.getAttribute('lat');
          return val !== null ? parseFloat(val) : null;
        },
      },
      lng: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const val = element.getAttribute('lng');
          return val !== null ? parseFloat(val) : null;
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="map-attachment"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'map-attachment' })];
  },

  addCommands() {
    return {
      insertMapAttachment: (attributes) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: attributes,
        });
      },
    };
  },

  addNodeView() {
    return createSolidNodeView(MapAttachmentComponent);
  },
});
