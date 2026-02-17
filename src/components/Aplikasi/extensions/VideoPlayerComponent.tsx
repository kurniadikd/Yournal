import { Component, createSignal } from "solid-js";

const VideoPlayerComponent: Component<any> = (props) => {
  const src = () => props.node.attrs.src;
  
  const handleDelete = () => {
      props.deleteNode();
  };

  return (
    <div class="video-player-wrapper my-6 select-none group w-full relative" data-video-player>
      
      <div class="relative w-full rounded-[16px] overflow-hidden bg-black shadow-lg border border-[var(--color-outline-variant)]/20">
        <video 
            src={src()} 
            controls 
            class="w-full h-auto max-h-[500px]"
        >
            Browser Anda tidak mendukung tag video.
        </video>

        {/* Delete Button (Visible on Hover) */}
        <button 
            onClick={handleDelete}
            class="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 hover:bg-[var(--color-error)] text-white hover:text-[var(--color-on-error)] transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 z-10 backdrop-blur-sm"
            title="Hapus Video"
        >
             <span class="material-symbols-rounded text-[20px]">close</span>
        </button>
      </div>

    </div>
  );
};

export default VideoPlayerComponent;
