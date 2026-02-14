import { JSX, Show, splitProps } from "solid-js";

interface ChipProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'assist' | 'filter' | 'input' | 'suggestion';
  selected?: boolean;
  leadingIcon?: JSX.Element;
  trailingIcon?: JSX.Element;
  onRemove?: () => void;
}

/**
 * M3 Expressive Chip
 * 
 * Features:
 * - 8dp corner radius (Standard M3 Small)
 * - 32dp height
 * - Strictly Flat Design
 * - Filter/Selected states
 */
export default function Chip(props: ChipProps) {
  const [local, others] = splitProps(props, ["variant", "selected", "leadingIcon", "trailingIcon", "onRemove", "children", "class"]);

  const variantClasses = {
    assist: "bg-[var(--color-surface-container-low)] text-[var(--color-on-surface)] border border-[var(--color-outline-variant)]",
    filter: local.selected 
        ? "bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)]"
        : "bg-transparent text-[var(--color-on-surface-variant)] border border-[var(--color-outline)]",
    input: "bg-[var(--color-surface-container-low)] text-[var(--color-on-surface)] border border-[var(--color-outline-variant)]",
    suggestion: "bg-transparent text-[var(--color-on-surface-variant)] border border-[var(--color-outline)]"
  };

  // For strictly flat, we might want to avoid the border even if M3 has it.
  // The user said "strictly flat design (no shadow, no border/outline)".
  // I will remove the borders for the flat variants.
  const flatVariantClasses = {
    assist: "bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)]",
    filter: local.selected 
        ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
        : "bg-[var(--color-surface-container-low)] text-[var(--color-on-surface-variant)]",
    input: "bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface)]",
    suggestion: "bg-[var(--color-surface-container-low)] text-[var(--color-on-surface-variant)]"
  };

  return (
    <button
      {...others}
      class={`
        group relative inline-flex items-center gap-2 h-8 px-3 rounded-lg text-sm font-medium
        transition-all duration-200 active:scale-[0.97] disabled:opacity-38 disabled:pointer-events-none
        ${flatVariantClasses[local.variant || 'assist']}
        ${local.class || ""}
      `}
    >
      <Show when={local.leadingIcon}>
        <span class="flex items-center justify-center -ml-1 h-5 w-5">
          {local.leadingIcon}
        </span>
      </Show>

      {local.children}

      <Show when={local.trailingIcon}>
        <span class="flex items-center justify-center -mr-1 h-5 w-5">
          {local.trailingIcon}
        </span>
      </Show>

      <Show when={local.onRemove}>
        <div 
          onClick={(e) => { e.stopPropagation(); local.onRemove?.(); }}
          class="flex items-center justify-center -mr-1 h-5 w-5 hover:bg-black/5 rounded-full transition-colors"
        >
          <span class="material-symbols-rounded text-base">close</span>
        </div>
      </Show>

      {/* State Layer */}
      <div class="absolute inset-0 rounded-inherit bg-current opacity-0 group-hover:opacity-[0.08] active:opacity-[0.12] transition-opacity" />
    </button>
  );
}
