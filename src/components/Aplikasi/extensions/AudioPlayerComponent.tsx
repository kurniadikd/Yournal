import { Component, createSignal, onCleanup } from "solid-js";
// LoadingSpinner removed as it was only used for Lyra decoding state

const AudioPlayerComponent: Component<{
  node: any;
  updateAttributes: (attrs: any) => void;
  selected: boolean;
  deleteNode: () => void;
  extension: any;
  getPos: () => number;
}> = (props) => {
  let wasSelectedOnMousedown = false;

  const handleMouseDown = () => {
    wasSelectedOnMousedown = props.selected;
  };
  const src = () => props.node.attrs.src;
  const duration = () => props.node.attrs.duration; // in ms
  const waveform = () => {
      const w = props.node.attrs.waveform;
      return Array.isArray(w) ? w : [];
  };
  
  const [isPlaying, setIsPlaying] = createSignal(false);
  const [currentTime, setCurrentTime] = createSignal(0);
  const [audio, setAudio] = createSignal<HTMLAudioElement | null>(null);
  const [realDuration, setRealDuration] = createSignal(0);

  // Playable source is just the src (which should be a valid URL/DataURL)
  const playableSrc = src;

  onCleanup(() => {
      // If we were creating ObjectURLs here we'd revoke them, but src comes from props
  });

  let animationFrame: number;

  const togglePlay = () => {
    const a = audio();
    if (!a) return;
    
    if (a.paused) {
      a.play().catch(console.error);
      setIsPlaying(true);
      // Start smooth animation loop
      const loop = () => {
          if (!a.paused && !a.ended) {
              setCurrentTime(a.currentTime);
              animationFrame = requestAnimationFrame(loop);
          }
      };
      loop();
    } else {
      a.pause();
      setIsPlaying(false);
      cancelAnimationFrame(animationFrame);
    }
  };

  const handleTimeUpdate = (e: Event) => {
    // Keep this for syncing, but animation frame handles smooth UI
    const target = e.target as HTMLAudioElement;
    if (!isPlaying()) {
        setCurrentTime(target.currentTime);
    }
    if (target.duration && !isNaN(target.duration)) {
        setRealDuration(target.duration);
    }
  };

  const handleLoadedMetadata = (e: Event) => {
      const target = e.target as HTMLAudioElement;
      if (target.duration && !isNaN(target.duration)) {
        setRealDuration(target.duration);
    }
  }

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    cancelAnimationFrame(animationFrame);
  };

  const handleSeek = (e: InputEvent) => {
    const target = e.target as HTMLInputElement;
    const time = parseFloat(target.value);
    const a = audio();
    if (a) {
        a.currentTime = time;
        setCurrentTime(time);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };
  
  

  // Use passed duration (steps) as fallback, but prefer audio element duration
  const displayDuration = () => realDuration() || duration() || 0;

  // Calculate playback progress ratio (0-1)
  const progress = () => currentTime() / (displayDuration() || 1);

  return (
    <div class={`selectable-image-wrapper ${props.selected ? 'ProseMirror-selectednode' : ''} audio-player-wrapper my-6 relative rounded-[32px] transition-all duration-300 w-full ${
      props.selected 
        ? 'shadow-[0_0_0_3px_var(--color-secondary)]' 
        : 'shadow-[0_0_0_0_var(--color-secondary)]'
    }`} 
    data-audio-player
    onMouseDown={handleMouseDown}
    >
      {/* Container: M3 Expressive style */}
      <div class="flex items-center gap-4 bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] rounded-[32px] pl-2 pr-4 py-2 w-full shadow-sm border border-[var(--color-outline-variant)]/20 h-[80px] relative transition-colors hover:bg-[var(--color-surface-container-highest)]">
        
        <audio 
            ref={setAudio} 
            src={playableSrc() ?? undefined} 
            preload="metadata"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleEnded}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            onError={() => {
                const a = audio();
                console.error("Audio playback error:", a?.error);
            }}
            class="hidden"
        />

        {/* Play/Pause Button - Prominent Circle */}
        <button 
            onClick={(e) => {
                if (wasSelectedOnMousedown && props.selected) {
                    togglePlay();
                }
            }}
            class={`group/play-btn flex items-center justify-center w-14 h-14 rounded-full bg-[var(--color-primary)] active:scale-95 transition-transform shrink-0 z-10`}
        >
            <span 
                class="material-symbols-rounded text-[32px] !text-[var(--color-on-primary)] fill-current"
                style={{
                  "font-variation-settings": "'FILL' 1, 'wght' 700, 'GRAD' 0, 'opsz' 48",
                  "display": "block"
                }}
            >
                {isPlaying() ? 'pause' : 'play_arrow'}
            </span>
        </button>

        {/* Waveform Visualization Container */}
        <div class="flex-1 flex flex-col justify-center min-w-0 h-full relative group/slider">
            
            {/* Seek Slider (Overlay) - Full height for easy touch */}
            <input 
                type="range" 
                min="0" 
                max={displayDuration()} 
                step="0.1"
                value={currentTime()} 
                onInput={(e) => {
                    if (wasSelectedOnMousedown && props.selected) {
                        handleSeek(e);
                    }
                }}
                class="absolute inset-x-0 top-0 bottom-0 w-full h-full opacity-0 z-30 cursor-pointer"
                title="Seek"
            />

            {/* Single SVG Waveform — individual bars colored by playback position */}
            <div class="relative w-full h-[60%] overflow-hidden rounded-[8px]">
                <svg 
                    viewBox="0 0 200 100" 
                    preserveAspectRatio="none" 
                    class="w-full h-full pointer-events-none"
                >
                    {(() => {
                        const data = waveform();
                        const barCount = data.length || 1;
                        const barWidth = 200 / barCount;
                        const gap = barWidth * 0.15; // 15% gap between bars
                        const effectiveWidth = barWidth - gap;
                        const prog = progress();

                        if (!data || data.length === 0) {
                            // Flat line fallback
                            return (
                                <rect 
                                    x="0" y="48" 
                                    width="200" height="4" 
                                    rx="2"
                                    fill="var(--color-on-primary)" 
                                />
                            );
                        }

                        return data.map((val: number, i: number) => {
                            const x = i * barWidth + gap / 2;
                            const amplitude = Math.max(val, 0.04) * 45; // min height for visibility
                            const barHeight = amplitude * 2;
                            const y = 50 - amplitude;
                            const barProgress = (i + 0.5) / barCount; // center of this bar
                            const isPlayed = barProgress <= prog;

                            return (
                                <rect
                                    x={x}
                                    y={y}
                                    width={effectiveWidth}
                                    height={barHeight}
                                    rx={effectiveWidth / 2}
                                    fill={isPlayed ? "var(--color-primary)" : "var(--color-on-primary)"}
                                />
                            );
                        });
                    })()}
                </svg>
            </div>
            
            {/* Time Labels */}
            <div class="flex justify-between w-full px-1 mt-1 text-[11px] font-bold font-mono text-[var(--color-on-surface-variant)] leading-none select-none">
                <span class="bg-[var(--color-surface)]/40 px-1 rounded">{formatTime(currentTime())}</span>
                <span class="bg-[var(--color-surface)]/40 px-1 rounded">{formatTime(displayDuration())}</span>
            </div>

        </div>

      </div>

      {/* Persis tombol hapus SelectableImage */}
      <button 
        class="image-delete-btn"
        style={{ 
            display: props.selected ? 'flex' : 'none',
            "z-index": "40" 
        }}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); props.deleteNode(); }}
      >
        <span class="material-symbols-rounded">close</span>
      </button>
    </div>
  );
};

export default AudioPlayerComponent;
