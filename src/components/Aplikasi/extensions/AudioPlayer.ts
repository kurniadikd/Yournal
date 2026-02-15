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
      },
      waveform: {
        default: [],
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
