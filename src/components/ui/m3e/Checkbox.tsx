import { Show, createSignal } from "solid-js";

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}

/**
 * M3 Expressive Checkbox
 * 
 * Features:
 * - Rounded square container
 * - Check animation (SVG)
 * - Strictly Flat
 */
export default function Checkbox(props: CheckboxProps) {
  return (
    <label 
      class={`inline-flex items-center gap-3 cursor-pointer select-none group ${props.disabled ? 'opacity-38 pointer-events-none' : ''}`}
    >
      <div 
        class="relative flex items-center justify-center w-10 h-10 rounded-full transition-colors active:bg-[var(--color-primary)]/10 hover:bg-[var(--color-on-surface)]/5"
        onClick={(e) => {
            e.preventDefault();
            props.onChange(!props.checked);
        }}
      >
        <div 
          class={`
            w-[18px] h-[18px] rounded-[4px] transition-all duration-200 flex items-center justify-center
            ${props.checked 
                ? 'bg-[var(--color-primary)]' 
                : 'bg-[var(--color-surface-container-highest)] group-hover:bg-[var(--color-surface-container-high)]'}
          `}
        >
          <Show when={props.checked}>
            <svg 
              viewBox="0 0 24 24" 
              class="w-3.5 h-3.5 fill-none stroke-[var(--color-on-primary)] stroke-[3.5]"
            >
              <path 
                d="M4 12L10 18L20 6" 
                class="animate-[check_200ms_ease-out_forwards]"
                style={{
                    "stroke-dasharray": 22,
                    "stroke-dashoffset": 22,
                }}
              />
            </svg>
          </Show>
        </div>
      </div>
      {props.label && (
        <span class="text-[var(--color-on-surface)] text-base font-medium">
          {props.label}
        </span>
      )}
      
      <style>{`
        @keyframes check {
            to { stroke-dashoffset: 0; }
        }
      `}</style>
    </label>
  );
}
