import { createSignal, Show, onMount, onCleanup } from "solid-js";
import { Portal } from "solid-js/web";

interface SnackbarProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
  onClose: () => void;
}

/**
 * M3 Expressive Snackbar
 * 
 * Features:
 * - Inverse Surface colors
 * - Pure Flat
 * - Rounded corners (small)
 */
export default function Snackbar(props: SnackbarProps) {
  let timer: any;

  onMount(() => {
    if (props.duration !== 0) {
      timer = setTimeout(props.onClose, props.duration || 4000);
    }
  });

  onCleanup(() => {
    if (timer) clearTimeout(timer);
  });

  return (
    <Portal>
      <div class="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] w-full max-w-[400px] px-4">
        <div 
          class="flex items-center justify-between gap-4 p-4 rounded-lg bg-[var(--color-inverse-surface)] text-[var(--color-inverse-on-surface)] shadow-lg animate-in slide-in-from-bottom-4 duration-300"
        >
          <span class="text-sm font-medium flex-grow">
            {props.message}
          </span>
          
          <Show when={props.actionLabel}>
            <button 
              onClick={() => { props.onAction?.(); props.onClose(); }}
              class="text-[var(--color-inverse-primary)] text-sm font-bold px-2 py-1 rounded hover:bg-white/10 transition-colors"
            >
              {props.actionLabel}
            </button>
          </Show>
        </div>
      </div>
    </Portal>
  );
}
