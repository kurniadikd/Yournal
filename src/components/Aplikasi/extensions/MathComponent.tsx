import { Component, createSignal, onMount, createEffect, onCleanup, Show } from 'solid-js';
import katex from 'katex';
import { NodeViewProps } from 'solid-tiptap';

const MathComponent: Component<NodeViewProps> = (props) => {
  const [isEditing, setIsEditing] = createSignal(false);
  const [textareaRef, setTextareaRef] = createSignal<HTMLTextAreaElement>();
  const [previewRef, setPreviewRef] = createSignal<HTMLDivElement>();
  
  // Update local editing state based on selection
  createEffect(() => {
    if (props.selected) {
       setIsEditing(true);
       // Focus textarea when selected and editing
       setTimeout(() => textareaRef()?.focus(), 0);
    } else {
       setIsEditing(false);
    }
  });

  const renderMath = (latex: string) => {
    try {
      return katex.renderToString(latex, {
        throwOnError: false,
        displayMode: true, 
      });
    } catch (e) {
      return `<span class="text-error">Invalid equation</span>`;
    }
  };

  const handleChange = (e: Event) => {
    const value = (e.target as HTMLTextAreaElement).value;
    props.updateAttributes({ latex: value });
  };
  
  // Auto-resize textarea
  const adjustHeight = () => {
    const el = textareaRef();
    if (el) {
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    }
  };

  createEffect(() => {
     if (isEditing()) {
        setTimeout(adjustHeight, 0);
     }
  });

  return (
    <div 
      class={`math-node my-4 transition-all duration-200 rounded-lg ${
        props.selected ? 'ring-2 ring-[var(--color-primary)] bg-[var(--color-surface-container)]' : ''
      }`}
    >
      <Show when={isEditing()}>
        <div class="p-4 flex flex-col gap-2">
            <span class="text-xs font-medium text-[var(--color-primary)] uppercase tracking-wider">LaTeX Equation</span>
            <textarea
                ref={setTextareaRef}
                value={props.node.attrs.latex}
                onInput={(e) => { handleChange(e); adjustHeight(); }}
                class="w-full bg-transparent font-mono text-sm outline-none resize-none text-[var(--color-on-surface)]"
                placeholder="e.g. E = mc^2"
                rows={1}
            />
            <div class="text-[10px] text-[var(--color-on-surface-variant)] flex justify-between">
                <span>Klik di luar untuk melihat hasil</span>
                <a href="https://katex.org/docs/supported.html" target="_blank" class="hover:underline text-[var(--color-primary)]">Bantuan Syntax</a>
            </div>
        </div>
      </Show>

      <div 
        ref={setPreviewRef}
        class={`p-2 overflow-x-auto flex justify-center ${isEditing() ? 'border-t border-[var(--color-outline-variant)]/20 bg-[var(--color-surface)]/50' : 'cursor-pointer hover:bg-[var(--color-surface-container-high)]/50 rounded-lg'}`}
        innerHTML={renderMath(props.node.attrs.latex)}
        contentEditable={false}
      />
    </div>
  );
};

export default MathComponent;
