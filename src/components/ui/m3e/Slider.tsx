import { createSignal, createMemo, onMount, onCleanup, mergeProps } from "solid-js";

interface SliderProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  size?: 'small' | 'medium' | 'large' | 'extra-large';
  disabled?: boolean;
  trackClass?: string;
  activeTrackClass?: string;
  hideActiveTrack?: boolean;
  variant?: 'bar' | 'thumb';
  class?: string;
}

/**
 * M3 Expressive Slider
 * 
 * Features:
 * - Thick track (Expressive style)
 * - Vertical bar handle (4dp width)
 * - Pure Flat Design (No shadows)
 */
export default function Slider(props: SliderProps) {
  const merged = mergeProps({ 
    min: 0, 
    max: 100, 
    step: 1, 
    size: 'medium', 
    variant: 'bar' 
  }, props);
  const [isDragging, setIsDragging] = createSignal(false);
  let trackRef: HTMLDivElement | undefined;

  const percentage = createMemo(() => {
    return ((merged.value - merged.min) / (merged.max - merged.min)) * 100;
  });

  const sizeStyles = {
    small: { track: "h-4", handle: "h-8", thumb: "w-5 h-5", radius: "rounded-lg" },
    medium: { track: "h-6", handle: "h-10", thumb: "w-6 h-6", radius: "rounded-xl" },
    large: { track: "h-10", handle: "h-14", thumb: "w-8 h-8", radius: "rounded-2xl" },
    "extra-large": { track: "h-20", handle: "h-24", thumb: "w-12 h-12", radius: "rounded-[32px]" }
  };

  const handleUpdate = (clientX: number) => {
    if (!trackRef || merged.disabled) return;
    const rect = trackRef.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const rawValue = (x / rect.width) * (merged.max - merged.min) + merged.min;
    const steppedValue = Math.round(rawValue / merged.step) * merged.step;
    merged.onChange(steppedValue);
  };

  const onMouseDown = (e: MouseEvent) => {
    setIsDragging(true);
    handleUpdate(e.clientX);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const onMouseMove = (e: MouseEvent) => {
    if (isDragging()) handleUpdate(e.clientX);
  };

  const onMouseUp = () => {
    setIsDragging(false);
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  };

  // Touch Support
  const onTouchStart = (e: TouchEvent) => {
    setIsDragging(true);
    handleUpdate(e.touches[0].clientX);
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("touchend", onTouchEnd);
  };

  const onTouchMove = (e: TouchEvent) => {
    if (isDragging()) handleUpdate(e.touches[0].clientX);
  };

  const onTouchEnd = () => {
    setIsDragging(false);
    window.removeEventListener("touchmove", onTouchMove);
    window.removeEventListener("touchend", onTouchEnd);
  };

  return (
    <div 
      class={`relative w-full flex items-center select-none group ${merged.disabled ? 'opacity-38 pointer-events-none' : ''}`}
      style={{ height: sizeStyles[merged.size].handle }}
    >
      {/* Inactive Track */}
      <div
        ref={trackRef}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        class={`w-full overflow-hidden cursor-pointer bg-[var(--color-secondary-container)] ${sizeStyles[merged.size].track} ${sizeStyles[merged.size].radius} ${merged.trackClass || ''}`}
      >
        {/* Active Track */}
        <Show when={!merged.hideActiveTrack}>
          <div 
            class={`h-full bg-[var(--color-primary)] transition-[width] duration-75 ease-out ${merged.activeTrackClass || ''}`}
            style={{ width: `${percentage()}%` }}
          />
        </Show>
      </div>

      {/* Handle */}
      <div 
        class="absolute pointer-events-none transition-[left] duration-75 ease-out flex items-center justify-center"
        style={{ 
            left: `${percentage()}%`,
            height: sizeStyles[merged.size].handle,
            width: "0px"
        }}
      >
        <Show 
          when={merged.variant === 'thumb'} 
          fallback={
            <div 
              class="bg-[var(--color-on-primary)] rounded-full" 
              style={{ height: sizeStyles[merged.size].handle, width: "4px" }}
            />
          }
        >
          <div 
            class={`bg-[var(--color-primary)] border-4 border-[var(--color-surface-container-high)] rounded-full ${sizeStyles[merged.size].thumb}`}
          />
        </Show>
      </div>

      {/* Ripple/State Layer (optional visual feedback) */}
      <div 
        class={`absolute w-12 h-12 rounded-full bg-[var(--color-primary)] opacity-0 transition-opacity pointer-events-none
                ${isDragging() ? 'opacity-[0.12]' : 'group-hover:opacity-[0.08]'}
        `}
        style={{ left: `calc(${percentage()}% - 24px)` }}
      />
    </div>
  );
}
