import { JSX, Show, createSignal, createEffect, onCleanup } from "solid-js";
import { Portal } from "solid-js/web";
import { appStore } from "../../../stores/appStore";

interface ModalProps {
  show: boolean;
  onClose: () => void;
  title?: string;
  children: JSX.Element;
  actions?: JSX.Element;
  maxWidth?: string; // default '560px'
}

/**
 * M3 Expressive Modal
 * 
 * Features:
 * - Extra Large corners (28dp)
 * - Surface Container High background
 * - Smooth enter/exit transitions
 */
export default function Modal(props: ModalProps) {
  const [shouldRender, setShouldRender] = createSignal(false);
  const [isVisible, setIsVisible] = createSignal(false);
  
  // Mobile keyboard visual viewport fix
  const [vvStyle, setVvStyle] = createSignal({ 
    top: '0px', 
    height: '100dvh' // rely on default css, we only override if vv exists
  });

  let timer: number;

  createEffect(() => {
    // Watch visual viewport to handle mobile keyboard offset shifts
    const vfix = () => {
      if (!window.visualViewport) {
        setVvStyle({ top: '0px', height: '100dvh' });
        return;
      }
      setVvStyle({ 
        top: `${window.visualViewport.offsetTop}px`, 
        height: `${window.visualViewport.height}px` 
      });
    };

    if (props.show && window.visualViewport) {
      window.visualViewport.addEventListener("resize", vfix);
      window.visualViewport.addEventListener("scroll", vfix);
      vfix(); // Init

      onCleanup(() => {
        window.visualViewport?.removeEventListener("resize", vfix);
        window.visualViewport?.removeEventListener("scroll", vfix);
      });
    } else {
      setVvStyle({ top: '0px', height: '100dvh' });
    }
  });

  createEffect(() => {
    if (props.show) {
      if (timer) clearTimeout(timer);
      setShouldRender(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setIsVisible(true)));

      // Add handler to back stack
      const handler = () => {
        props.onClose();
        return true;
      };
      appStore.pushBackHandler(handler);

      onCleanup(() => {
        appStore.popBackHandler(handler);
      });
    } else {
      setIsVisible(false);
      timer = setTimeout(() => setShouldRender(false), 300);
    }
  });

  return (
    <Portal>
      <Show when={shouldRender()}>
        <div 
          class="fixed left-0 w-full z-[10005] flex items-center justify-center p-4 overflow-hidden"
          style={{ 
            top: vvStyle().top,
            height: vvStyle().height,
          }}
        >
          {/* Backdrop */}
          <div 
            class={`absolute inset-0 bg-black/40 transition-opacity duration-300 ease-out ${isVisible() ? 'opacity-100' : 'opacity-0'}`}
            onClick={props.onClose}
          />

          {/* Modal Container */}
          <div 
            class={`
              relative z-10 w-full bg-[var(--color-surface-container-high)] 
              rounded-[28px] overflow-hidden flex flex-col p-0 shadow-2xl
              transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] origin-center
              ${isVisible() ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}
            `}
            style={{ "max-width": props.maxWidth || '560px', "max-height": "100%" }}
          >
            {/* Header */}
            <Show when={props.title}>
              <div class="px-5 pt-5 mb-2">
                <h2 class="text-[var(--color-on-surface)] text-xl font-medium tracking-tight">
                  {props.title}
                </h2>
              </div>
            </Show>

            {/* Content */}
            <div class="px-5 flex-grow overflow-y-auto">
              {props.children}
            </div>

            {/* Actions */}
            <Show when={props.actions}>
              <div class="p-4 flex justify-end gap-2">
                {props.actions}
              </div>
            </Show>
          </div>
        </div>
      </Show>
    </Portal>
  );
}
