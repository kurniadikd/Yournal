import { JSX, splitProps } from "solid-js";

interface IconButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'standard' | 'filled' | 'tonal' | 'outlined';
  active?: boolean;
}

/**
 * M3 Expressive Icon Button
 * 
 * Features:
 * - Circular shape
 * - Strictly Flat
 */
export default function IconButton(props: IconButtonProps) {
  const [local, others] = splitProps(props, ["variant", "children", "class", "active"]);

  const flatVariantClasses = {
    standard: "text-[var(--color-on-surface-variant)]",
    filled: "bg-[var(--color-primary)] text-[var(--color-on-primary)]",
    tonal: "bg-[var(--color-secondary-container)] text-[var(--on-secondary-container)]",
    outlined: "bg-[var(--color-surface-container-low)] text-[var(--color-on-surface-variant)]"
  };

  return (
    <button
      {...others}
      class={`
        relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200
        active:scale-[0.95] disabled:opacity-38 disabled:pointer-events-none
        ${flatVariantClasses[local.variant || 'standard']}
        ${local.class || ""}
      `}
    >
      <span class={`material-symbols-rounded ${local.active ? 'icon-fill' : ''}`}>
        {local.children}
      </span>
      
      {/* State Layer */}
      <div class="absolute inset-0 rounded-full bg-current opacity-0 hover:opacity-[0.08] active:opacity-[0.12] transition-opacity" />
    </button>
  );
}
