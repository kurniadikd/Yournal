import { Show } from "solid-js";

interface RadioButtonProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  label?: string;
  name?: string;
}

/**
 * M3 Expressive Radio Button
 * 
 * Features:
 * - Circular M3 design
 * - Expressive selection dot animation
 * - Strictly Flat
 */
export default function RadioButton(props: RadioButtonProps) {
  return (
    <label 
      class={`inline-flex items-center gap-3 cursor-pointer select-none group ${props.disabled ? 'opacity-38 pointer-events-none' : ''}`}
    >
      <div 
        class="relative flex items-center justify-center w-10 h-10 rounded-full transition-colors active:bg-[var(--color-primary)]/10 hover:bg-[var(--color-on-surface)]/5"
        onClick={(e) => {
            e.preventDefault();
            if (!props.checked) props.onChange();
        }}
      >
        <div 
          class={`
            w-5 h-5 rounded-full border-2 transition-all duration-200 flex items-center justify-center
            ${props.checked 
                ? 'border-[var(--color-primary)]' 
                : 'border-[var(--color-outline)] group-hover:border-[var(--color-on-surface)]'}
          `}
        >
          <div 
            class={`
              w-2.5 h-2.5 rounded-full bg-[var(--color-primary)] transition-transform duration-200
              ${props.checked ? 'scale-100' : 'scale-0'}
            `}
          />
        </div>
      </div>
      {props.label && (
        <span class="text-[var(--color-on-surface)] text-base font-medium">
          {props.label}
        </span>
      )}
    </label>
  );
}
