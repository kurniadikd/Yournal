import { Show, mergeProps } from "solid-js";

interface ProgressProps {
  type?: 'linear' | 'circular';
  value?: number; // 0 to 100. If undefined, indeterminate.
  size?: 'small' | 'medium' | 'large';
  class?: string;
}

/**
 * M3 Expressive Progress Indicators
 * 
 * Features:
 * - Linear and Circular variants
 * - Determinate and Indeterminate states
 * - M3 Expressive stroke widths and animations
 */
export default function Progress(props: ProgressProps) {
  const merged = mergeProps({ type: 'linear', size: 'medium' }, props);
  
  const isIndeterminate = () => merged.value === undefined;

  return (
    <Show 
      when={merged.type === 'linear'} 
      fallback={
        <CircularProgress 
          value={merged.value} 
          size={merged.size} 
          class={merged.class} 
          indeterminate={isIndeterminate()} 
        />
      }
    >
      <LinearProgress 
        value={merged.value} 
        class={merged.class} 
        indeterminate={isIndeterminate()} 
      />
    </Show>
  );
}

function LinearProgress(props: { value?: number, class?: string, indeterminate: boolean }) {
  return (
    <div 
      class={`relative w-full h-1 bg-[var(--color-secondary-container)] overflow-hidden rounded-full ${props.class || ''}`}
    >
      <div 
        class={`
          h-full bg-[var(--color-primary)] rounded-full transition-all duration-300
          ${props.indeterminate ? 'w-full animate-indeterminate-linear origin-left' : ''}
        `}
        style={!props.indeterminate ? { width: `${props.value}%` } : {}}
      />
      <style>{`
        @keyframes indeterminate-linear {
          0% { transform: translateX(-100%) scaleX(0.2); }
          50% { transform: translateX(0%) scaleX(0.5); }
          100% { transform: translateX(100%) scaleX(0.2); }
        }
      `}</style>
    </div>
  );
}

function CircularProgress(props: { value?: number, size: string, class?: string, indeterminate: boolean }) {
  const sizes = {
    small: 24,
    medium: 40,
    large: 56
  };
  const size = sizes[props.size as keyof typeof sizes] || 40;
  const strokeWidth = props.size === 'small' ? 3 : 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div 
      class={`inline-block ${props.class || ''}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <svg 
        viewBox={`0 0 ${size} ${size}`} 
        class={props.indeterminate ? 'animate-spin' : ''}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-secondary-container)"
          stroke-width={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-primary)"
          stroke-width={strokeWidth}
          stroke-linecap="round"
          stroke-dasharray={circumference.toString()}
          stroke-dashoffset={(props.indeterminate ? circumference * 0.7 : circumference * (1 - (props.value || 0) / 100)).toString()}
          class="transition-all duration-300"
        />
      </svg>
    </div>
  );
}
