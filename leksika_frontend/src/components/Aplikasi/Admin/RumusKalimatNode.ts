import { Node } from '@tiptap/core';
import { VueNodeViewRenderer } from '@tiptap/vue-3';
import RumusKalimatComponent from './RumusKalimatComponent.vue';

// --- DOKUMENTASI KOMPONEN ---
export const documentation = {
  title: 'Rumus Kalimat',
  description: 'Visualisasi struktur kalimat (e.g. S+V+O) atau kontraksi kata (e.g. je+aime -> j\'aime).',
  attrs: {
    items: {
      type: 'array',
      description: 'Daftar part (kotak) dan op (operator/tanda) dalam rumus.',
    },
  },
  htmlExample: `<rumus-kalimat description="Contoh Rumus">
  <part>je</part>
  <op>+</op>
  <part>aime</part>
  <op>→</op>
  <part variant="result">j'aime</part>
</rumus-kalimat>`,
};

export interface RumusItem {
  type: 'part' | 'op';
  text: string;
  sub?: string;
  variant?: 'default' | 'result';
}

export default Node.create({
  name: 'rumusKalimat',

  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      items: {
        default: [
          [
            { type: 'part', text: 'Subject' },
            { type: 'op', text: '+' },
            { type: 'part', text: 'Verb' },
          ]
        ],
        parseHTML: (element: HTMLElement) => {
          const attr = element.getAttribute('items');
          if (attr) {
            try {
              const parsed = JSON.parse(attr);
              // Migrate 1D array to 2D
              if (Array.isArray(parsed) && parsed.length > 0 && !Array.isArray(parsed[0])) {
                return [parsed];
              }
              return parsed;
            } catch (e) {
              return [];
            }
          }
          return null;
        },
      },
      description: {
        default: '',
        parseHTML: (element: HTMLElement) => element.getAttribute('description'),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'rumus-kalimat',
        getAttrs: (node: string | HTMLElement) => {
          if (typeof node === 'string') return null;

          const children = Array.from(node.children);
          if (children.length > 0) {
            // Check for explicit rows
            const rows = children.filter(c => c.tagName.toLowerCase() === 'row');
            
            if (rows.length > 0) {
              const items = rows.map(row => {
                return Array.from(row.children).map(el => {
                  const tag = el.tagName.toLowerCase();
                  if (tag === 'part') {
                    return {
                      type: 'part',
                      text: el.innerHTML || el.textContent || '',
                      sub: el.getAttribute('sub') || undefined,
                      variant: (el.getAttribute('variant') as any) || 'default',
                    };
                  } else if (tag === 'op') {
                    return {
                      type: 'op',
                      text: el.innerHTML || el.textContent || '+',
                    };
                  }
                  return { type: 'part', text: el.innerHTML || el.textContent || '' };
                });
              });
              return { items };
            }

            // Flat children (Backward compatibility)
            const flatItems: RumusItem[] = children.map((el) => {
              const tag = el.tagName.toLowerCase();
              if (tag === 'part') {
                return {
                  type: 'part',
                  text: el.innerHTML || el.textContent || '',
                  sub: el.getAttribute('sub') || undefined,
                  variant: (el.getAttribute('variant') as any) || 'default',
                };
              } else if (tag === 'op') {
                return {
                  type: 'op',
                  text: el.innerHTML || el.textContent || '+',
                };
              }
              return { type: 'part', text: el.innerHTML || el.textContent || '' };
            });
            return { items: [flatItems] };
          }

          // JSON attribute fallback
          const partsAttr = node.getAttribute('parts');
          if (partsAttr) {
            try {
              const parts = JSON.parse(partsAttr);
              if (Array.isArray(parts)) {
                const items: RumusItem[] = [];
                parts.forEach((p, i) => {
                  items.push({ type: 'part', text: p });
                  if (i < parts.length - 1) {
                    items.push({ type: 'op', text: '+' });
                  }
                });
                return { items: [items] };
              }
            } catch (e) {}
          }

          return null;
        },
      },
    ];
  },

  renderHTML({ node }) {
    let items = Array.isArray(node.attrs.items) ? node.attrs.items : [];
    
    // Safety check: ensure 2D array
    if (items.length > 0 && !Array.isArray(items[0])) {
      items = [items];
    }
    
    // Tiptap's renderHTML can't easily inject raw HTML string into content
    // We use a hole/zero to signify content, or direct DOM elements
    const renderRow = (rowItems: RumusItem[]) => {
      if (typeof document === 'undefined') return 'row';
      const rowEl = document.createElement('row');
      
      rowItems.forEach(item => {
        const tag = item.type === 'op' ? 'op' : 'part';
        const el = document.createElement(tag);
        if (item.sub) el.setAttribute('sub', item.sub);
        if (item.variant) el.setAttribute('variant', item.variant || 'default');
        el.innerHTML = item.text;
        rowEl.appendChild(el);
      });
      return rowEl;
    };

    const children = items.map(renderRow);

    return ['rumus-kalimat', { description: node.attrs.description || undefined }, ...children];
  },

  addNodeView() {
    return VueNodeViewRenderer(RumusKalimatComponent);
  },

  addCommands() {
    return {
      insertRumusKalimat:
        () =>
        ({ commands }: { commands: any }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              items: [
                { type: 'part', text: 'Part 1' },
                { type: 'op', text: '+' },
                { type: 'part', text: 'Part 2' },
              ],
            },
          });
        },
    } as any;
  },
});
