import { mergeAttributes, Node } from '@tiptap/core';
import { createSolidNodeView } from '../../../utils/SolidNodeView';
import FileAttachmentComponent from './FileAttachmentComponent.tsx';

export const FileAttachment = Node.create({
  name: 'fileAttachment',

  group: 'block',

  atom: true,

  draggable: true,

  addAttributes() {
    return {
      name: {
        default: 'Unnamed File',
      },
      size: {
        default: 0,
      },
      mimeType: {
        default: 'application/octet-stream',
      },
      src: {
        default: null,
      },
      uploadId: {
        default: null,
      },
      isLoading: {
        default: false,
        parseHTML: element => element.getAttribute('data-is-loading') === 'true',
        renderHTML: attributes => {
          if (!attributes.isLoading) return {};
          return { 'data-is-loading': 'true' };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="file-attachment"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'file-attachment' })];
  },

  addNodeView() {
    return createSolidNodeView(FileAttachmentComponent);
  },
});
