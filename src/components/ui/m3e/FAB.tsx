import { JSX, Show } from "solid-js";

interface FABProps {
  icon: JSX.Element | string;
  label?: string;
  onClick: () => void;
  class?: string;
  variant?: 'surface' | 'primary' | 'secondary' | 'tertiary';
  size?: 'small' | 'medium' | 'large';
}

/**
 * M3 Expressive Floating Action Button
 * 
 * Features:
 * - Rounded-square/Pill shape (28px corners)
 * - Large expressive variants
 * - Strictly Flat
 */
export default function FAB(props: FABProps) {
  const variants = {
    surface: "bg-[var(--color-surface-container-high)] text-[var(--color-primary)]",
    primary: "bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]",
    secondary: "bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)]",
    tertiary: "bg-[var(--color-tertiary-container)] text-[var(--color-on-tertiary-container)]",
  };

  const sizes = {
    small: "w-10 h-10 p-2",
    medium: "w-14 h-14 p-4",
    large: "w-24 h-24 p-6"
  };

  return (
    <button
      onClick={props.onClick}
      class={`
        group relative flex items-center justify-center
        rounded-[16px] md:rounded-[28px] transition-all duration-200
        active:scale-95 hover:scale-105
        ${variants[props.variant || 'primary']}
        ${props.label ? 'px-6 w-auto' : sizes[props.size || 'medium']}
        ${props.class || ''}
      `}
    >
      <Show when={typeof props.icon === 'string'} fallback={props.icon}>
        <span class="material-symbols-rounded text-2xl">
          {props.icon}
        </span>
      </Show>
      
      <Show when={props.label}>
        <span class={`font-medium ${props.icon ? 'ml-3' : ''}`}>
          {props.label}
        </span>
      </Show>

      {/* State Layer */}
      <div class="absolute inset-0 bg-current opacity-0 group-hover:opacity-[0.08] group-active:opacity-[0.12] transition-opacity rounded-[inherit]" />
    </button>
  );
}
