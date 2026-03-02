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
        parseHTML: element => element.getAttribute('data-name') || element.getAttribute('name') || 'Unnamed File',
        renderHTML: attributes => {
          if (!attributes.name) return {};
          return { 'data-name': attributes.name };
        },
      },
      size: {
        default: 0,
        parseHTML: element => {
          const val = element.getAttribute('data-size') || element.getAttribute('size');
          return val ? parseInt(val, 10) : 0;
        },
        renderHTML: attributes => {
          if (attributes.size === null || attributes.size === undefined) return {};
          return { 'data-size': attributes.size.toString() };
        },
      },
      mimeType: {
        default: 'application/octet-stream',
        parseHTML: element => element.getAttribute('data-mime') || element.getAttribute('mimeType') || 'application/octet-stream',
        renderHTML: attributes => {
          if (!attributes.mimeType) return {};
          return { 'data-mime': attributes.mimeType };
        },
      },
      src: {
        default: null,
        parseHTML: element => element.getAttribute('data-src') || element.getAttribute('src'),
        renderHTML: attributes => {
          if (!attributes.src) return {};
          return { 'data-src': attributes.src };
        },
      },
      uploadId: {
        default: null,
        parseHTML: element => element.getAttribute('data-upload-id') || element.getAttribute('uploadId'),
        renderHTML: attributes => {
          if (!attributes.uploadId) return {};
          return { 'data-upload-id': attributes.uploadId };
        },
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
