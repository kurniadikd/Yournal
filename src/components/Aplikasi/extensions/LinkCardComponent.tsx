import { fetch } from '@tauri-apps/plugin-http';
import { createSignal, onMount, onCleanup, Show } from 'solid-js';

export interface LinkCardAttributes {
  href: string;
  title?: string;
  description?: string;
  image?: string;
  domain?: string;
  isFramable?: boolean | null;
  favicon?: string;
}

export default function LinkCardComponent(props: { 
  node: { attrs: LinkCardAttributes }, 
  updateAttributes: (attrs: Partial<LinkCardAttributes>) => void,
  selected: boolean,
  deleteNode: () => void
}) {
  const [loading, setLoading] = createSignal(!props.node.attrs.title && props.node.attrs.isFramable === null);
  const [data, setData] = createSignal<LinkCardAttributes>(props.node.attrs);
  const [isFramable, setIsFramable] = createSignal<boolean | null>(props.node.attrs.isFramable ?? null);

  onMount(async () => {
    // If we already know the status and have metadata, skip fetch
    if (isFramable() !== null && data().title && data().favicon) {
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

    const fetchWithTimeout = (fetchUrl: string, options: any, timeout = 10000) => {
      return Promise.race([
        fetch(fetchUrl, options),
        new Promise<Response>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), timeout)
        )
      ]);
    };

    // Helper: resolve relative/protocol-relative URLs
    const resolveUrl = (raw: string, base: string): string => {
      if (!raw) return '';
      if (raw.startsWith('http')) return raw;
      if (raw.startsWith('//')) {
        try { return new URL(base).protocol + raw; } catch { return raw; }
      }
      try { return new URL(raw, base).href; } catch { return raw; }
    };

    // Helper: check framability via headers  
    const checkFramable = async (): Promise<boolean> => {
      try {
        const headRes = await fetchWithTimeout(url, {
          method: 'HEAD',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        }, 5000);
        const xfo = headRes.headers.get('X-Frame-Options')?.toUpperCase();
        const csp = headRes.headers.get('Content-Security-Policy')?.toLowerCase() || '';
        if (xfo === 'DENY' || xfo === 'SAMEORIGIN') return false;
        if (csp.includes('frame-ancestors')) return false;
        return true;
      } catch { return false; }
    };

    // Helper: apply final data
    const applyData = (title: string, description: string, image: string, favicon: string, framable: boolean) => {
      if (!isMounted) return;
      const newData = { ...data(), title, description, image, isFramable: framable, favicon };
      setData(newData);
      setIsFramable(framable);
      props.updateAttributes(newData);
    };

    // =========================================================
    // STRATEGY 1: Free metadata extraction API (jsonlink.io)
    // =========================================================
    try {
      const apiUrl = `https://jsonlink.io/api/extract?url=${encodeURIComponent(url)}`;
      const apiRes = await fetchWithTimeout(apiUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      }, 8000);

      if (apiRes.ok) {
        const json = await apiRes.json();
        if (json && (json.title || json.description || (json.images && json.images.length > 0))) {
          const framable = await checkFramable();
          const favicon = json.favicon 
            ? resolveUrl(json.favicon, url) 
            : `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

          applyData(
            json.title || url,
            json.description || '',
            (json.images && json.images[0]) || '',
            favicon,
            framable
          );
          if (isMounted) setLoading(false);
          return; // Done!
        }
      }
    } catch (e) {
      console.warn("LinkCard API extract failed, falling back:", e);
    }

    // =========================================================
    // STRATEGY 2: Manual HTML fetch + parse (fallback)
    // =========================================================
    try {
      const response = await fetchWithTimeout(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      // Check framability
      const xFrameOptions = response.headers.get('X-Frame-Options')?.toUpperCase();
      const csp = response.headers.get('Content-Security-Policy')?.toLowerCase() || '';
      let framable = true;
      if (xFrameOptions === 'DENY' || xFrameOptions === 'SAMEORIGIN') framable = false;
      else if (csp.includes('frame-ancestors')) framable = false;

      const html = await response.text();
      if (!isMounted) return;

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const getMeta = (names: string[]) => {
        for (const name of names) {
          const el = doc.querySelector(`meta[property="${name}"]`) 
                  || doc.querySelector(`meta[name="${name}"]`)
                  || doc.querySelector(`meta[itemprop="${name}"]`);
          const content = el?.getAttribute('content');
          if (content) return content;
        }
        return null;
      };

      const title = getMeta(['og:title', 'twitter:title']) || doc.title || url;
      const description = getMeta(['og:description', 'twitter:description', 'description']) || '';
      const image = resolveUrl(
        getMeta(['og:image', 'og:image:url', 'og:image:secure_url', 'twitter:image:src', 'twitter:image']) || '', 
        url
      );

      // Favicon
      let favicon = '';
      for (const sel of ['link[rel~="icon"]', 'link[rel="shortcut icon"]', 'link[rel="apple-touch-icon"]']) {
         const el = doc.querySelector(sel);
         if (el?.getAttribute('href')) {
            favicon = resolveUrl(el.getAttribute('href')!, url);
            break;
         }
      }
      if (!favicon && domain) {
         favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
      }

      applyData(title, description, image, favicon, framable);

    } catch (err) {
      console.warn("LinkCard manual fetch fail:", err);
      if (isMounted) {
         const favicon = data().favicon || (domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=32` : '');
         applyData(data().title || data().href, '', '', favicon, false);
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
        <Show 
          when={isFramable() === true} 
          fallback={
            /* FALLBACK: Desain Link Card */
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
                     src={data().image} 
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
                        src={data().favicon} 
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
          }
        >
          {/* LIVE PREVIEW: Iframe Mode */}
          <div class="relative w-full pt-[56.25%] bg-white border border-[var(--color-outline-variant)]/30 rounded-2xl overflow-hidden shadow-sm">
            <iframe 
              src={data().href} 
              class="absolute top-0 left-0 w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-popups"
              title="Web Preview"
            />
            {/* Overlay to allow selecting the node instead of interacting with iframe when not selected */}
            <Show when={!props.selected}>
               <div class="absolute inset-0 z-10 cursor-pointer bg-transparent" />
            </Show>
          </div>
        </Show>
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
