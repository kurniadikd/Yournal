import { Component } from 'solid-js';
import katex from 'katex';

interface MathProps {
  node: any;
  updateAttributes: (attrs: any) => void;
  selected: boolean;
  deleteNode: () => void;
  extension: any;
  getPos: () => number;
}

const MathComponent: Component<MathProps> = (props) => {
  const isInline = () => props.node.type.name === 'inlineMath';
  const latex = () => props.node.attrs.latex || '';
  let wasSelectedOnMousedown = false;

  const handleMouseDown = () => {
    wasSelectedOnMousedown = props.selected;
  };

  const handleClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (wasSelectedOnMousedown && props.selected) {
      const pos = props.getPos();
      if (typeof pos === 'number' && props.extension?.options?.onClick) {
        props.extension.options.onClick(props.node, pos);
      }
    }
  };

  const handleDelete = (e: MouseEvent) => {
    e.stopPropagation();
    props.deleteNode();
  };

  // --- RENDERING KKaTeX ---
  const renderMath = () => {
    try {
      return katex.renderToString(latex() || (isInline() ? '...' : '\\text{Rumus Kosong}'), {
        displayMode: !isInline(),
        throwOnError: false,
        ...(props.extension?.options?.katexOptions || {})
      });
    } catch (err: any) {
      if (isInline()) {
        return `<span class="text-error" title="${err.message || err}">!</span>`;
      }
      return `<span class="text-error">Error: ${err.message || err}</span>`;
    }
  };

  // --- INLINE VIEW ---
  if (isInline()) {
    return (
      <span 
        class={`selectable-image-wrapper ${props.selected ? 'ProseMirror-selectednode' : ''} inline-math-wrapper px-1 cursor-pointer transition-all duration-300 relative ${
          props.selected 
            ? 'bg-[var(--color-secondary-container)]/30 shadow-[0_0_0_2px_var(--color-secondary)] rounded-[4px]' 
            : 'bg-transparent hover:bg-[var(--color-surface-container)]/30 rounded-[4px]'
        }`}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
      >
        <span 
          class="tiptap-mathematics-render inline-math-inner"
          innerHTML={renderMath()}
        />

        <button 
          class="image-delete-btn select-none"
          style={{ 
            display: props.selected ? 'flex' : 'none',
            top: '-12px',
            right: '-12px'
          }}
          onClick={handleDelete}
        >
          <span class="material-symbols-rounded">close</span>
        </button>
      </span>
    );
  }

  // --- BLOCK VIEW ---
  return (
    <div 
      class={`selectable-image-wrapper ${props.selected ? 'ProseMirror-selectednode' : ''} select-none relative w-full cursor-pointer transition-all duration-300 rounded-[12px] ${
        props.selected 
          ? 'bg-transparent shadow-[0_0_0_3px_var(--color-secondary)]' 
          : 'bg-transparent hover:bg-[var(--color-surface-container)]/30'
      }`}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      <div class="p-6 flex items-center justify-center min-h-[60px] w-full">
        <div 
          class="tiptap-mathematics-render block-math-inner"
          innerHTML={renderMath()}
        />
      </div>

      <button 
        class="image-delete-btn select-none"
        style={{ display: props.selected ? 'flex' : 'none' }}
        onClick={handleDelete}
      >
        <span class="material-symbols-rounded">close</span>
      </button>
    </div>
  );
};

export default MathComponent;
