import { openPath } from '@tauri-apps/plugin-opener';
import { tempDir, join } from '@tauri-apps/api/path';
import { writeFile, mkdir, exists } from '@tauri-apps/plugin-fs';
import { Component, Show } from 'solid-js';
import { formatFileSize } from '../../../utils/file';

export interface FileAttachmentAttributes {
  name: string;
  size: number;
  mimeType: string;
  src: string;
  uploadId: string;
  isLoading: boolean;
}

const FileAttachmentComponent: Component<{
  node: { attrs: FileAttachmentAttributes },
  updateAttributes: (attrs: Partial<FileAttachmentAttributes>) => void,
  selected: boolean,
  deleteNode: () => void
}> = (props) => {
  let wasSelectedOnMousedown = false;

  const handleMouseDown = () => {
    wasSelectedOnMousedown = props.selected;
  };

  const handleOpenFile = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Only open the file if the component was already selected on mousedown
    if (!wasSelectedOnMousedown) return;
    
    if (props.node.attrs.isLoading) return; // Don't try to open if it's still loading
    
    if (props.node.attrs.src && props.node.attrs.src.startsWith('data:')) {
      try {
        const base64Data = props.node.attrs.src.split(',')[1];
        if (!base64Data) return;
        
        // Convert base64 to Uint8Array
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const tempDirPath = await tempDir();
        const appTempDir = await join(tempDirPath, 'yournal_attachments');
        
        if (!(await exists(appTempDir))) {
            await mkdir(appTempDir, { recursive: true });
        }
        
        const safeName = props.node.attrs.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const tempFilePath = await join(appTempDir, safeName);
        
        await writeFile(tempFilePath, bytes);
        await openPath(tempFilePath);
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
        group relative my-4 p-4 rounded-2xl border transition-all select-none w-full flex items-center gap-4
        bg-[var(--color-surface-container)] 
        ${props.selected 
          ? 'ProseMirror-selectednode shadow-[0_0_0_3px_var(--color-secondary)] border-[var(--color-secondary)] cursor-default' 
          : 'border-[var(--color-outline-variant)]/50 hover:bg-[var(--color-surface-container-high)] hover:border-[var(--color-primary)] cursor-pointer'
        }
        ${props.node.attrs.isLoading ? 'opacity-70 pointer-events-none' : ''}
      `}
      onMouseDown={handleMouseDown}
      onClick={handleOpenFile}
    >
      {/* File Icon with Spinner Overlay */}
      <div class="relative w-12 h-12 rounded-xl bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] flex items-center justify-center shrink-0 overflow-hidden">
        <Show when={props.node.attrs.isLoading} fallback={
          <span class="material-symbols-rounded text-2xl">
            {getFileIcon(props.node.attrs.mimeType)}
          </span>
        }>
          <div class="absolute inset-0 bg-black/20 dark:bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
             <span class="loading loading-spinner loading-sm text-[var(--color-primary)]"></span>
          </div>
          <span class="material-symbols-rounded text-2xl opacity-30">
            {getFileIcon(props.node.attrs.mimeType)}
          </span>
        </Show>
      </div>

      {/* File Info */}
      <div class="flex-1 min-w-0 pr-8">
        <div class="font-medium text-[var(--color-on-surface)] truncate w-full" title={props.node.attrs.name}>
          {props.node.attrs.name}
        </div>
        <div class="text-xs text-[var(--color-on-surface-variant)] mt-1 opacity-80">
          {formatFileSize(props.node.attrs.size)} • {props.node.attrs.mimeType.split('/')[1] || 'File'}
        </div>
      </div>

      {/* Delete Button */}
      <button 
        class="image-delete-btn"
        style={{ 
            display: props.selected && !props.node.attrs.isLoading ? 'flex' : 'none',
            "z-index": "40" 
        }}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); props.deleteNode(); }}
      >
        <span class="material-symbols-rounded">close</span>
      </button>
    </div>
  );
};

export default FileAttachmentComponent;
