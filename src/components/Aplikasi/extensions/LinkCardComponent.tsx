import { openUrl } from '@tauri-apps/plugin-opener';
import { fetch } from '@tauri-apps/plugin-http';
import { createSignal, onMount, onCleanup, Show } from 'solid-js';

export interface LinkCardAttributes {
  href: string;
  title?: string;
  description?: string;
  image?: string;
  domain?: string;
  favicon?: string;
}

export default function LinkCardComponent(props: { 
  node: { attrs: LinkCardAttributes }, 
  updateAttributes: (attrs: Partial<LinkCardAttributes>) => void,
  selected: boolean,
  deleteNode: () => void
}) {
  const [loading, setLoading] = createSignal(!props.node.attrs.title);
  const [data, setData] = createSignal<LinkCardAttributes>(props.node.attrs);

  // Helper function to wrap URL with proxy (fixes COEP/CORS issues)
  const getProxyUrl = (url: string, width?: number) => {
    if (!url) return '';
    if (url.startsWith('data:')) return url; // Don't proxy base64
    // Using wsrv.nl to bypass COEP/CORS and optimize images
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}${width ? `&w=${width}` : ''}&output=webp`;
  };

  const handleOpenLink = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (data().href) {
      await openUrl(data().href);
    }
  };

  onMount(async () => {
    // Skip fetch if we already have metadata
    if (data().title && data().favicon) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    onCleanup(() => isMounted = false);

    const url = data().href;
    let domain = data().domain || '';

    // Update domain immediately
    try {
      domain = new URL(url).hostname.replace(/^www\./, '');
      setData(prev => {
        const updated = { ...prev, domain };
        props.updateAttributes({ domain: updated.domain });
        return updated;
      });
    } catch (e) { /* ignore */ }

    try {
      // Using Microlink API: Very stable for bypassing bot protection & SPA rendering
      const apiUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}`;
      const response = await fetch(apiUrl);
      
      if (!response.ok) throw new Error('Failed to fetch metadata');
      
      const json = await response.json();
      
      if (json.status === 'success' && isMounted) {
        const result = json.data;
        
        const title = result.title || url;
        const description = result.description || '';
        const image = result.image?.url || '';
        const favicon = result.logo?.url || `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

        setData(prev => {
           const updated = { ...prev, title, description, image, favicon };
           props.updateAttributes(updated);
           return updated;
        });
      }
    } catch (err) {
      console.warn("LinkCard fetch fail (Microlink):", err);
      if (isMounted) {
         const fallbackFavicon = data().favicon || (domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=32` : '');
         setData(prev => {
            const updated = { ...prev, title: prev.title || url, description: '', image: '', favicon: fallbackFavicon };
            props.updateAttributes(updated);
            return updated;
         });
      }
    } finally {
      if (isMounted) setLoading(false);
    }
  });

  return (
    <div 
      class={`
        link-card-wrapper selectable-image-wrapper my-8 relative rounded-2xl transition-all duration-500 w-full group
        ${props.selected ? 'ProseMirror-selectednode shadow-[0_0_0_3px_var(--color-secondary)]' : ''}
      `}
    >
      
      <Show when={loading()}>
        <div class="w-full flex flex-col sm:flex-row bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)]/30 rounded-2xl overflow-hidden animate-pulse sm:h-[180px]">
            {/* Image Skeleton */}
            <div class="w-full sm:w-[320px] aspect-video sm:aspect-auto sm:h-full bg-[var(--color-surface-container-highest)] flex items-center justify-center shrink-0">
               <span class="material-symbols-rounded text-3xl text-[var(--color-primary)]/10">image</span>
            </div>
            {/* Content Skeleton */}
            <div class="p-4 sm:p-5 flex flex-col items-start w-full justify-center">
               <div class="flex items-center gap-2 mb-2">
                  <div class="w-[18px] h-[18px] rounded-full bg-[var(--color-primary)]/10"></div>
                  <div class="h-2.5 bg-[var(--color-primary)]/10 rounded w-24"></div>
               </div>
               <div class="h-5 bg-[var(--color-on-surface)]/10 rounded w-4/5 mb-2"></div>
               <div class="h-3 bg-[var(--color-on-surface-variant)]/10 rounded w-full mb-1"></div>
               <div class="h-3 bg-[var(--color-on-surface-variant)]/10 rounded w-2/3"></div>
            </div>
        </div>
      </Show>

      <Show when={!loading()}>
        <div 
          class={`
            flex flex-col sm:flex-row items-stretch
            bg-[var(--color-surface-container-low)] 
            border border-[var(--color-outline-variant)]/30
            rounded-2xl overflow-hidden 
            transition-all duration-300
            hover:bg-[var(--color-surface-container)] 
            hover:border-[var(--color-outline-variant)]/60
            hover:shadow-lg
            sm:min-h-[160px] sm:max-h-[220px]
          `}
        >
          <Show when={data().image}>
            <div class="w-full sm:w-[320px] aspect-video sm:aspect-auto shrink-0 overflow-hidden relative border-r border-[var(--color-outline-variant)]/10">
               <img 
                 src={getProxyUrl(data().image || '', 600)} 
                 alt="" 
                 class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 no-ring"
                 style={{ "margin": "0 !important", "padding": "0 !important" }}
                 onError={(e) => e.currentTarget.style.display = 'none'}
               />
            </div>
          </Show>

          <div class="p-4 sm:p-5 flex flex-col items-start min-w-0 w-full justify-center overflow-hidden">
            <div class="text-[12px] font-bold tracking-[0.03em] text-[var(--color-primary)] mb-1 flex items-center gap-2">
               <Show when={data().favicon} fallback={<span class="material-symbols-rounded text-[18px] icon-fill shrink-0">public</span>}>
                  <img 
                    src={getProxyUrl(data().favicon || '', 32)} 
                    alt="" 
                    class="shrink-0 object-contain rounded-sm no-ring" 
                    style={{ "width": "18px !important", "height": "18px !important", "max-width": "18px", "max-height": "18px" }}
                  />
               </Show>
               <span class="opacity-80">{data().domain || 'link'}</span>
            </div>
            
            <a 
              href={data().href} 
              class="block no-underline group/link w-full cursor-pointer"
              contentEditable={false}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={handleOpenLink}
            >
              <h3 class="text-base sm:text-lg font-semibold text-[var(--color-on-surface)] line-clamp-2 leading-tight mb-1 group-hover/link:text-[var(--color-primary)] group-hover/link:underline transition-all">
                {data().title || data().href}
              </h3>
            </a>
            
            <Show when={data().description}>
              <p class="text-xs sm:text-sm text-[var(--color-on-surface-variant)] line-clamp-2 leading-relaxed opacity-90">
                {data().description}
              </p>
            </Show>

          </div>
        </div>
      </Show>

      {/* Delete Button */}
      <Show when={props.selected}>
        <button 
          class="image-delete-btn"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); props.deleteNode(); }}
          style={{ display: 'flex' }}
        >
          <span class="material-symbols-rounded">close</span>
        </button>
      </Show>
    </div>
  );
}
