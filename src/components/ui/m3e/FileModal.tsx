import { createSignal, Show } from "solid-js";
import Button from "./Button";
import { open } from "@tauri-apps/plugin-dialog";

interface FileModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: (path: string) => void;
}

export default function FileModal(props: FileModalProps) {
  const [selectedPath, setSelectedPath] = createSignal<string | null>(null);

  const handleBrowseFiles = async () => {
    const selected = await open({
      multiple: false,
      directory: false,
    });
    
    if (selected && typeof selected === 'string') {
      setSelectedPath(selected);
    }
  };

  const handleConfirm = () => {
    if (selectedPath()) {
      props.onConfirm(selectedPath()!);
      props.onClose();
      setSelectedPath(null);
    }
  };

  return (
    <div class={`modal ${props.show ? 'modal-open' : ''} transition-all duration-300 z-[110]`}>
      <div 
        class={`
          modal-box relative bg-[var(--color-surface-container-high)] w-full max-w-md 
          rounded-[28px] p-6 overflow-visible
          ${props.show ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
        `}
      >
        <h2 class="text-2xl font-semibold text-[var(--color-on-surface)] mb-6">Lampirkan File</h2>
        
        <div 
          onClick={handleBrowseFiles}
          class="bg-[var(--color-surface-container-highest)] rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-[var(--color-primary-container)]/20 transition-all group min-h-[140px]"
        >
          <Show when={selectedPath()} fallback={
            <>
              <span class="material-symbols-rounded text-4xl text-[var(--color-primary)] group-hover:scale-110 transition-transform">
                upload_file
              </span>
              <span class="text-sm font-medium text-[var(--color-on-surface-variant)] text-center">
                Klik untuk memilih file dari perangkat
              </span>
            </>
          }>
            <span class="material-symbols-rounded text-4xl text-[var(--color-primary)]">
              description
            </span>
            <span class="text-sm font-medium text-[var(--color-on-surface-variant)] break-all text-center px-4">
              {selectedPath()?.split(/[\\/]/).pop()}
            </span>
            <button 
              onClick={(e) => { e.stopPropagation(); setSelectedPath(null); }}
              class="text-xs text-[var(--color-primary)] underline mt-1"
            >
              Ganti File
            </button>
          </Show>
        </div>

        <div class="flex justify-end gap-2 mt-8">
          <Button variant="text" onClick={props.onClose}>Batal</Button>
          <Button variant="filled" onClick={handleConfirm} disabled={!selectedPath()}>
            Lampirkan
          </Button>
        </div>
      </div>

      <div class="modal-backdrop bg-black/40" onClick={props.onClose}>
        <button class="cursor-default">close</button>
      </div>
    </div>
  );
}
