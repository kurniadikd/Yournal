import { mergeAttributes, Node } from '@tiptap/core';
import { createSolidNodeView } from '../../../utils/SolidNodeView';
import AudioPlayerComponent from './AudioPlayerComponent';

export const AudioPlayer = Node.create({
  name: 'audioPlayer',

  group: 'block',

  atom: true,

  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      duration: {
        default: 0,
        parseHTML: (element: HTMLElement) => {
          const val = element.getAttribute('data-duration');
          return val ? parseFloat(val) : 0;
        },
        renderHTML: (attributes: Record<string, any>) => {
          return { 'data-duration': attributes.duration };
        },
      },
      waveform: {
        default: [],
        parseHTML: (element: HTMLElement) => {
          const val = element.getAttribute('data-waveform');
          if (!val) return [];
          try {
            return JSON.parse(val);
          } catch {
            return [];
          }
        },
        renderHTML: (attributes: Record<string, any>) => {
          return { 'data-waveform': JSON.stringify(attributes.waveform || []) };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="audio-player"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'audio-player' })];
  },

  addNodeView() {
    return createSolidNodeView(AudioPlayerComponent);
  },
});

