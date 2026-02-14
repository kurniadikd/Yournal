import { Node, mergeAttributes } from '@tiptap/core';
import { VueNodeViewRenderer } from '@tiptap/vue-3';
import DiagramComponent from './DiagramComponent.vue';

export interface DiagramData {
  id: string;
  label: string;
  children: DiagramData[];
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    diagram: {
      insertDiagram: (options?: any) => ReturnType;
    };
  }
}

export default Node.create({
  name: 'diagram',

  group: 'block',

  atom: true,

  draggable: true,

  addAttributes() {
    return {
      diagram_data: {
        default: {
          id: 'root',
          label: 'Topik Utama',
          children: [
            { id: 'c1', label: 'Subtopik A', children: [] },
            { id: 'c2', label: 'Subtopik B', children: [] },
          ],
        },
        parseHTML: (element: HTMLElement) => {
          const attr = element.getAttribute('diagram_data');
          if (attr) {
            try {
              return JSON.parse(attr);
            } catch (e) {
              return null;
            }
          }
          return null;
        },
      },
      layout: {
        default: 'mindmap',
        parseHTML: (element: HTMLElement) => element.getAttribute('layout') || 'mindmap',
      },
      caption: {
        default: '',
        parseHTML: (element: HTMLElement) => element.getAttribute('caption') || '',
      },
    };
  },

  parseHTML() {
    const parseDiagramNode = (element: Element): any => {
      const id = element.getAttribute('id') || `node-${Math.random().toString(36).substr(2, 9)}`;
      
      // Look for <label> child for HTML content, fallback to label attribute
      const labelTag = element.querySelector(':scope > label');
      const label = labelTag ? labelTag.innerHTML : (element.getAttribute('label') || '');
      
      const children = Array.from(element.children)
        .filter(child => child.tagName.toLowerCase() === 'node')
        .map(child => parseDiagramNode(child));
      return { id, label, children };
    };

    return [
      {
        tag: 'diagram-component',
        getAttrs: (node: string | HTMLElement) => {
          if (typeof node === 'string') return null;
          
          if (node.getAttribute('diagram_data')) return null;

          const rootNode = node.querySelector('node');
          if (rootNode) {
            return {
              diagram_data: parseDiagramNode(rootNode),
              layout: node.getAttribute('layout') || 'mindmap',
              caption: node.getAttribute('caption') || '',
            };
          }
          return null;
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    if (typeof document === 'undefined') {
      return ['diagram-component', { layout: node.attrs.layout, caption: node.attrs.caption }];
    }

    const renderDiagramNode = (data: DiagramData): HTMLElement => {
      const el = document.createElement('node');
      el.setAttribute('id', data.id);
      
      const labelEl = document.createElement('label');
      labelEl.innerHTML = data.label; // Inject HTML string
      el.appendChild(labelEl);

      (data.children || []).forEach(child => {
        el.appendChild(renderDiagramNode(child));
      });
      return el;
    };

    const rootEl = document.createElement('diagram-component');
    if (node.attrs.layout) rootEl.setAttribute('layout', node.attrs.layout);
    if (node.attrs.caption) rootEl.setAttribute('caption', node.attrs.caption);

    if (node.attrs.diagram_data) {
      rootEl.appendChild(renderDiagramNode(node.attrs.diagram_data));
    }

    return rootEl;
  },

  addNodeView() {
    return VueNodeViewRenderer(DiagramComponent);
  },

  addCommands() {
    return {
      insertDiagram:
        (options: any) =>
        ({ commands }) => {
          return commands.insertContent({
            type: 'diagram',
            attrs: options,
          });
        },
    };
  },
});

export const documentation = {
  title: 'Diagram',
  description:
    'Diagram interaktif untuk memvisualisasikan struktur atau konsep. Mendukung HTML (bold/italic) di dalam label.',
  attrs: {
    caption: { type: 'string', description: 'Judul diagram' },
    layout: {
      type: 'string',
      description: "'mindmap' (default) atau 'tree'",
    },
    diagram_data: {
      type: 'json',
      description: 'Struktur node: { id, label, children: [] }',
    },
  },
  htmlExample: `<diagram-component caption="Contoh Diagram" layout="mindmap">
  <node>
    <label><b>Utama</b></label>
    <node>
       <label><i>Cabang</i> A</label>
       <node label="Sub Cabang A1"></node>
    </node>
    <node label="Cabang B"></node>
  </node>
</diagram-component>`,
};
