import { For, Show, createSignal, onCleanup, createEffect, JSX } from "solid-js";

interface DropdownOption {
  value: string;
  label: string;
  icon?: JSX.Element;
  family?: string;
}

interface DropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  label?: string;
  class?: string;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * M3 Expressive Dropdown Menu
 * 
 * Based on M3 Expressive Alpha 09 tokens:
 * - Container: 28dp (Extra Large) corner radius
 * - Background: Surface Container Highest
 * - Item Padding: 16dp horizontal, 13dp vertical
 * - Selection: Secondary Container background
 * - Elevation: Elevation Level 2 (represented as Flat with darker background for contrast)
 */
export default function Dropdown(props: DropdownProps) {
  const [isOpen, setIsOpen] = createSignal(false);
  let containerRef: HTMLDivElement | undefined;

  const handleClickOutside = (e: MouseEvent) => {
    if (containerRef && !containerRef.contains(e.target as Node)) {
      setIsOpen(false);
    }
  };

  createEffect(() => {
    if (isOpen()) {
      document.addEventListener("click", handleClickOutside);
    } else {
      document.removeEventListener("click", handleClickOutside);
    }
  });

  onCleanup(() => {
    document.removeEventListener("click", handleClickOutside);
  });

  const selectedOption = () => props.options.find(o => o.value === props.value);

  return (
    <div ref={containerRef} class={`relative w-full ${props.class || ''}`}>
      {/* Anchor / Trigger */}
      <button
        onMouseDown={(e) => { e.preventDefault(); !props.disabled && setIsOpen(!isOpen()); }}
        disabled={props.disabled}
        class={`
          flex items-center justify-between w-full h-10 px-4
          ${props.disabled ? 'opacity-38 cursor-not-allowed' : 'hover:bg-[var(--color-surface-container)]'}
          bg-[var(--color-surface-container-low)] text-[var(--color-on-surface-variant)]
          rounded-2xl transition-all duration-200
          ${isOpen() ? 'bg-[var(--color-surface-container-high)] text-[var(--color-primary)]' : ''}
        `}
      >
        <span class="truncate text-[13px] font-medium" style={selectedOption()?.family ? { "font-family": selectedOption()?.family } : {}}>
          {selectedOption()?.label || props.placeholder || 'Pilih...'}
        </span>
        <span 
          class="material-symbols-rounded text-xl transition-transform duration-300"
          style={{ transform: isOpen() ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          expand_more
        </span>
      </button>

      {/* Menu Container */}
      <Show when={isOpen()}>
        <div 
          class={`
            absolute z-50 bottom-full mb-2 w-full
            bg-[var(--color-surface-container-highest)] 
            rounded-[28px] py-2 overflow-hidden
            animate-in fade-in slide-in-from-bottom-2 duration-200
          `}
        >
          <div class="max-h-60 overflow-y-auto">
            <For each={props.options}>
              {(option) => (
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    props.onChange(option.value);
                    setIsOpen(false);
                  }}
                  style={option.family ? { "font-family": option.family } : {}}
                  class={`
                    w-full text-left px-4 py-[13px] flex items-center gap-3
                    transition-colors duration-150
                    ${props.value === option.value 
                      ? 'bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)] font-bold' 
                      : 'text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)]'}
                  `}
                >
                  <Show when={option.icon}>
                    {option.icon}
                  </Show>
                  <span class="text-[14px]">{option.label}</span>
                </button>
              )}
            </For>
          </div>
        </div>
      </Show>
    </div>
  );
}
