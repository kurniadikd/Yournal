import { Component, createSignal, onCleanup, Show } from "solid-js";

const VideoPlayerComponent: Component<{
  node: any;
  updateAttributes: (attrs: any) => void;
  selected: boolean;
  deleteNode: () => void;
  extension: any;
  getPos: () => number;
}> = (props) => {
  const src = () => props.node.attrs.src;
  
  // Selection state tracking for click-while-selected pattern
  let wasSelectedOnMousedown = false;
  const handleMouseDown = () => {
    wasSelectedOnMousedown = props.selected;
  };

  // Video Player State
  const [videoRef, setVideoRef] = createSignal<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = createSignal(false);
  const [currentTime, setCurrentTime] = createSignal(0);
  const [duration, setDuration] = createSignal(0);
  const [isMuted, setIsMuted] = createSignal(false);
  const [isFullscreen, setIsFullscreen] = createSignal(false);
  const [showControls, setShowControls] = createSignal(true);
  
  let controlsTimeout: number | undefined;

  // Format time in mm:ss
  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Play/Pause toggle (only if selected)
  const togglePlay = (e?: Event) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    // Only toggle if the component was already selected, matching the image/map interaction
    if (!wasSelectedOnMousedown || !props.selected) return;

    const v = videoRef();
    if (!v) return;

    if (v.paused) {
      v.play().catch(console.error);
    } else {
      v.pause();
    }
    
    // Show controls momentarily when paused/played
    wakeControls();
  };

  const handleTimeUpdate = (e: Event) => {
    const v = e.target as HTMLVideoElement;
    setCurrentTime(v.currentTime);
  };

  const handleLoadedMetadata = (e: Event) => {
    const v = e.target as HTMLVideoElement;
    setDuration(v.duration);
  };

  const handleSeek = (e: Event) => {
    e.stopPropagation();
    const target = e.target as HTMLInputElement;
    const time = parseFloat(target.value);
    const v = videoRef();
    if (v) {
      v.currentTime = time;
      setCurrentTime(time);
    }
    wakeControls();
  };

  const toggleMute = (e: Event) => {
    e.stopPropagation();
    const v = videoRef();
    if (v) {
      v.muted = !v.muted;
      setIsMuted(v.muted);
    }
    wakeControls();
  };

  const toggleFullscreen = async (e: Event) => {
    e.stopPropagation();
    const container = document.getElementById(`video-container-${props.getPos()}`);
    if (!container) return;

    if (!document.fullscreenElement) {
      await container.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      await document.exitFullscreen();
    }
  };

  // Autohide controls logic
  const wakeControls = () => {
    setShowControls(true);
    if (controlsTimeout) clearTimeout(controlsTimeout);
    
    // Only hide if playing
    if (isPlaying()) {
      controlsTimeout = window.setTimeout(() => {
        if (isPlaying()) setShowControls(false);
      }, 2500);
    }
  };

  const handleMouseMove = () => {
    if (props.selected) wakeControls();
  };

  const handleMouseLeave = () => {
    if (isPlaying()) setShowControls(false);
  };

  // Listen for fullscreen changes to update UI state
  onCleanup(() => {
    if (controlsTimeout) clearTimeout(controlsTimeout);
  });

  document.addEventListener('fullscreenchange', () => {
    const container = document.getElementById(`video-container-${props.getPos()}`);
    setIsFullscreen(document.fullscreenElement === container);
  });

  return (
    <div 
      class={`selectable-image-wrapper ${props.selected ? 'ProseMirror-selectednode' : ''} video-player-wrapper my-6 relative rounded-[16px] transition-all duration-300 w-full group ${
        props.selected 
          ? 'shadow-[0_0_0_3px_var(--color-secondary)]' 
          : 'shadow-[0_0_0_0_var(--color-secondary)]'
      }`} 
      data-video-player
      onMouseDown={handleMouseDown}
    >
      
      {/* Main Video Container */}
      <div 
        id={`video-container-${props.getPos()}`}
        class="relative w-full rounded-[16px] overflow-hidden bg-black shadow-lg border border-[var(--color-outline-variant)]/20"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <video 
            ref={setVideoRef}
            src={src()} 
            class="w-full h-auto max-h-[70vh] object-contain"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => { setIsPlaying(true); wakeControls(); }}
            onPause={() => { setIsPlaying(false); setShowControls(true); }}
            onEnded={() => { setIsPlaying(false); setShowControls(true); }}
            onClick={togglePlay}
        >
            Browser Anda tidak mendukung tag video.
        </video>

        {/* Central Large Play/Pause Toggle (Visible only when paused or hovered) */}
        <Show when={props.selected && (!isPlaying() || showControls())}>
          <div 
            class="absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300"
            style={{ opacity: !isPlaying() ? 1 : showControls() ? 0.7 : 0 }}
          >
            <button 
                onClick={togglePlay}
                class="w-16 h-16 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary)] active:bg-[var(--color-primary)] transition-transform active:scale-95 flex items-center justify-center pointer-events-auto"
            >
                <span 
                  class="material-symbols-rounded text-4xl !text-[var(--color-on-primary)]" 
                  style="font-variation-settings: 'FILL' 1, 'wght' 700, 'GRAD' 0, 'opsz' 48; display: block;"
                >
                  {isPlaying() ? 'pause' : 'play_arrow'}
                </span>
            </button>
          </div>
        </Show>

        {/* Bottom Control Bar */}
        <Show when={props.selected}>
          <div 
            class={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end px-4 pb-3 pt-12 transition-all duration-300 ${showControls() || !isPlaying() ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'}`}
          >
            {/* Seek Slider */}
            <div class="flex items-center gap-3 w-full mb-1">
              <span class="text-xs font-mono text-white/90 select-none">{formatTime(currentTime())}</span>
              
              <div class="relative flex-1 group/slider h-5 flex items-center">
                {/* Custom Track */}
                <div class="absolute inset-x-0 h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    class="h-full bg-[var(--color-primary)] transition-all duration-75"
                    style={{ width: `${duration() > 0 ? (currentTime() / duration()) * 100 : 0}%` }}
                  ></div>
                </div>
                {/* The actual input */}
                <input 
                  type="range" 
                  min="0" 
                  max={duration() || 100} 
                  step="0.1"
                  value={currentTime()} 
                  onInput={handleSeek}
                  class="absolute inset-x-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>

              <span class="text-xs font-mono text-white/90 select-none">{formatTime(duration())}</span>
            </div>

            {/* Bottom Tools (Mute, Fullscreen) */}
            <div class="flex justify-between items-center w-full mt-1">
              {/* Left side blank for now, could add title here */}
              <div class="flex-1"></div>

              {/* Right side tools */}
              <div class="flex items-center gap-2">
                <button 
                  onClick={toggleMute}
                  title={isMuted() ? "Unmute" : "Mute"}
                  class="w-8 h-8 rounded-full flex items-center justify-center text-white/90 hover:text-white hover:bg-white/20 transition-all"
                >
                  <span class="material-symbols-rounded text-xl">
                    {isMuted() ? 'volume_off' : 'volume_up'}
                  </span>
                </button>
                <button 
                  onClick={toggleFullscreen}
                  title={isFullscreen() ? "Exit Fullscreen" : "Fullscreen"}
                  class="w-8 h-8 rounded-full flex items-center justify-center text-white/90 hover:text-white hover:bg-white/20 transition-all"
                >
                  <span class="material-symbols-rounded text-xl">
                    {isFullscreen() ? 'fullscreen_exit' : 'fullscreen'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </Show>

        {/* Click Overlay when not selected (prevents direct video interaction until selected) */}
        <Show when={!props.selected}>
          <div class="absolute inset-0 z-10 cursor-pointer flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
            <div class="w-16 h-16 rounded-full bg-[var(--color-primary)] flex items-center justify-center">
               <span 
                 class="material-symbols-rounded text-4xl !text-[var(--color-on-primary)]" 
                 style="font-variation-settings: 'FILL' 1, 'wght' 700, 'GRAD' 0, 'opsz' 48; display: block;"
               >
                 play_arrow
               </span>
            </div>
          </div>
        </Show>
      </div>

      {/* Delete Button (Top Right) */}
      <button 
        class="image-delete-btn"
        style={{ 
            display: props.selected ? 'flex' : 'none',
            "z-index": "50"
        }}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); props.deleteNode(); }}
        title="Hapus Video"
      >
        <span class="material-symbols-rounded">close</span>
      </button>
    </div>
  );
};

export default VideoPlayerComponent;
