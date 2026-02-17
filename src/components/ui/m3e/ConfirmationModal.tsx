import { Component, createSignal, createEffect, Show } from "solid-js";
import { Portal } from "solid-js/web";

interface ConfirmationModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary" | "tonal"; 
  icon?: string;
}

const ConfirmationModal: Component<ConfirmationModalProps> = (props) => {
  const [shouldRender, setShouldRender] = createSignal(false);
  const [isVisible, setIsVisible] = createSignal(false);
  let timer: number;

  createEffect(() => {
    if (props.show) {
      if (timer) clearTimeout(timer);
      setShouldRender(true);
      // Small delay to ensure render happens before class switch for transition
      requestAnimationFrame(() => requestAnimationFrame(() => setIsVisible(true)));
    } else {
      setIsVisible(false);
      timer = setTimeout(() => {
        setShouldRender(false);
      }, 300); // Match transition duration
    }
  });

  return (
    <Portal>
      <Show when={shouldRender()}>
        <div class="fixed inset-0 z-[60] flex items-center justify-center p-4">
          
          {/* Backdrop */}
          <div 
            class={`fixed inset-0 bg-black/60 transition-opacity duration-300 ease-out ${isVisible() ? 'opacity-100' : 'opacity-0'}`}
            onClick={props.onClose}
          />

          {/* Modal Panel */}
          <div 
            class={`
              relative w-full max-w-sm bg-[var(--color-surface-container-high)] 
              rounded-[28px] p-6 text-center align-middle shadow-2xl 
              transition-all duration-300 cubic-bezier(0.05, 0.7, 0.1, 1.0)
              ${isVisible() ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'}
            `}
          >
            {/* Icon */}
            <Show when={props.icon}>
              <div class={`mx-auto flex h-16 w-16 items-center justify-center rounded-full mb-4 ${props.variant === 'danger' ? 'bg-[var(--color-error-container)]' : 'bg-[var(--color-secondary-container)]'}`}>
                 <span class={`material-symbols-rounded text-4xl ${props.variant === 'danger' ? 'text-[var(--color-on-error-container)]' : 'text-[var(--color-on-secondary-container)]'}`}>
                   {props.icon}
                 </span>
              </div>
            </Show>

            {/* Title */}
            <h3 class="text-2xl font-bold text-[var(--color-on-surface)]">
              {props.title}
            </h3>

            {/* Message */}
            <p class="mt-2 text-sm text-[var(--color-on-surface-variant)]">
              {props.message}
            </p>

            {/* Actions Grid */}
            <div class="mt-8 grid grid-cols-2 gap-3">
              <button 
                onClick={props.onClose} 
                class="w-full rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] px-4 py-2 font-semibold text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-surface-container-low)]"
              >
                {props.cancelLabel || "Batal"}
              </button>
              
              <button 
                onClick={() => {
                    props.onConfirm();
                    props.onClose();
                }} 
                class={`
                  w-full rounded-xl px-4 py-2 font-semibold transition-colors
                  ${props.variant === 'danger' 
                      ? 'bg-[var(--color-error)] text-[var(--color-on-error)] hover:bg-[var(--color-error-container)] hover:text-[var(--color-on-error-container)]' 
                      : 'bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-fixed-dim)]'}
                `}
              >
                {props.confirmLabel || "Ya, Lanjutkan"}
              </button>
            </div>
          </div>
        </div>
      </Show>
    </Portal>
  );
};

export default ConfirmationModal;
