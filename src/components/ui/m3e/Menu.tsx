import { For, Show, createSignal, onCleanup, createEffect, JSX } from "solid-js";
import { Portal } from "solid-js/web";

interface MenuItem {
  id: string | number;
  label: string;
  icon?: JSX.Element;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger';
}

interface MenuProps {
  show: boolean;
  onClose: () => void;
  items: MenuItem[];
  anchor: HTMLElement | undefined;
  class?: string;
  placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
}

/**
 * M3 Expressive Menu
 * 
 * Features:
 * - Extra Large corners (28px) 
 * - Surface Container background
 * - Strictly Flat (No shadows, No outlines)
 * - Portal-based for z-index safety
 * - Dynamic positioning relative to anchor
 */
export default function Menu(props: MenuProps) {
  const [position, setPosition] = createSignal({ top: 0, left: 0 });

  createEffect(() => {
    if (props.show && props.anchor) {
      const rect = props.anchor.getBoundingClientRect();
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;
      
      let top = rect.bottom + scrollY + 4;
      let left = rect.left + scrollX;

      if (props.placement === 'bottom-end') {
        left = rect.right + scrollX;
      } else if (props.placement === 'top-start') {
        top = rect.top + scrollY - 4;
      } else if (props.placement === 'top-end') {
        top = rect.top + scrollY - 4;
        left = rect.right + scrollX;
      }

      setPosition({ top, left });
    }
  });

  const handleClickOutside = (e: MouseEvent) => {
    if (props.show && props.anchor && !props.anchor.contains(e.target as Node)) {
      props.onClose();
    }
  };

  createEffect(() => {
    if (props.show) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
  });

  onCleanup(() => {
    document.removeEventListener("mousedown", handleClickOutside);
  });

  return (
    <Portal>
      <Show when={props.show}>
        <div 
          class={`
            absolute z-[1000] min-w-[160px] max-w-[280px]
            bg-[var(--color-surface-container)] rounded-[28px] overflow-hidden
            animate-in fade-in slide-in-from-top-1 duration-200
            ${props.class || ''}
          `}
          style={{
            top: `${position().top}px`,
            left: `${position().left}px`,
            "transform": props.placement?.includes('end') ? 'translateX(-100%)' : 'none',
          }}
        >
          <div class="py-2">
            <For each={props.items}>
              {(item) => (
                <button
                  disabled={item.disabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    item.onClick();
                    props.onClose();
                  }}
                  class={`
                    w-full text-left px-4 py-3 flex items-center gap-3 transition-colors
                    ${item.disabled ? 'opacity-38 pointer-events-none' : 'hover:bg-[var(--color-on-surface-variant)]/[0.08]'}
                    ${item.variant === 'danger' ? 'text-[var(--color-error)]' : 'text-[var(--color-on-surface)]'}
                  `}
                >
                  <Show when={item.icon}>
                    <span class="material-symbols-rounded text-[20px]">{item.icon}</span>
                  </Show>
                  <span class="text-sm font-medium">{item.label}</span>
                </button>
              )}
            </For>
          </div>
        </div>
      </Show>
    </Portal>
  );
}
