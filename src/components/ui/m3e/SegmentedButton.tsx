import { JSX, For, createMemo, Show } from "solid-js";

interface SegmentedButtonOption {
  value: string;
  label: string;
  icon?: JSX.Element;
}

interface SegmentedButtonProps {
  options: SegmentedButtonOption[];
  value: string;
  onChange: (value: string) => void;
  class?: string;
}

/**
 * M3 Expressive Connected Button Group (replacing deprecated Segmented Button)
 * 
 * Ported from material-components-android 1.14.0-alpha09:
 * 
 * Shape tokens (from button_group_tokens.xml & styles.xml):
 *   - Container outer shape: ShapeAppearance.M3.Sys.Shape.Corner.Full (pill)
 *   - Inner corner size: 8dp (shapeCornerSizeSmall)
 *   - Spacing between buttons: 2dp
 * 
 * Color tokens (from tokens.xml - outlined variant used in toggle groups):
 *   - Selected container: colorSurfaceInverse → adapted to colorSecondaryContainer (flat)
 *   - Unselected container: transparent → adapted to colorSurfaceContainerLow (flat)
 *   - Selected text/icon: colorOnSurfaceInverse → adapted to colorOnSecondaryContainer (flat)
 *   - Unselected text/icon: colorOnSurfaceVariant
 * 
 * Typography: labelLarge (M3 label large = 14sp/medium)
 * 
 * Flat design adaptation: No outlines, no borders, no shadows.
 * Solid fills replace transparent/outlined containers.
 */
export default function SegmentedButton(props: SegmentedButtonProps) {
  return (
    <div 
      class={`inline-flex w-full gap-[2px] ${props.class || ''}`}
      role="group"
    >
      <For each={props.options}>
        {(option, index) => {
          const isSelected = createMemo(() => props.value === option.value);
          const isFirst = () => index() === 0;
          const isLast = () => index() === props.options.length - 1;

          // Build border-radius string per M3E connected logic:
          // First button: pill-left + 8px-right inner corners
          // Middle buttons: 8px all corners
          // Last button: 8px-left inner corners + pill-right
          const borderRadius = () => {
            const pill = "9999px";
            const inner = "8px";
            if (isFirst() && isLast()) return pill; // single button
            if (isFirst()) return `${pill} ${inner} ${inner} ${pill}`;
            if (isLast()) return `${inner} ${pill} ${pill} ${inner}`;
            return inner;
          };

          return (
            <button
              onClick={() => props.onChange(option.value)}
              role="radio"
              aria-checked={isSelected()}
              style={{ "border-radius": borderRadius() }}
              class={`
                relative flex-1 flex items-center justify-center gap-1.5
                h-10 px-4 cursor-pointer select-none
                text-sm font-medium tracking-wide
                transition-colors duration-200 ease-in-out
                ${isSelected() 
                    ? 'bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)]' 
                    : 'bg-[var(--color-surface-container-low)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)]'}
              `}
            >
              <div class={`flex items-center justify-center gap-1.5 ${isSelected() ? 'icon-fill' : ''}`}>
                <Show when={isSelected()}>
                  <span class="material-symbols-rounded text-[16px] leading-none">check</span>
                </Show>
                <Show when={option.icon}>
                  {option.icon}
                </Show>
              </div>
              <span class="truncate text-[13px]">{option.label}</span>
            </button>
          );
        }}
      </For>
    </div>
  );
}
