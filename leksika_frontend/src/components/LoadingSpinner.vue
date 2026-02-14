<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
  size: {
    type: String as () => 'xs' | 'sm' | 'md' | 'lg' | 'xl',
    default: 'md', // xs, sm, md, lg, xl
    validator: (value: string) => ['xs', 'sm', 'md', 'lg', 'xl'].includes(value),
  },
  color: {
    type: String,
    default: 'primary', // primary, on-primary, outline, surface, custom
  },
  customColor: {
    type: String,
    default: null,
  },
  strokeWidth: {
    type: [Number, String],
    default: 5, // Default M3 stroke width usually 4px relative to 48px box (approx 10% of size)
  },
  contained: {
    type: Boolean,
    default: false,
  },
  ariaLabel: {
    type: String,
    default: 'Loading...',
  }
});

const sizeClasses: Record<string, string> = {
  xs: 'w-4 h-4',   // 16px
  sm: 'w-6 h-6',   // 24px
  md: 'w-10 h-10', // 40px (M3 default is ~38-48dp)
  lg: 'w-12 h-12', // 48px
  xl: 'w-16 h-16', // 64px
};

const colorClasses: Record<string, string> = {
  primary: 'text-[var(--color-primary)]',
  'on-primary': 'text-[var(--color-on-primary)]',
  'on-surface': 'text-[var(--color-on-surface)]',
  outline: 'text-[var(--color-outline)]',
  surface: 'text-[var(--color-on-surface-variant)]',
  tertiary: 'text-[var(--color-tertiary)]',
  'on-tertiary': 'text-[var(--color-on-tertiary)]',
  'on-secondary': 'text-[var(--color-on-secondary)]',
  custom: '',
};

const normalizedStrokeWidth = computed(() => {
    // Escalate stroke width for smaller sizes to maintain visibility
    if (props.size === 'xs') return 6;
    if (props.size === 'sm') return 5;
    return props.strokeWidth;
});
</script>

<template>
  <div 
    role="status" 
    class="loading-indicator" 
    :class="[sizeClasses[size]]"
    :aria-label="ariaLabel"
  >
    <svg 
      viewBox="0 0 48 48" 
      xmlns="http://www.w3.org/2000/svg"
      class="indicator-svg"
      :class="[
        color === 'custom' ? '' : colorClasses[color],
        { 'contained': contained }
      ]"
      :style="color === 'custom' && customColor ? { color: customColor } : {}"
    >
      <!-- Active Indicator (Morphing Arc) 
           M3 Spec: Indicator size 38dp in 48dp container. 
           r = 19 (diameter 38). stroke-width ~12-15% for "thicker" look
      -->
      <circle 
        class="spinner" 
        cx="24" 
        cy="24" 
        r="19" 
        fill="none" 
        stroke="currentColor" 
        :stroke-width="normalizedStrokeWidth" 
        stroke-linecap="round"
      />
    </svg>
  </div>
</template>

<style scoped>
.loading-indicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  vertical-align: middle;
}

.indicator-svg {
  animation: rotate 2000ms linear infinite;
  transform-origin: center;
  width: 100%;
  height: 100%;
}


/* Override container fill if spinner is white/on-primary (e.g. inside primary button)
   Actually, 'Contained' style is usually standalone. 
   If used inside a button, 'contained' prop should arguably be false.
*/

.spinner {
  /* r=19 -> circumference = 2 * pi * 19 ~= 119.38 */
  stroke-dasharray: 1, 200;
  stroke-dashoffset: 0;
  /* M3 Standard Easing: cubic-bezier(0.4, 0.0, 0.2, 1) or Emphasized: cubic-bezier(0.2, 0.0, 0.0, 1.0) 
     The implementation of Material's CircularProgressIndicator usually uses:
     - Head: cubic-bezier(0.4, 0, 0.2, 1)
     - Tail: cubic-bezier(0.4, 0, 0.2, 1)
  */
  animation: dash 1500ms ease-in-out infinite; 
}

@keyframes rotate {
  100% {
    transform: rotate(360deg);
  }
}

/* More accurate M3-style dash animation */
@keyframes dash {
  0% {
    stroke-dasharray: 1, 200;
    stroke-dashoffset: 0;
    /* transition-timing-function: cubic-bezier(0.4, 0.0, 0.2, 1); */
  }
  50% {
    stroke-dasharray: 89, 200; /* ~75% of 119 */
    stroke-dashoffset: -35px;
    /* transition-timing-function: cubic-bezier(0.4, 0.0, 0.2, 1); */
  }
  100% {
    stroke-dasharray: 89, 200;
    stroke-dashoffset: -120px;
  }
}
</style>
