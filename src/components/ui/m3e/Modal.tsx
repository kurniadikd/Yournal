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
  let timer: number;

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
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            class={`fixed inset-0 bg-black/40 transition-opacity duration-300 ease-out ${isVisible() ? 'opacity-100' : 'opacity-0'}`}
            onClick={props.onClose}
          />

          {/* Modal Container */}
          <div 
            class={`
              relative w-full bg-[var(--color-surface-container-high)] 
              rounded-[28px] overflow-hidden flex flex-col p-0 shadow-2xl
              transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] origin-center
              ${isVisible() ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}
            `}
            style={{ "max-width": props.maxWidth || '560px' }}
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
