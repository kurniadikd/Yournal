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

    // Update domain
    try {
      domain = new URL(url).hostname.replace(/^www\./, '');
      props.updateAttributes({ domain });
      setData(prev => ({ ...prev, domain }));
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

        const newData = { ...data(), title, description, image, favicon };
        setData(newData);
        props.updateAttributes(newData);
      }
    } catch (err) {
      console.warn("LinkCard fetch fail (Microlink):", err);
      if (isMounted) {
         const favicon = data().favicon || (domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=32` : '');
         const newData = { ...data(), title: data().title || url, description: '', image: '', favicon };
         setData(newData);
         props.updateAttributes(newData);
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
        <div class="w-full flex flex-col md:flex-row bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)]/30 rounded-2xl overflow-hidden animate-pulse min-h-[200px]">
            {/* Image Skeleton */}
            <div class="w-full md:w-72 h-40 md:h-auto bg-[var(--color-surface-container-highest)] flex items-center justify-center shrink-0 self-stretch">
               <span class="material-symbols-rounded text-3xl text-[var(--color-primary)]/10">image</span>
            </div>
            {/* Content Skeleton */}
            <div class="flex-1 p-6 flex flex-col items-start">
               <div class="flex items-center gap-2 mb-3">
                  <div class="w-4 h-4 rounded-full bg-[var(--color-primary)]/10"></div>
                  <div class="h-2 bg-[var(--color-primary)]/10 rounded w-24"></div>
               </div>
               <div class="h-6 bg-[var(--color-on-surface)]/10 rounded w-4/5 mb-3"></div>
               <div class="h-4 bg-[var(--color-on-surface-variant)]/10 rounded w-full mb-2"></div>
               <div class="h-4 bg-[var(--color-on-surface-variant)]/10 rounded w-full mb-2"></div>
               <div class="h-4 bg-[var(--color-on-surface-variant)]/10 rounded w-2/3"></div>
            </div>
        </div>
      </Show>

      <Show when={!loading()}>
        <div 
          class={`
            flex flex-col md:flex-row items-stretch
            bg-[var(--color-surface-container-low)] 
            border border-[var(--color-outline-variant)]/30
            rounded-2xl overflow-hidden 
            transition-all duration-300
            hover:bg-[var(--color-surface-container)] 
            hover:border-[var(--color-outline-variant)]/60
            hover:shadow-lg
            min-h-[200px]
          `}
        >
          <Show when={data().image}>
            <div class="w-full md:w-72 min-h-[200px] md:min-h-0 shrink-0 overflow-hidden relative self-stretch">
               <img 
                 src={getProxyUrl(data().image || '', 600)} 
                 alt="" 
                 class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 no-ring"
                 style={{ "margin": "0 !important", "padding": "0 !important" }}
                 onError={(e) => e.currentTarget.style.display = 'none'}
               />
            </div>
          </Show>

          <div class="flex-1 p-6 flex flex-col items-start min-w-0">
            <div class="text-[11px] font-bold tracking-[0.05em] text-[var(--color-primary)] mb-2 flex items-center gap-2">
               <Show when={data().favicon} fallback={<span class="material-symbols-rounded text-[16px] icon-fill shrink-0">public</span>}>
                  <img 
                    src={getProxyUrl(data().favicon || '', 32)} 
                    alt="" 
                    class="shrink-0 object-contain rounded-sm no-ring" 
                    style={{ "width": "16px !important", "height": "16px !important", "max-width": "16px", "max-height": "16px" }}
                  />
               </Show>
               <span class="opacity-90">{data().domain || 'link'}</span>
            </div>
            
            <a 
              href={data().href} 
              target="_blank" 
              rel="noopener noreferrer"
              class="block no-underline group/link"
              contentEditable={false}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <h3 class="text-lg font-semibold text-[var(--color-on-surface)] line-clamp-2 leading-snug mb-2 group-hover/link:text-[var(--color-primary)] transition-colors">
                {data().title || data().href}
              </h3>
            </a>
            
            <Show when={data().description}>
              <p class="text-sm text-[var(--color-on-surface-variant)] line-clamp-3 leading-relaxed">
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
