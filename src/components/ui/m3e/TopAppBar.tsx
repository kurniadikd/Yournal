import { JSX, Show, mergeProps } from "solid-js";

interface TopAppBarProps {
  title: string | JSX.Element;
  variant?: 'small' | 'medium' | 'large';
  navigationIcon?: JSX.Element;
  actions?: JSX.Element;
  class?: string;
  scrollRatio?: number; // 0 to 1 for collapsing effects
}

/**
 * M3 Expressive Top App Bar
 * 
 * Features:
 * - Small, Medium, Large variants
 * - Strictly Flat
 * - Dynamic height based on variant and scroll
 */
export default function TopAppBar(props: TopAppBarProps) {
  const merged = mergeProps({ variant: 'small', scrollRatio: 0 }, props);

  const heights = {
    small: "h-16",
    medium: "h-28", // Collapses to 16
    large: "h-36"   // Collapses to 16
  };

  return (
    <header 
      class={`
        fixed top-0 left-0 right-0 z-50 flex flex-col w-full transition-colors duration-200
        bg-[var(--color-surface-container)]
        ${heights[merged.variant]}
        ${merged.class || ''}
      `}
      style={{ "padding-top": "env(safe-area-inset-top, 0px)" }}
    >
      <div class="flex items-center h-16 px-4">
        {/* Navigation Icon */}
        <Show when={merged.navigationIcon}>
          <div class="mr-2">
            {merged.navigationIcon}
          </div>
        </Show>

        {/* Title (Small) */}
        <Show when={merged.variant === 'small'}>
          <div class="flex-grow text-[var(--color-on-surface)] text-xl font-normal truncate">
            {merged.title}
          </div>
        </Show>

        {/* Actions */}
        <Show when={merged.actions}>
          <div class="flex items-center gap-1">
            {merged.actions}
          </div>
        </Show>
      </div>

      {/* Expanded Title (Medium/Large) */}
      <Show when={merged.variant !== 'small'}>
        <div 
          class={`
            flex-grow flex items-end px-6 pb-6 transition-all duration-200
            ${merged.variant === 'medium' ? 'text-3xl' : 'text-4xl'}
            text-[var(--color-on-surface)] font-normal
          `}
        >
          {merged.title}
        </div>
      </Show>
    </header>
  );
}
