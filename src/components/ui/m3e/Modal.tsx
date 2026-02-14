import { JSX, Show, createSignal, onMount, onCleanup } from "solid-js";
import { Portal } from "solid-js/web";

interface ModalProps {
  show: boolean;
  onClose: () => void;
  title?: string;
  children: JSX.Element;
  actions?: JSX.Element;
}

/**
 * M3 Expressive Modal
 * 
 * Features:
 * - Extra Large corners (28dp)
 * - Surface Container High background
 * - Strictly Flat (No shadows, No backdrop blur)
 */
export default function Modal(props: ModalProps) {
  const [isVisible, setIsVisible] = createSignal(false);

  // Handle animation lifecycle
  onMount(() => {
    if (props.show) setIsVisible(true);
  });

  return (
    <Portal>
      <div 
        class={`modal ${props.show ? 'modal-open' : ''} transition-all duration-300`}
        onKeyDown={(e) => e.key === 'Escape' && props.onClose()}
      >
        {/* Modal Container */}
        <div 
          class={`
            modal-box w-full max-w-[560px] bg-[var(--color-surface-container-high)] 
            rounded-[28px] overflow-hidden flex flex-col p-0
            ${props.show ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
          `}
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

        {/* Backdrop */}
        <div class="modal-backdrop bg-black/32" onClick={props.onClose}>
          <button class="cursor-default">close</button>
        </div>
      </div>
    </Portal>
  );
}
