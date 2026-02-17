import { createSignal, Show } from "solid-js";
import Button from "./Button";

interface VideoModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: (url: string) => void;
}

export default function VideoModal(props: VideoModalProps) {
  const [tab, setTab] = createSignal<'local' | 'url'>('local');
  const [url, setUrl] = createSignal('');
  let fileInputRef!: HTMLInputElement;

  const handleLocalUpload = () => {
    fileInputRef.click();
  };

  const onFileChange = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        const content = readerEvent.target?.result as string;
        props.onConfirm(content);
        props.onClose();
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUrlConfirm = () => {
    if (url().trim()) {
      props.onConfirm(url());
      props.onClose();
      setUrl('');
    }
  };

  return (
    <div class={`modal ${props.show ? 'modal-open' : ''} transition-all duration-300 z-[110]`}>
      
      {/* Modal Container */}
      <div 
        class={`
          modal-box relative bg-[var(--color-surface-container-high)] w-full max-w-md 
          rounded-[28px] p-6 overflow-visible
          ${props.show ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
        `}
      >
        <h2 class="text-2xl font-semibold text-[var(--color-on-surface)] mb-6">Sisipkan Video</h2>
        
        {/* Tabs */}
        <div class="flex p-1 bg-[var(--color-surface-container)] rounded-2xl mb-6">
          <button 
            onClick={() => setTab('local')}
            class={`flex-1 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
              tab() === 'local' 
              ? 'bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]' 
              : 'text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)]'
            }`}
          >
            Unggah Lokal
          </button>
          <button 
            onClick={() => setTab('url')}
            class={`flex-1 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
              tab() === 'url' 
              ? 'bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]' 
              : 'text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)]'
            }`}
          >
            Alamat URL
          </button>
        </div>

        <div class="min-h-[140px] flex flex-col justify-center">
          <Show when={tab() === 'local'}>
            <div 
              onClick={handleLocalUpload}
              class="bg-[var(--color-surface-container-highest)] rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-[var(--color-primary-container)]/20 transition-all group"
            >
              <span class="material-symbols-rounded text-4xl text-[var(--color-primary)] group-hover:scale-110 transition-transform">
                movie
              </span>
              <span class="text-sm font-medium text-[var(--color-on-surface-variant)]">
                Klik untuk pilih video
              </span>
              <input 
                type="file" 
                ref={fileInputRef!} 
                class="hidden" 
                accept="video/*" 
                onChange={onFileChange} 
              />
            </div>
          </Show>

          <Show when={tab() === 'url'}>
            <div class="flex flex-col gap-4">
              <div class="relative">
                <input 
                  type="text"
                  placeholder="https://example.com/video.mp4"
                  value={url()}
                  onInput={(e) => setUrl(e.currentTarget.value)}
                  class="w-full h-12 px-4 bg-[var(--color-surface-container-low)] border-none rounded-2xl focus:bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface-variant)]/40 outline-none transition-colors"
                />
              </div>
              <Button 
                variant="filled" 
                class="w-full" 
                onClick={handleUrlConfirm}
                disabled={!url().trim()}
              >
                Sisipkan Video
              </Button>
            </div>
          </Show>
        </div>

        <div class="flex justify-end gap-2 mt-8">
          <Button variant="text" onClick={props.onClose}>Batal</Button>
        </div>
      </div>

      {/* Backdrop */}
      <div class="modal-backdrop bg-black/40" onClick={props.onClose}>
        <button class="cursor-default">close</button>
      </div>
    </div>
  );
}
