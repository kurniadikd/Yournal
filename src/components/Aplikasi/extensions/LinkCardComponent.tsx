import { fetch } from '@tauri-apps/plugin-http';
import { createSignal, onMount, onCleanup, Show } from 'solid-js';

export interface LinkCardAttributes {
  href: string;
  title?: string;
  description?: string;
  image?: string;
  domain?: string;
}

export default function LinkCardComponent(props: { 
  node: { attrs: LinkCardAttributes }, 
  updateAttributes: (attrs: Partial<LinkCardAttributes>) => void,
  selected: boolean,
  deleteNode: () => void
}) {
  const [loading, setLoading] = createSignal(true);
  
  // Gunakan signal lokal untuk data agar UI reaktif, 
  // tapi init dari props.node.attrs jika sudah ada data tersimpan
  const [data, setData] = createSignal<LinkCardAttributes>(props.node.attrs);

  onMount(async () => {
    // Jika data sudah lengkap (misal dari save sebelumnya), tidak perlu fetch ulang
    if (data().title && data().description) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    onCleanup(() => isMounted = false);

    try {
      const url = data().href;
      // Ekstrak domain untuk display
      try {
        const domain = new URL(url).hostname;
        props.updateAttributes({ domain });
        setData(prev => ({ ...prev, domain }));
      } catch (e) { /* ignore invalid url for domain extraction */ }

      // Strict timeout using Promise.race
      const fetchWithTimeout = (url: string, options: RequestInit, timeout = 8000) => {
        return Promise.race([
          fetch(url, options),
          new Promise<Response>((_, reject) => 
            setTimeout(() => reject(new Error('Request timed out')), timeout)
          )
        ]);
      };

      // Fetch HTML
      const response = await fetchWithTimeout(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
      });
      
      if (!response.ok) throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);

      const html = await response.text();
      // If unmounted, stop processing
      if (!isMounted) return;

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Helper untuk ambil meta tag
      const getMeta = (prop: string) => doc.querySelector(`meta[property="${prop}"]`)?.getAttribute('content') || 
                                        doc.querySelector(`meta[name="${prop}"]`)?.getAttribute('content');

      const title = getMeta('og:title') || doc.title || url;
      const description = getMeta('og:description') || getMeta('description') || '';
      const image = getMeta('og:image') || '';

      const newData = { ...data(), title, description, image };
      
      // Update state lokal dan atribute Tiptap (untuk persistensi)
      setData(newData);
      props.updateAttributes(newData);

    } catch (err) {
      console.error("LinkCard Fetch Error:", err);
      // Fallback title if fetch fails
      if (isMounted && !data().title) {
         const fallbackData = { ...data(), title: data().href };
         setData(fallbackData);
         props.updateAttributes(fallbackData);
      }
    } finally {
      if (isMounted) setLoading(false);
    }
  });

  return (
    <div class={`selectable-image-wrapper ${props.selected ? 'ProseMirror-selectednode' : ''} link-card-wrapper my-6 relative rounded-xl transition-all duration-300 w-full ${
      props.selected 
        ? 'shadow-[0_0_0_3px_var(--color-secondary)]' 
        : 'shadow-[0_0_0_0_var(--color-secondary)]'
    }`}>
      <a 
        href={data().href} 
        target="_blank" 
        rel="noopener noreferrer"
        class="block no-underline group select-none"
        contentEditable={false} // Penting agar tidak bisa diedit cursor
      >
        <div class="
          flex flex-col md:flex-row 
          bg-[var(--color-surface-container)] 
          border border-[var(--color-outline-variant)]/40
          rounded-xl overflow-hidden 
          transition-all duration-200 
          hover:bg-[var(--color-surface-container-high)] 
          hover:shadow-elevation-1
        ">
          
          {/* Image Section */}
          <Show when={!loading && data().image}>
            <div class="w-full md:w-48 h-48 md:h-auto shrink-0 bg-[var(--color-surface-container-highest)] relative overflow-hidden">
               <img 
                 src={data().image} 
                 alt={data().title} 
                 class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                 onError={(e) => e.currentTarget.style.display = 'none'}
               />
            </div>
          </Show>

          {/* Content Section */}
          <div class="flex-1 p-4 flex flex-col justify-center min-w-0">
            <Show when={loading}>
              <div class="animate-pulse space-y-3">
                 <div class="h-4 bg-[var(--color-on-surface-variant)]/10 rounded w-3/4"></div>
                 <div class="h-3 bg-[var(--color-on-surface-variant)]/10 rounded w-1/2"></div>
              </div>
            </Show>
            
            <Show when={!loading}>
              <div class="text-[10px] font-bold tracking-wider text-[var(--color-on-surface-variant)] uppercase mb-1 flex items-center gap-1.5 opacity-80">
                 <span class="material-symbols-rounded text-[14px]">public</span>
                 {data().domain || 'LINK PREVIEW'}
              </div>
              
              <h3 class="text-base font-bold text-[var(--color-on-surface)] line-clamp-2 leading-snug mb-2 group-hover:text-[var(--color-primary)] transition-colors">
                {data().title || data().href}
              </h3>
              
              <Show when={data().description}>
                <p class="text-sm text-[var(--color-on-surface-variant)] line-clamp-2 leading-relaxed opacity-80">
                  {data().description}
                </p>
              </Show>
            </Show>
          </div>
        </div>
      </a>

      {/* Persis tombol hapus SelectableImage */}
      <button 
        class="image-delete-btn"
        style={{ display: props.selected ? 'flex' : 'none' }}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); props.deleteNode(); }}
      >
        <span class="material-symbols-rounded">close</span>
      </button>
    </div>
  );
}
