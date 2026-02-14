import { Node, mergeAttributes } from '@tiptap/core';
import { VueNodeViewRenderer } from '@tiptap/vue-3';
import BarChartNode from './BarChartNode.vue';

export interface BarChartItem {
  label: string;
  value: number;
  desc?: string;
  color?: string;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    barChart: {
      insertBarChart: (options?: any) => ReturnType;
    };
  }
}

export default Node.create({
  name: 'barChart',

  group: 'block',

  atom: true,

  draggable: true,

  addAttributes() {
    return {
      title: {
        default: 'Judul Grafik',
        parseHTML: (element: HTMLElement) => element.getAttribute('title') || 'Judul Grafik',
      },
      axisLabel: {
        default: '',
        parseHTML: (element: HTMLElement) => element.getAttribute('axis-label') || '',
      },
      items: {
        default: [
          { label: 'Label A', value: 100 },
          { label: 'Label B', value: 50 },
        ],
        parseHTML: (element: HTMLElement) => {
          const attr = element.getAttribute('items');
          if (attr) {
            try {
              return JSON.parse(attr);
            } catch (e) {
              return [];
            }
          }
          return [];
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'bar-chart-component',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const items = node.attrs.items
      ? JSON.stringify(node.attrs.items)
      : '[]';
      
    return [
      'bar-chart-component',
      mergeAttributes(HTMLAttributes, {
        items: items,
        title: node.attrs.title,
        'axis-label': node.attrs.axisLabel,
      }),
    ];
  },

  addNodeView() {
    return VueNodeViewRenderer(BarChartNode);
  },

  addCommands() {
    return {
      insertBarChart:
        (options: any) =>
        ({ commands }) => {
          return commands.insertContent({
            type: 'barChart',
            attrs: options,
          });
        },
    };
  },
});

export const documentation = {
  title: 'Bar Chart',
  description: 'Diagram batang sederhana.',
  attrs: {
    title: { type: 'string', description: 'Judul grafik' },
    items: {
      type: 'json',
      description: 'Array of { label, value, desc, color }',
    },
  },
  jsonExample: `...`,
  htmlExample: `...`,
};
