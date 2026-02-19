import { Component } from "solid-js";

const VideoPlayerComponent: Component<{
  node: any;
  updateAttributes: (attrs: any) => void;
  selected: boolean;
  deleteNode: () => void;
  extension: any;
  getPos: () => number;
}> = (props) => {
  const src = () => props.node.attrs.src;

  return (
    <div class={`selectable-image-wrapper ${props.selected ? 'ProseMirror-selectednode' : ''} video-player-wrapper my-6 relative rounded-[16px] transition-all duration-300 w-full ${
      props.selected 
        ? 'shadow-[0_0_0_3px_var(--color-secondary)]' 
        : 'shadow-[0_0_0_0_var(--color-secondary)]'
    }`} data-video-player>
      
      <div class="relative w-full rounded-[16px] overflow-hidden bg-black shadow-lg border border-[var(--color-outline-variant)]/20">
        <video 
            src={src()} 
            controls 
            class="w-full h-auto max-h-[500px]"
        >
            Browser Anda tidak mendukung tag video.
        </video>
      </div>

      {/* Persis tombol hapus SelectableImage */}
      <button 
        class="image-delete-btn"
        style={{ display: props.selected ? 'flex' : 'none' }}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); props.deleteNode(); }}
      >
        <span class="material-symbols-rounded">close</span>
      </button>
    </div>
  );
};

export default VideoPlayerComponent;
