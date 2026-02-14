import { Show, createMemo, createSignal } from "solid-js";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

/**
 * M3 Expressive Switch
 * 
 * Ported from material-components-android 1.14.0-alpha09
 * Features:
 * - Morphing thumb (Circle -> Capsule -> Circle)
 * - Exact M3E path data
 * - Strictly Flat Design (No shadows, No borders)
 */
export default function Switch(props: SwitchProps) {
  const [isPressed, setIsPressed] = createSignal(false);

  // M3E Dimensions (Viewbox 0 0 52 32)
  // Track: M0,16 A16,16 0 0,1 16,0 H36 A16,16 0 0,1 36,32 H16 A16,16 0 0,1 0,16
  const trackPath = "M0,16 A16,16 0 0,1 16,0 H36 A16,16 0 0,1 36,32 H16 A16,16 0 0,1 0,16";
  
  // Thumb Paths
  const thumbUnchecked = "M8,16 A8,8 0 0,1 16,8 H16 A8,8 0 0,1 16,24 H16 A8,8 0 0,1 8,16";
  const thumbChecked = "M4,16 A12,12 0 0,1 16,4 H16 A12,12 0 0,1 16,28 H16 A12,12 0 0,1 4,16";
  const thumbMorphing = "M0,16 A11,11 0 0,1 11,5 H21 A11,11 0 0,1 21,27 H11 A11,11 0 0,1 0,16";

  const currentThumbPath = createMemo(() => {
    if (isPressed()) return thumbMorphing;
    return props.checked ? thumbChecked : thumbUnchecked;
  });

  const thumbPosition = createMemo(() => {
    if (isPressed()) {
      // Morphing state: slightly shifted to provide "dynamic" feel
      return props.checked ? "translateX(16px)" : "translateX(4px)";
    }
    // Static states: 0px places center at x=16, 20px places center at x=36
    return props.checked ? "translateX(20px)" : "translateX(0px)";
  });

  return (
    <div
      class={`relative inline-flex items-center cursor-pointer select-none transition-opacity ${props.disabled ? 'opacity-38 pointer-events-none' : 'opacity-100'}`}
      onClick={() => props.onChange(!props.checked)}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      role="switch"
      aria-checked={props.checked}
      tabindex="0"
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          props.onChange(!props.checked);
        }
      }}
    >
      <svg
        viewBox="0 0 52 32"
        width="52"
        height="32"
        class="overflow-visible group"
      >
        {/* Track */}
        <path
          d={trackPath}
          fill={props.checked ? "var(--color-primary)" : "var(--color-surface-container-highest)"}
          class="transition-colors duration-200 group-hover:brightness-95"
        />
        
        {/* Thumb Group */}
        <g
          style={{
            transform: thumbPosition(),
            "transition": "transform 250ms cubic-bezier(0.2, 0, 0, 1)"
          }}
        >
          {/* Thumb Shape */}
          <path
            d={currentThumbPath()}
            fill={props.checked ? "var(--color-on-primary)" : "var(--color-outline)"}
            class="transition-all duration-250"
          />
          
          {/* Icons */}
          <Show when={props.checked}>
            <g transform="translate(16, 16) scale(0.9) translate(-12, -12)">
              <path 
                d="M9.55 18L3.85 12.3L5.275 10.875L9.55 15.15L18.725 5.975L20.15 7.4L9.55 18Z" 
                fill="var(--color-primary)"
              />
            </g>
          </Show>
        </g>
      </svg>
    </div>
  );
}
