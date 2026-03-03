import { mergeAttributes, Node } from '@tiptap/core';
import { createSolidNodeView } from '../../../utils/SolidNodeView';
import FileAttachmentComponent from './FileAttachmentComponent';

export const FileAttachment = Node.create({
  name: 'fileAttachment',

  group: 'block',

  atom: true,

  draggable: true,

  addAttributes() {
    return {
      name: {
        default: 'Unnamed File',
        parseHTML: element => element.getAttribute('data-name') || 'Unnamed File',
        renderHTML: attributes => ({ 'data-name': attributes.name }),
      },
      size: {
        default: 0,
        parseHTML: element => parseInt(element.getAttribute('data-size') || '0'),
        renderHTML: attributes => ({ 'data-size': attributes.size }),
      },
      mimeType: {
        default: 'application/octet-stream',
        parseHTML: element => element.getAttribute('data-mime-type'),
        renderHTML: attributes => ({ 'data-mime-type': attributes.mimeType }),
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
