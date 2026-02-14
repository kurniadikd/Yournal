import { JSX, For, Show, mergeProps } from "solid-js";

interface NavItem {
  id: string;
  label: string;
  icon: JSX.Element;
  activeIcon?: JSX.Element;
}

interface NavigationProps {
  items: NavItem[];
  activeId: string;
  onChange: (id: string) => void;
  type?: 'bar' | 'rail';
  class?: string;
}

/**
 * M3 Expressive Navigation
 * 
 * Features:
 * - Bottom Bar (Mobile) and Rail (Desktop)
 * - Expressive active indicators (Pill shapes)
 * - Strictly Flat
 */
export default function Navigation(props: NavigationProps) {
  const merged = mergeProps({ type: 'bar' as const }, props);

  return (
    <Show 
      when={merged.type === 'bar'} 
      fallback={<NavigationRail {...merged} />}
    >
      <NavigationBar {...merged} />
    </Show>
  );
}

function NavigationBar(props: NavigationProps) {
  return (
    <nav 
      class={`
        flex items-center justify-around h-20 px-2 
        bg-[var(--color-surface-container)] transition-colors
        ${props.class || ''}
      `}
    >
      <For each={props.items}>
        {(item) => {
          const isActive = () => props.activeId === item.id;
          return (
            <button
              onClick={() => props.onChange(item.id)}
              class="relative flex flex-col items-center justify-center flex-1 h-full gap-1 group"
            >
              {/* Active Indicator (Pill) */}
              <div 
                class={`
                  absolute top-2 w-16 h-8 rounded-full transition-all duration-200 transform scale-x-0 origin-center
                  ${isActive() ? 'bg-[var(--color-secondary-container)] scale-x-100' : 'group-hover:bg-[var(--color-on-surface)]/5 group-hover:scale-x-100'}
                `}
              />
              
              {/* Icon */}
              <div 
                class={`
                  relative z-10 transition-colors duration-200
                  ${isActive() ? 'text-[var(--color-on-secondary-container)]' : 'text-[var(--color-on-surface-variant)]'}
                `}
              >
                {isActive() && item.activeIcon ? item.activeIcon : item.icon}
              </div>

              {/* Label */}
              <span 
                class={`
                  relative z-10 text-[11px] font-medium transition-colors duration-200
                  ${isActive() ? 'text-[var(--color-on-surface)]' : 'text-[var(--color-on-surface-variant)]'}
                `}
              >
                {item.label}
              </span>
            </button>
          );
        }}
      </For>
    </nav>
  );
}

function NavigationRail(props: NavigationProps) {
  return (
    <nav 
      class={`
        flex flex-col items-center py-4 w-20 h-full 
        bg-[var(--color-surface-container)] transition-colors
        ${props.class || ''}
      `}
    >
      <For each={props.items}>
        {(item) => {
          const isActive = () => props.activeId === item.id;
          return (
            <button
              onClick={() => props.onChange(item.id)}
              class="relative flex flex-col items-center justify-center w-full min-h-[56px] py-4 gap-1 group"
            >
              {/* Active Indicator (Pill) */}
              <div 
                class={`
                  absolute w-14 h-8 rounded-full transition-all duration-200 transform scale-x-0 origin-center
                  ${isActive() ? 'bg-[var(--color-secondary-container)] scale-x-100' : 'group-hover:bg-[var(--color-on-surface)]/5 group-hover:scale-x-100'}
                `}
              />
              
              {/* Icon */}
              <div 
                class={`
                  relative z-10 transition-colors duration-200
                  ${isActive() ? 'text-[var(--color-on-secondary-container)]' : 'text-[var(--color-on-surface-variant)]'}
                `}
              >
                {isActive() && item.activeIcon ? item.activeIcon : item.icon}
              </div>

              {/* Label */}
              <span 
                class={`
                  relative z-10 text-[11px] font-medium transition-colors duration-200
                  ${isActive() ? 'text-[var(--color-on-surface)]' : 'text-[var(--color-on-surface-variant)]'}
                `}
              >
                {item.label}
              </span>
            </button>
          );
        }}
      </For>
    </nav>
  );
}
