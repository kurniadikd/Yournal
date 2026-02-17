import { Component, createSignal, For, Show, onMount } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { Portal } from "solid-js/web";
import LoadingSpinner from "../ui/m3e/LoadingSpinner";

interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface CatatanBaruProps {
  show: boolean;
  onClose: () => void;
  onSelect: (data: { content: string; title: string }) => void;
}

const CatatanBaru: Component<CatatanBaruProps> = (props) => {
  const [templates, setTemplates] = createSignal<TemplateInfo[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [previews, setPreviews] = createSignal<Record<string, string>>({});

  onMount(async () => {
    try {
      const data = await invoke<TemplateInfo[]>("get_templates");
      setTemplates(data);

      // Preload template content for previews
      for (const t of data) {
        try {
          const content = await invoke<string>("get_template_content", { id: t.id });
          setPreviews(prev => ({ ...prev, [t.id]: content }));
        } catch (err) {
          console.warn(`Preview failed for ${t.id}:`, err);
        }
      }
    } catch (err) {
      console.error("Failed to load templates:", err);
    }
  });

  const handleBlank = () => {
    props.onSelect({ content: '<p data-placeholder="Mulai menulis..."></p>', title: "" });
  };

  const handleTemplate = async (template: TemplateInfo) => {
    setLoading(true);
    try {
      // Use cached preview if available, otherwise fetch
      const cached = previews()[template.id];
      if (cached) {
        props.onSelect({ content: cached, title: template.name });
      } else {
        const content = await invoke<string>("get_template_content", { id: template.id });
        props.onSelect({ content, title: template.name });
      }
    } catch (err) {
      console.error("Failed to load template:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Show when={props.show}>
      <Portal>
        <div class="fixed inset-0 z-50 bg-[var(--color-surface)] flex flex-col animate-in fade-in duration-200 overflow-hidden">
          
          {/* Top Bar */}
          <header class="flex items-center gap-4 px-6 py-4 shrink-0 border-b border-[var(--color-outline-variant)]/20">
            <button
              onClick={props.onClose}
              class="w-10 h-10 rounded-full flex items-center justify-center text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-highest)] transition-colors"
            >
              <span class="material-symbols-rounded text-[24px]">arrow_back</span>
            </button>
            <div class="flex-1">
              <h1 class="text-2xl font-bold text-[var(--color-on-surface)]">Baru</h1>
            </div>
          </header>

          {/* Loading overlay */}
          <Show when={loading()}>
            <div class="absolute inset-0 z-10 flex items-center justify-center bg-[var(--color-surface)]/80">
              <LoadingSpinner size="large" />
            </div>
          </Show>

          {/* Scrollable Content */}
          <div class="flex-1 overflow-y-auto px-6 md:px-12 py-8">
            
            {/* Grid of template previews */}
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 max-w-[1200px] mx-auto">
              
              {/* Blank Page */}
              <button
                onClick={handleBlank}
                class="group flex flex-col items-center gap-3 text-center"
              >
                {/* Preview thumbnail */}
                <div class="w-full aspect-[3/4] rounded-[12px] border-2 border-[var(--color-outline-variant)]/30 bg-white flex items-start justify-center pt-6 transition-all group-hover:border-[var(--color-primary)] group-hover:shadow-lg group-hover:shadow-[var(--color-primary)]/10 group-hover:scale-[1.03] active:scale-[0.98]">
                  {/* Blank page with just cursor line */}
                  <div class="w-[70%] flex flex-col gap-1.5 items-start">
                    <div class="w-1 h-4 bg-gray-400 animate-pulse rounded-full"></div>
                  </div>
                </div>
                <span class="text-sm font-medium text-[var(--color-on-surface)] group-hover:text-[var(--color-primary)] transition-colors">
                  Halaman kosong
                </span>
              </button>

              {/* Template Cards */}
              <For each={templates()}>
                {(template) => (
                  <button
                    onClick={() => handleTemplate(template)}
                    disabled={loading()}
                    class="group flex flex-col items-center gap-3 text-center disabled:opacity-50"
                  >
                    {/* Preview thumbnail — render HTML preview */}
                    <div class="w-full aspect-[3/4] rounded-[12px] border-2 border-[var(--color-outline-variant)]/30 bg-white overflow-hidden transition-all group-hover:border-[var(--color-primary)] group-hover:shadow-lg group-hover:shadow-[var(--color-primary)]/10 group-hover:scale-[1.03] active:scale-[0.98]">
                      <Show 
                        when={previews()[template.id]}
                        fallback={
                          <div class="w-full h-full flex items-center justify-center">
                            <span 
                              class="material-symbols-rounded text-[40px] text-gray-300"
                              style={{ "font-variation-settings": "'FILL' 1" }}
                            >
                              {template.icon}
                            </span>
                          </div>
                        }
                      >
                        <div 
                          class="w-[200%] h-[200%] origin-top-left scale-50 p-4 text-left pointer-events-none"
                          style={{ "font-size": "11px", "line-height": "1.4", "color": "#333" }}
                          innerHTML={previews()[template.id]}
                        ></div>
                      </Show>
                    </div>
                    <span class="text-sm font-medium text-[var(--color-on-surface)] group-hover:text-[var(--color-primary)] transition-colors">
                      {template.name}
                    </span>
                  </button>
                )}
              </For>
            </div>
          </div>
        </div>
      </Portal>
    </Show>
  );
};

export default CatatanBaru;
