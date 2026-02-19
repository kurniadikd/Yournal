import { Component } from 'solid-js';
import katex from 'katex';

interface MathInlineProps {
  node: any;
  updateAttributes: (attrs: any) => void;
  selected: boolean;
  deleteNode: () => void;
  extension: any;
  getPos: () => number;
}

const MathInlineComponent: Component<MathInlineProps> = (props) => {
  const latex = () => props.node.attrs.latex || '';

  return (
    <span 
      class={`selectable-image-wrapper ${props.selected ? 'ProseMirror-selectednode' : ''} inline-math-wrapper px-2 py-1.5 rounded-[12px] cursor-pointer transition-all duration-300 relative align-middle leading-none mx-1 ${
        props.selected 
          ? 'bg-transparent shadow-[0_0_0_3px_var(--color-secondary)]' 
          : 'bg-transparent hover:bg-[var(--color-surface-container)]/30 shadow-[0_0_0_0_var(--color-secondary)]'
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
      <span 
        class="tiptap-mathematics-render inline-math-inner"
        innerHTML={(() => {
          try {
            return katex.renderToString(latex() || '...', {
              displayMode: false,
              throwOnError: false,
              ...(props.extension?.options?.katexOptions || {})
            });
          } catch (err: any) {
            return `<span class="text-error" title="${err.message || err}">!</span>`;
          }
        })()}
      />

      {/* Persis tombol hapus SelectableImage */}
      <button 
        class="image-delete-btn select-none"
        style={{ 
          display: props.selected ? 'flex' : 'none',
          top: '-12px',
          right: '-12px'
        }}
        onClick={(e) => { e.stopPropagation(); props.deleteNode(); }}
      >
        <span class="material-symbols-rounded">close</span>
      </button>
    </span>
  );
};

export default MathInlineComponent;
