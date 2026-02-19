import { NodeView, Editor, NodeViewRendererProps } from '@tiptap/core';
import { Component, createComponent, createSignal } from 'solid-js';
import { render } from 'solid-js/web';

export interface SolidNodeViewProps {
  component: Component<any>;
}

export class SolidNodeView implements NodeView {
  component: Component<any>;
  editor: Editor;
  extension: any;
  node: any;
  nodeSignal: any;
  setNode: any;
  decorationsSignal: any;
  setDecorations: any;
  selectedSignal: any;
  setSelected: any;
  getPos: any;
  dom: HTMLElement;
  contentDOM: HTMLElement | null;
  destroy: () => void;

  constructor(
    component: Component<any>,
    props: NodeViewRendererProps
  ) {
    this.component = component;
    this.editor = props.editor;
    this.extension = props.extension;
    this.getPos = props.getPos;
    this.node = props.node;
    
    const [node, setNode] = createSignal(props.node);
    const [decorations, setDecorations] = createSignal(props.decorations);
    const [selected, setSelected] = createSignal(false);

    this.nodeSignal = node;
    this.setNode = setNode;
    this.decorationsSignal = decorations;
    this.setDecorations = setDecorations;
    this.selectedSignal = selected;
    this.setSelected = setSelected;

    // Create the container element - use span for inline nodes to avoid breaking flow
    const isInline = props.node.isInline;
    this.dom = document.createElement(isInline ? 'span' : 'div');
    this.dom.classList.add('solid-node-view');
    this.dom.setAttribute('contenteditable', 'false'); // Mark as non-editable to behave like an atom
    if (!isInline) this.dom.style.whiteSpace = 'normal';
    
    // Handle selection changes (both direct node selection and block/range selection)
    const onSelectionUpdate = () => {
      const pos = this.getPos();
      if (typeof pos !== 'number') return;
      
      const { selection } = this.editor.state;
      const isNodeSelected = (selection as any).node === this.node;
      const isInsideRange = selection.from <= pos && selection.to >= pos + this.node.nodeSize;
      
      this.setSelected(isNodeSelected || isInsideRange);
    };
    
    this.editor.on('selectionUpdate', onSelectionUpdate);

    // Mount the Solid component
    const dispose = render(() => createComponent(this.component, {
      get node() { return node(); },
      get decorations() { return decorations(); },
      get selected() { return selected(); },
      editor: this.editor,
      extension: this.extension,
      getPos: this.getPos,
      updateAttributes: (attrs: any) => this.updateAttributes(attrs),
      deleteNode: () => this.deleteNode(),
    }), this.dom);

    this.destroy = () => {
      this.editor.off('selectionUpdate', onSelectionUpdate);
      dispose();
      this.dom.remove();
    };
    
    this.contentDOM = null;
  }

  update(node: any, decorations: any[]): boolean {
    if (node.type !== this.nodeSignal().type) {
      return false;
    }

    this.node = node; // Update reference for nodeSize
    this.setNode(node);
    this.setDecorations(decorations);
    return true;
  }

  selectNode() {
    this.setSelected(true);
  }

  deselectNode() {
    this.setSelected(false);
  }

  updateAttributes(attributes: {}) {
    if (this.editor.isEditable) {
      const pos = this.getPos();
      if (typeof pos === 'number') {
        this.editor.commands.updateAttributes(this.node.type.name, attributes);
      }
    }
  }

  deleteNode() {
    const pos = this.getPos();
    if (typeof pos === 'number' && this.node) {
      this.editor.commands.deleteRange({ from: pos, to: pos + this.node.nodeSize });
    }
  }
}

export function createSolidNodeView(component: Component<any>) {
  return (props: NodeViewRendererProps) => {
    return new SolidNodeView(component, props);
  };
}
