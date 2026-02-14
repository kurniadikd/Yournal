import { createSignal, onCleanup, createEffect, Show, JSX } from "solid-js";
import { Portal } from "solid-js/web";

interface PopoverProps {
  show: boolean;
  onClose: () => void;
  anchor: HTMLElement | undefined;
  children: JSX.Element;
  class?: string;
  placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end' | 'right-start' | 'left-start';
}

export default function Popover(props: PopoverProps) {
  const [position, setPosition] = createSignal({ top: 0, left: 0 });
  const [isPositioned, setIsPositioned] = createSignal(false);
  let contentRef: HTMLDivElement | undefined;

  createEffect(() => {
    if (props.show && props.anchor) {
      const rect = props.anchor.getBoundingClientRect();
      // Using fixed positioning, so no scroll offset needed. rect is viewport relative.
      
      let top = rect.bottom + 8;
      let left = rect.left;

      // Base position calculation
      if (props.placement === 'bottom-end') {
        left = rect.right; // Will be adjusted by transform translateX(-100%) in CSS if needed, but here we deal with raw px
      } else if (props.placement === 'top-start') {
        top = rect.top - 8;
      } else if (props.placement === 'top-end') {
        top = rect.top - 8;
        left = rect.right;
      } else if (props.placement === 'right-start') {
        top = rect.top;
        left = rect.right + 8; 
      } else if (props.placement === 'left-start') {
        top = rect.top;
        left = rect.left - 8;
      }

      // Boundary Detection & Adjustment
      if (contentRef) {
          const contentRect = contentRef.getBoundingClientRect();
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;

          // --- HORIZONTAL ADJUSTMENT ---
          // Prevent overlapping: Flip if touching edge, instead of just sliding back over the anchor.

          // 1. Check Right Overflow
          if (left + contentRect.width > viewportWidth - 16) {
              // If we were positioning to the right (`right-*`), try flipping to the left
              if (props.placement?.startsWith('right')) {
                  const spaceLeft = rect.left;
                  // If there is enough space on the left, flip it
                  if (spaceLeft > contentRect.width + 16) {
                      left = rect.left - contentRect.width - 8;
                  } else {
                      // If fits nowhere, strictly clamp (might overlap, but better than being offscreen)
                      left = viewportWidth - contentRect.width - 16;
                  }
              } else {
                  // Standard clamp for top/bottom placements
                  left = viewportWidth - contentRect.width - 16;
              }
          }

          // 2. Check Left Overflow
          if (left < 16) {
              // If we were positioning to the left (`left-*`), try flipping to the right
              if (props.placement?.startsWith('left')) {
                  const spaceRight = viewportWidth - rect.right;
                  if (spaceRight > contentRect.width + 16) {
                      left = rect.right + 8;
                  } else {
                      left = 16;
                  }
              } else {
                 left = 16;
              }
          }

          // --- VERTICAL ADJUSTMENT ---
          // Case: Going off bottom edge
          if (top + contentRect.height > viewportHeight - 16) {
              const spaceAbove = rect.top;
              // If specifically `bottom-*` placement vs generic
              if (props.placement?.startsWith('bottom')) {
                   if (spaceAbove > contentRect.height + 16) {
                       top = rect.top - contentRect.height - 8;
                   } else {
                       top = viewportHeight - contentRect.height - 16;
                   }
              } else {
                  // General fallback (flip check logic same as above)
                  if (spaceAbove > contentRect.height + 16) {
                     top = rect.top - contentRect.height - 8;
                  } else {
                     top = viewportHeight - contentRect.height - 16;
                  }
              }
          }
      }

      setPosition({ top, left });
      
      // Small delay to ensure render with correct position before showing
      requestAnimationFrame(() => setIsPositioned(true));
    } else {
        setIsPositioned(false);
    }
  });

  const handleClickOutside = (e: MouseEvent) => {
    if (
        props.show && 
        props.anchor && 
        contentRef &&
        !props.anchor.contains(e.target as Node) && 
        !contentRef.contains(e.target as Node)
    ) {
      props.onClose();
    }
  };

  createEffect(() => {
    if (props.show) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
  });

  onCleanup(() => {
    document.removeEventListener("mousedown", handleClickOutside);
  });

  return (
    <Portal>
      <Show when={props.show}>
        <div 
          ref={contentRef}
          class={`
            fixed z-[1000]
            bg-[var(--color-surface-container)] rounded-[16px] overflow-hidden shadow-elevation-2
            transition-opacity duration-200
            ${isPositioned() ? 'opacity-100 animate-in fade-in zoom-in-95' : 'opacity-0'}
            ${props.class || ''}
          `}
          style={{
            top: `${position().top}px`,
            left: `${position().left}px`,
            // Removed automatic transform based on placement since we manually calculated adjusted coordinates
            "transform": 'none', 
            "transform-origin": 'top left',
          }}
        >
          {props.children}
        </div>
      </Show>
    </Portal>
  );
}
