import { Component } from 'solid-js';
import katex from 'katex';

interface MathBlockProps {
  node: any;
  updateAttributes: (attrs: any) => void;
  selected: boolean;
  deleteNode: () => void;
  extension: any;
  getPos: () => number;
}

const MathBlockComponent: Component<MathBlockProps> = (props) => {
  const latex = () => props.node.attrs.latex || '';
  
  return (
    <div 
      class={`selectable-image-wrapper ${props.selected ? 'ProseMirror-selectednode' : ''} my-6 select-none relative w-full cursor-pointer transition-all duration-300 rounded-[12px] ${
        props.selected 
          ? 'bg-transparent shadow-[0_0_0_3px_var(--color-secondary)]' 
          : 'bg-transparent hover:bg-[var(--color-surface-container)]/30'
      }`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const pos = props.getPos();
        if (typeof pos === 'number' && props.extension?.options?.onClick) {
          props.extension.options.onClick(props.node, pos);
        }
      }}
    >
      <div class="p-6 flex items-center justify-center min-h-[60px] w-full">
        <div 
          class="tiptap-mathematics-render block-math-inner"
          innerHTML={(() => {
            try {
              return katex.renderToString(latex() || '\\text{Rumas Kosong}', {
                displayMode: true,
                throwOnError: false,
                ...(props.extension?.options?.katexOptions || {})
              });
            } catch (err: any) {
              return `<span class="text-error">Error: ${err.message || err}</span>`;
            }
          })()}
        />
      </div>

      {/* Persis tombol hapus SelectableImage */}
      <button 
        class="image-delete-btn select-none"
        style={{ display: props.selected ? 'flex' : 'none' }}
        onClick={(e) => { e.stopPropagation(); props.deleteNode(); }}
      >
        <span class="material-symbols-rounded">close</span>
      </button>
    </div>
  );
};

export default MathBlockComponent;
