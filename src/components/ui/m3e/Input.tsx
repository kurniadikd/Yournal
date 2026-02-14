import { JSX, splitProps, createSignal, Show } from "solid-js";

interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  supportingText?: string;
  leadingIcon?: JSX.Element;
  trailingIcon?: JSX.Element;
}

/**
 * M3 Expressive Input (TextField)
 * 
 * Features:
 * - Filled style (Strictly Flat)
 * - Extra Small top corners (M3E style usually has higher top rounding)
 * - Active indicator (thick underline)
 * - Animated label (simplified for flat design)
 */
export default function Input(props: InputProps) {
  const [local, others] = splitProps(props, ["label", "error", "supportingText", "leadingIcon", "trailingIcon", "class"]);
  const [isFocused, setIsFocused] = createSignal(false);

  return (
    <div class={`flex flex-col gap-1 w-full ${local.class || ""}`}>
      <div 
        class={`
          relative flex items-center min-h-[56px] px-4
          bg-[var(--color-surface-container-highest)]
          rounded-t-[16px] transition-all duration-200
          ${isFocused() ? 'bg-[var(--color-surface-container-high)]' : ''}
          ${local.error ? 'bg-[var(--color-error-container)]' : ''}
        `}
      >
        {/* Leading Icon */}
        <Show when={local.leadingIcon}>
          <div class="mr-3 text-[var(--color-on-surface-variant)]">
            {local.leadingIcon}
          </div>
        </Show>

        <div class="flex-grow flex flex-col pt-2 pb-1">
          {/* Label */}
          <Show when={local.label}>
            <label 
              class={`
                text-sm transition-all duration-200
                ${isFocused() ? 'text-[var(--color-primary)]' : 'text-[var(--color-on-surface-variant)]'}
                ${local.error ? 'text-[var(--color-error)]' : ''}
              `}
            >
              {local.label}
            </label>
          </Show>

          {/* Input field */}
          <input
            {...others}
            onFocus={(e) => { setIsFocused(true); others.onFocus?.(e); }}
            onBlur={(e) => { setIsFocused(false); others.onBlur?.(e); }}
            class="bg-transparent border-none outline-none text-[var(--color-on-surface)] text-base w-full placeholder:text-[var(--color-on-surface-variant)]/50"
          />
        </div>

        {/* Trailing Icon */}
        <Show when={local.trailingIcon}>
          <div class="ml-3 text-[var(--color-on-surface-variant)]">
            {local.trailingIcon}
          </div>
        </Show>

        {/* Active Indicator (Underline) */}
        <div 
          class={`
            absolute bottom-0 left-0 right-0 h-[2px] transition-all duration-200 origin-center
            ${isFocused() ? 'bg-[var(--color-primary)] scale-x-100' : 'bg-[var(--color-outline-variant)] scale-x-100'}
            ${local.error ? 'bg-[var(--color-error)]' : ''}
          `}
        />
      </div>

      {/* Supporting/Error Text */}
      <Show when={local.error || local.supportingText}>
        <div 
          class={`px-4 text-xs ${local.error ? 'text-[var(--color-error)]' : 'text-[var(--color-on-surface-variant)]'}`}
        >
          {local.error || local.supportingText}
        </div>
      </Show>
    </div>
  );
}
