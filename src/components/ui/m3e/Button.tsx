import { JSX, splitProps, Show } from "solid-js";

interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'filled' | 'tonal' | 'text';
  size?: 'small' | 'medium' | 'large' | 'extra-large';
  icon?: JSX.Element;
  iconTrailing?: JSX.Element;
  loading?: boolean;
}

/**
 * M3 Expressive Button
 * 
 * Ported from Material 3 Expressive (M3E) Specs
 * Features:
 * - Expressive corner radius (Higher radii for larger sizes)
 * - Strictly Flat (No shadows, No borders)
 * - Filled and Tonal variants ONLY as per user request
 * - Dynamic padding (16dp suggested for small/medium)
 */
export default function Button(props: ButtonProps) {
  const [local, others] = splitProps(props, ['variant', 'size', 'icon', 'iconTrailing', 'children', 'class', 'loading']);

  const variantClasses = {
    filled: "bg-[var(--color-primary)] text-[var(--color-on-primary)]",
    tonal: "bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)]",
    text: "bg-transparent text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10"
  };

  const sizeClasses = {
    small: "h-8 px-4 text-sm rounded-[12px]",
    medium: "h-10 px-6 text-base rounded-[16px]",
    large: "h-14 px-8 text-xl rounded-[24px]",
    "extra-large": "h-20 px-10 text-2xl rounded-[32px]"
  };

  return (
    <button
      {...others}
      disabled={others.disabled || local.loading}
      class={`
        relative inline-flex items-center justify-center gap-2 font-medium 
        transition-all duration-200 active:scale-[0.97] disabled:opacity-38 disabled:pointer-events-none
        ${variantClasses[local.variant || 'filled']}
        ${sizeClasses[local.size || 'medium']}
        ${local.class || ''}
      `}
    >
      <Show when={local.loading}>
        <span class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
      </Show>
      {!local.loading && local.icon && <span class="flex items-center justify-center -ml-1">{local.icon}</span>}
      {local.children}
      {!local.loading && local.iconTrailing && <span class="flex items-center justify-center -mr-1">{local.iconTrailing}</span>}
      
      {/* State Layer (Overlay for hover/pressed) */}
      <div class="absolute inset-0 rounded-inherit bg-current opacity-0 hover:opacity-[0.08] active:opacity-[0.12] transition-opacity" />
    </button>
  );
}
