import { mergeAttributes, Node } from '@tiptap/core';
import { createSolidNodeView } from '../../../utils/SolidNodeView';
import VideoPlayerComponent from './VideoPlayerComponent';

export const VideoPlayer = Node.create({
  name: 'videoPlayer',

  group: 'block',

  atom: true,

  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      width: {
        default: '100%',
      },
      caption: {
        default: '',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="video-player"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'video-player' })];
  },

  addNodeView() {
    return createSolidNodeView(VideoPlayerComponent);
  },
});
