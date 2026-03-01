import { openPath } from '@tauri-apps/plugin-opener';
import { Show } from 'solid-js';
import { formatFileSize } from '../../../utils/file';

export interface FileAttachmentAttributes {
  name: string;
  size: number;
  mimeType: string;
  path: string;
}

export default function FileAttachmentComponent(props: {
  node: { attrs: FileAttachmentAttributes },
  updateAttributes: (attrs: Partial<FileAttachmentAttributes>) => void,
  selected: boolean,
  deleteNode: () => void
}) {
  const { name, size, mimeType, path } = props.node.attrs;

  const handleOpenFile = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (path) {
      try {
        await openPath(path);
      } catch (err) {
        console.error("Failed to open file:", err);
      }
    }
  };

  const getFileIcon = (mime: string) => {
    if (mime.includes('pdf')) return 'picture_as_pdf';
    if (mime.includes('zip') || mime.includes('compressed')) return 'archive';
    if (mime.includes('image')) return 'image';
    if (mime.includes('video')) return 'movie';
    if (mime.includes('audio')) return 'audio_file';
    if (mime.includes('text')) return 'description';
    if (mime.includes('word') || mime.includes('officedocument.wordprocessingml')) return 'description';
    if (mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('officedocument.spreadsheetml')) return 'table_chart';
    if (mime.includes('presentation') || mime.includes('powerpoint') || mime.includes('officedocument.presentationml')) return 'present_to_all';
    return 'insert_drive_file';
  };

  return (
    <div 
      class={`
        group relative my-4 p-4 rounded-2xl border transition-all select-none w-full flex items-center gap-4 cursor-pointer
        bg-[var(--color-surface-container)] 
        ${props.selected 
          ? 'ProseMirror-selectednode shadow-[0_0_0_3px_var(--color-primary)] border-[var(--color-primary)]' 
          : 'border-[var(--color-outline-variant)]/50 hover:bg-[var(--color-surface-container-high)] hover:border-[var(--color-primary)]'
        }
      `}
      onClick={handleOpenFile}
    >
      {/* File Icon */}
      <div class="w-12 h-12 rounded-xl bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] flex items-center justify-center shrink-0">
        <span class="material-symbols-rounded text-2xl">
          {getFileIcon(mimeType)}
        </span>
      </div>

      {/* File Info */}
      <div class="flex-1 min-w-0 pr-8">
        <h3 class="text-sm font-semibold text-[var(--color-on-surface)] truncate" title={name}>
          {name}
        </h3>
        <p class="text-xs text-[var(--color-on-surface-variant)] mt-0.5">
          {formatFileSize(size)} • {mimeType.split('/').pop()?.toUpperCase() || 'FILE'}
        </p>
      </div>

      {/* Delete Button */}
      <Show when={props.selected}>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            props.deleteNode();
          }}
          title="Hapus Lampiran"
          class="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 text-[var(--color-on-surface)] flex items-center justify-center transition-colors"
        >
          <span class="material-symbols-rounded text-lg">close</span>
        </button>
      </Show>
    </div>
  );
}
