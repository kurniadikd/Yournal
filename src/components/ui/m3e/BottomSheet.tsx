import { JSX, Show, createSignal, onMount } from "solid-js";
import { Portal } from "solid-js/web";

interface BottomSheetProps {
  show: boolean;
  onClose: () => void;
  title?: string;
  children: JSX.Element;
  actions?: JSX.Element;
}

/**
 * M3 Expressive Bottom Sheet
 * 
 * Features:
 * - Extra Large Top Corners (28dp)
 * - Drag Handle (32x4dp)
 * - Strictly Flat
 * - Animated sliding entry
 */
export default function BottomSheet(props: BottomSheetProps) {
  return (
    <Portal>
      <Show when={props.show}>
        <div class="fixed inset-0 z-[100] flex items-end justify-center transition-all duration-300">
          {/* Backdrop */}
          <div 
            class="absolute inset-0 bg-black/32 transition-opacity" 
            onClick={props.onClose}
          />

          {/* Sheet Container */}
          <div 
            class={`
              relative w-full max-w-[640px] bg-[var(--color-surface-container-low)] 
              rounded-t-[28px] overflow-hidden flex flex-col
              transition-all duration-300 transform
              ${props.show ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}
            `}
          >
            {/* Drag Handle */}
            <div class="flex justify-center p-3 cursor-pointer" onClick={props.onClose}>
              <div class="w-8 h-1 rounded-full bg-[var(--color-on-surface-variant)]/40" />
            </div>

            {/* Header */}
            <Show when={props.title}>
              <div class="px-6 pb-4">
                <h2 class="text-[var(--color-on-surface)] text-2xl font-normal">
                  {props.title}
                </h2>
              </div>
            </Show>

            {/* Content */}
            <div class="px-6 pb-6 flex-grow overflow-y-auto max-h-[70vh]">
              {props.children}
            </div>

            {/* Actions */}
            <Show when={props.actions}>
              <div class="p-6 flex justify-end gap-2 border-t border-[var(--color-outline-variant)]">
                {props.actions}
              </div>
            </Show>
          </div>
        </div>
      </Show>
    </Portal>
  );
}
