import { For, JSX, createSignal } from "solid-js";

interface CarouselItem {
  id: string | number;
  content: JSX.Element;
  label?: string;
  image?: string;
}

interface CarouselProps {
  items: CarouselItem[];
  layout?: 'multi-browse' | 'hero' | 'uncontained';
  class?: string;
}

/**
 * M3 Expressive Carousel
 * 
 * Features:
 * - Expressive rounded corners (28px)
 * - CSS Scroll Snap for standard behavior
 * - Multi-browse/Hero layout patterns (simulated via item widths)
 */
export default function Carousel(props: CarouselProps) {
  const layout = () => props.layout || 'multi-browse';

  // Sizing logic based on M3 specs:
  // Hero: One Large (80%+), One Small (15%+)
  // Multi-browse: Large, Medium, Small
  const getItemWidth = (index: number) => {
    if (layout() === 'hero') {
      return index === 0 ? 'w-[85%] md:w-[70%]' : 'w-[15%] md:w-[25%]';
    }
    if (layout() === 'multi-browse') {
      if (index % 3 === 0) return 'w-[60%] md:w-[50%]'; // Large
      if (index % 3 === 1) return 'w-[30%] md:w-[35%]'; // Medium
      return 'w-[10%] md:w-[15%]'; // Small
    }
    return 'w-[45%] md:w-[30%]'; // Uncontained / Default
  };

  return (
    <div 
      class={`flex gap-2 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-4 ${props.class || ''}`}
      style={{ "scroll-behavior": "smooth" }}
    >
      <For each={props.items}>
        {(item, index) => (
          <div 
            class={`
              flex-shrink-0 snap-start relative group
              aspect-[4/5] overflow-hidden rounded-[28px]
              bg-[var(--color-surface-container-high)]
              transition-transform duration-300
              ${getItemWidth(index())}
            `}
          >
            <Show when={item.image}>
              <img 
                src={item.image} 
                alt={item.label}
                class="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            </Show>
            
            <Show when={item.content}>
              <div class="absolute inset-0">
                {item.content}
              </div>
            </Show>

            {/* Label Overlay */}
            <Show when={item.label}>
              <div class="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
                <p class="text-white text-sm font-medium truncate">{item.label}</p>
              </div>
            </Show>

            {/* State Layer */}
            <div class="absolute inset-0 bg-current opacity-0 group-hover:opacity-[0.08] pointer-events-none transition-opacity" />
          </div>
        )}
      </For>
    </div>
  );
}
