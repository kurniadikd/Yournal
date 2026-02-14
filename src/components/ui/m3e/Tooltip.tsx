import { JSX, Show, createSignal } from "solid-js";
import { Portal } from "solid-js/web";

interface TooltipProps {
  text: string;
  children: JSX.Element;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * M3 Expressive Tooltip
 * 
 * Features:
 * - Inverse Surface colors
 * - 4dp corner radius (Standard)
 * - Animated fade-in
 */
export default function Tooltip(props: TooltipProps) {
  const [show, setShow] = createSignal(false);
  let triggerRef: HTMLDivElement | undefined;
  const [coords, setCoords] = createSignal({ x: 0, y: 0 });

  const updateCoords = () => {
    if (!triggerRef) return;
    const rect = triggerRef.getBoundingClientRect();
    const pos = props.position || 'top';
    
    let x = rect.left + rect.width / 2;
    let y = rect.top;

    if (pos === 'top') {
      y = rect.top - 8;
    } else if (pos === 'bottom') {
      y = rect.bottom + 8;
    } else if (pos === 'left') {
      x = rect.left - 8;
      y = rect.top + rect.height / 2;
    } else if (pos === 'right') {
      x = rect.right + 8;
      y = rect.top + rect.height / 2;
    }

    setCoords({ x, y });
  };

  const onMouseEnter = () => {
    updateCoords();
    setShow(true);
  };

  const onMouseLeave = () => setShow(false);

  return (
    <div 
      ref={triggerRef}
      class="inline-block"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {props.children}
      
      <Portal>
        <Show when={show()}>
          <div 
            class={`
              fixed z-[300] px-2 py-1 rounded-[4px] bg-[var(--color-inverse-surface)] 
              text-[var(--color-inverse-on-surface)] text-[11px] font-medium pointer-events-none
              transition-opacity duration-150 transform -translate-x-1/2 -translate-y-full
              ${show() ? 'opacity-100' : 'opacity-0'}
            `}
            style={{ 
                left: `${coords().x}px`, 
                top: `${coords().y}px` 
            }}
          >
            {props.text}
          </div>
        </Show>
      </Portal>
    </div>
  );
}
