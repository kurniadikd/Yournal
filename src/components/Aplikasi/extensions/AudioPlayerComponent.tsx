import { Component, createSignal } from "solid-js";

const AudioPlayerComponent: Component<any> = (props) => {
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
  
  const handleDelete = () => {
      props.deleteNode();
  };
  

  // Use passed duration (steps) as fallback, but prefer audio element duration
  const displayDuration = () => realDuration() || duration() || 0;

  const generateWaveformPath = (data: number[]) => {
      // If no data, return a visible flat track (pill shape)
      if (!data || data.length === 0) {
          // A flat rounded bar in the center
          return 'M 0 48 L 100 48 L 100 52 L 0 52 Z';
      }

      let d = `M 0 50`;
      const width = 100;
      const step = width / (data.length - 1);

      // Top curve
      data.forEach((val, i) => {
          const x = i * step;
          // Ensure min amplitude for visibility (silence = thin line)
          const amplitude = Math.max(val, 0.05) * 45; 
          const y = 50 - amplitude;
          d += ` L ${x} ${y}`;
      });

      // Bottom curve (mirrored)
      for (let i = data.length - 1; i >= 0; i--) {
          const x = i * step;
          const val = data[i];
          const amplitude = Math.max(val, 0.05) * 45;
          const y = 50 + amplitude;
          d += ` L ${x} ${y}`;
      }

      d += ' Z'; // Close path
      return d;
  };

  const waveformPath = () => generateWaveformPath(waveform());

  return (
    <div class="audio-player-wrapper my-6 select-none group w-full" data-audio-player>
      {/* Container: M3 Expressive style */}
      <div class="flex items-center gap-4 bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] rounded-[32px] pl-2 pr-4 py-2 w-full shadow-sm border border-[var(--color-outline-variant)]/20 h-[80px] relative transition-colors hover:bg-[var(--color-surface-container-highest)]">
        
        <audio 
            ref={setAudio} 
            src={src()} 
            preload="metadata"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleEnded}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            onError={(e) => console.error("Audio playback error:", e)}
            class="hidden"
        />

        {/* Play/Pause Button - Prominent Circle */}
        <button 
            onClick={togglePlay}
            class="group/play-btn flex items-center justify-center w-14 h-14 rounded-full bg-[var(--color-primary)] hover:brightness-110 active:brightness-90 active:scale-95 transition-all shrink-0 shadow-md z-10"
        >
            <span 
                class="material-symbols-rounded text-[32px] !text-[var(--color-on-primary)] fill-current transition-all duration-200"
                style={{
                  "font-variation-settings": "'FILL' 1, 'wght' 700, 'GRAD' 0, 'opsz' 48"
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
                onInput={handleSeek}
                class="absolute inset-x-0 top-0 bottom-0 w-full h-full opacity-0 z-30 cursor-pointer"
                title="Seek"
            />

            {/* SVG Waveform wrapper */}
            <div class="relative w-full h-[60%] overflow-hidden rounded-[8px]">
                 {/* Background Wave (Inactive / Unplayed) */}
                 <svg 
                    viewBox="0 0 100 100" 
                    preserveAspectRatio="none" 
                    class="absolute inset-0 w-full h-full text-[var(--color-on-surface-variant)] opacity-30 pointer-events-none"
                 >
                    <path d={waveformPath()} fill="currentColor" />
                 </svg>

                 {/* Foreground Wave (Active / Played) - Masked by width */}
                 <div 
                    class="absolute inset-y-0 left-0 overflow-hidden pointer-events-none transition-[width] duration-100 ease-linear"
                    style={{ width: `${(currentTime() / (displayDuration() || 1)) * 100}%` }}
                 >
                     <svg 
                        viewBox="0 0 100 100" 
                        preserveAspectRatio="none" 
                        class="absolute inset-y-0 left-0 h-full w-[100vw] sm:w-full text-[var(--color-primary)] opacity-90"
                        style={{ width: '100%' }} // Inner SVG must stretch to full container width to match background
                     >
                        <path d={waveformPath()} fill="currentColor" />
                     </svg>
                 </div>
            </div>
            
            {/* Time Labels */}
            <div class="flex justify-between w-full px-1 mt-1 text-[11px] font-bold font-mono text-[var(--color-on-surface-variant)] leading-none select-none">
                <span class="bg-[var(--color-surface)]/40 px-1 rounded">{formatTime(currentTime())}</span>
                <span class="bg-[var(--color-surface)]/40 px-1 rounded">{formatTime(displayDuration())}</span>
            </div>

        </div>

        {/* Delete Button */}
        <button 
            onClick={handleDelete}
            class="group/delete-btn flex items-center justify-center w-10 h-10 rounded-full text-[var(--color-on-surface-variant)] hover:bg-[var(--color-error-container)] hover:text-[var(--color-on-error-container)] transition-colors shrink-0 z-10 self-center"
            title="Hapus Audio"
        >
             <span class="material-symbols-rounded text-[24px] !text-inherit">close</span>
        </button>

      </div>
    </div>
  );
};

export default AudioPlayerComponent;
