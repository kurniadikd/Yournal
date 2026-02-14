import { NodeView, Editor, NodeViewRendererProps } from '@tiptap/core';
import { Component, createComponent } from 'solid-js';
import { render } from 'solid-js/web';

export interface SolidNodeViewProps {
  component: Component<any>;
}

export class SolidNodeView implements NodeView {
  component: Component<any>;
  editor: Editor;
  extension: any;
  node: any;
  decorations: any;
  getPos: any;
  HTMLAttributes: any;
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
    this.node = props.node;
    this.decorations = props.decorations;
    this.getPos = props.getPos;
    this.HTMLAttributes = props.HTMLAttributes;
    
    // Create the container element
    this.dom = document.createElement('div');
    this.dom.classList.add('solid-node-view');
    this.dom.style.whiteSpace = 'normal'; // Fix cursor issues sometimes
    
    // Mount the Solid component
    const dispose = render(() => createComponent(this.component, {
      node: this.node,
      editor: this.editor,
      getPos: this.getPos,
      updateAttributes: (attrs: any) => this.updateAttributes(attrs),
      deleteNode: () => this.deleteNode(),
    }), this.dom);

    this.destroy = () => {
      dispose();
      this.dom.remove();
    };
    
    this.contentDOM = null;
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
    if (typeof pos === 'number') {
      this.editor.commands.deleteRange({ from: pos, to: pos + this.node.nodeSize });
    }
  }
}

export function createSolidNodeView(component: Component<any>) {
  return (props: NodeViewRendererProps) => {
    return new SolidNodeView(component, props);
  };
}
