<template>
  <node-view-wrapper class="diagram-component my-8 w-full select-none">

    <div class="w-full overflow-x-auto overflow-y-hidden py-2 custom-scrollbar flex">

      <div class="relative w-max h-fit min-w-[50%] flex flex-col items-center p-8 mx-auto shrink-0" ref="viewportRef">

        <div v-if="isEditable"
          class="absolute top-3 right-3 z-50 flex items-center gap-2 transition-opacity duration-200 opacity-0 hover:opacity-100">
          <button @click="isPreview = !isPreview" :title="isPreview ? 'Mode Edit' : 'Mode Preview'"
            class="w-8 h-8 flex items-center justify-center rounded-full bg-white text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-all border border-[var(--color-outline-variant)]">
            <span class="material-symbols-outlined text-lg">{{ isPreview ? 'edit' : 'visibility' }}</span>
          </button>

          <button v-if="!isPreview" @click="toggleLayout"
            :title="layoutMode === 'center' ? 'Ke Mode Tree' : 'Ke Mode Mindmap'"
            class="w-8 h-8 flex items-center justify-center rounded-full bg-white text-[var(--color-secondary)] hover:bg-[var(--color-secondary)] hover:text-white transition-all border border-[var(--color-outline-variant)]">
            <span class="material-symbols-outlined text-lg">{{ layoutMode === 'center' ? 'account_tree' : 'hub'
              }}</span>
          </button>

          <button v-if="!isPreview" @click="props.deleteNode()"
            class="w-8 h-8 flex items-center justify-center rounded-full bg-white text-[var(--color-error)] hover:bg-[var(--color-error)] hover:text-white transition-all border border-[var(--color-error)]"
            title="Hapus Diagram">
            <span class="material-symbols-outlined text-lg">delete</span>
          </button>
        </div>

        <div class="relative w-fit h-fit" ref="canvasRef">

          <svg class="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-0">
            <path v-for="path in paths" :key="path.id" :d="path.d" fill="none" stroke="var(--color-primary)"
              stroke-width="2" stroke-linecap="round" class="opacity-60 transition-all duration-300 ease-out" />

            <g v-for="arrow in arrows" :key="arrow.id" class="transition-all duration-300 ease-out opacity-60">
              <path d="M -6 -4 L 0 0 L -6 4" fill="none" stroke="var(--color-primary)" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round"
                :transform="`translate(${arrow.x}, ${arrow.y}) rotate(${arrow.angle})`" />
            </g>
          </svg>

          <div class="relative z-10 shrink-0 flex flex-col items-center" ref="contentRef">
            <DiagramItem v-if="treeData" :model="treeData" :is-root="true" :is-editing="isEditing" :parent-id="null"
              @update="handleUpdate" @add="handleAdd" @delete="handleDelete" />
            <div v-else class="text-[var(--color-error)] font-semibold p-4">
              Data Error
            </div>
          </div>

        </div>

        <div v-if="treeData" class="mt-4 px-4 text-center w-full">
          <div v-if="isEditing" contenteditable="true"
            class="bg-transparent text-center focus:outline-none focus:bg-[var(--color-surface-variant)] rounded px-2 py-1 w-full max-w-md placeholder-[var(--color-outline)] text-[var(--color-on-surface)] transition-colors inline-block mx-auto outline-none border-b border-transparent focus:border-[var(--color-primary)]"
            v-html="node.attrs.caption"
            @blur="(e) => props.updateAttributes({ caption: (e.target as HTMLElement).innerHTML })"
            @keydown.enter.prevent placeholder="Nama Diagram..."></div>
          <div v-else class="text-[var(--color-on-surface)] font-medium whitespace-pre-wrap"
            v-html="node.attrs.caption || 'Diagram'"></div>
        </div>
      </div>
    </div>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import {
  computed,
  defineComponent,
  h,
  ref,
  onMounted,
  nextTick,
  watch,
  onUnmounted,
  provide,
  inject,
  type PropType,
  type InjectionKey,
  type Ref
} from 'vue';

const props = defineProps(nodeViewProps);

interface DiagramNodeData {
  id: string;
  label: string;
  children?: DiagramNodeData[];
}

interface Registry {
  registerNode: (id: string, el: HTMLElement) => void;
  unregisterNode: (id: string) => void;
  notifyLayout: () => void;
}

interface LayoutContext {
  mode: Ref<string>;
  setMode: (m: string) => void;
}

interface ArrowData {
  id: string;
  x: number;
  y: number;
  angle: number; // Dalam derajat
}

const REGISTRY_KEY: InjectionKey<Registry> = Symbol('diagram-registry');
const LAYOUT_KEY: InjectionKey<LayoutContext> = Symbol('diagram-layout');

// --- RECURSIVE ITEM COMPONENT ---
const DiagramItem = defineComponent({
  name: 'DiagramItem',
  props: {
    model: { type: Object as PropType<DiagramNodeData>, required: true },
    isEditing: Boolean,
    isRoot: Boolean,
    parentId: String,
    depth: { type: Number, default: 0 },
    direction: { type: String, default: 'right' },
  },
  emits: ['update', 'add', 'delete'],
  setup(props, { emit }) {
    const { registerNode, unregisterNode, notifyLayout } = inject(REGISTRY_KEY)!;
    const { mode } = inject(LAYOUT_KEY)!;
    const elRef = ref<HTMLElement | null>(null);

    onMounted(() => {
      if (elRef.value) registerNode(props.model.id, elRef.value);
    });

    watch(
      () => props.model.id,
      (newId, oldId) => {
        if (oldId) unregisterNode(oldId);
        if (newId && elRef.value) registerNode(newId, elRef.value);
      },
    );

    onUnmounted(() => {
      unregisterNode(props.model.id);
    });

    const getColorClasses = (depth: number) => {
      if (depth === 0)
        return 'bg-[var(--color-primary)] text-[var(--color-on-primary)] border-[var(--color-primary)]';
      if (depth === 1)
        return 'bg-[var(--color-secondary)] text-[var(--color-on-secondary)] border-[var(--color-secondary)]';
      return 'bg-[var(--color-tertiary)] text-[var(--color-on-tertiary)] border-[var(--color-tertiary)]';
    };

    const textStyles =
      'font-bold text-center leading-snug px-4 py-2 min-w-[120px] max-w-[250px] whitespace-pre-wrap break-words';

    return () => {
      const m = props.model;

      const nodeEl = h(
        'div',
        {
          ref: elRef,
          style: { position: 'relative' },
          class: [
            'diagram-node relative z-10 rounded-2xl border-2 transition-shadow group flex items-center justify-center shrink-0 select-none',
            getColorClasses(props.depth),
          ],
        },
        [
          props.isEditing
            ? h('div', { class: 'grid place-items-center w-full' }, [
              h('div', {
                contenteditable: true,
                innerHTML: m.label,
                onInput: (e: Event) => {
                  const target = e.target as HTMLElement;
                  emit('update', m.id, 'label', target.innerHTML);
                  notifyLayout();
                },
                onKeyDown: (e: KeyboardEvent) => {
                  if (e.key === 'Enter') e.preventDefault();
                },
                onMousedown: (e: MouseEvent) => e.stopPropagation(),
                class: `col-start-1 row-start-1 bg-transparent outline-none w-full h-full text-inherit ${textStyles}`,
                style: { color: 'inherit' },
              }),
            ])
            : h('span', { class: `select-none block ${textStyles}`, innerHTML: m.label || '' }),

          ...(props.isEditing
            ? [
              h('button', {
                onClick: (e) => { e.stopPropagation(); emit('add', m.id); },
                class: 'absolute -right-5 top-1/2 -translate-y-1/2 w-8 h-8 bg-white text-[var(--color-primary)] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 z-20 border-2 border-[var(--color-primary)]',
                title: 'Add Child',
              },
                h('span', { class: 'material-symbols-outlined text-[18px] font-bold' }, 'arrow_forward'),
              ),
              !props.isRoot && props.parentId
                ? h('button', {
                  onClick: (e) => { e.stopPropagation(); emit('add', props.parentId); },
                  class: 'absolute left-1/2 -bottom-5 -translate-x-1/2 w-8 h-8 bg-white text-[var(--color-secondary)] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-md hover:scale-110 z-20 border-2 border-[var(--color-secondary)]',
                  title: 'Add Sibling',
                },
                  h('span', { class: 'material-symbols-outlined text-[18px] font-bold' }, 'add'),
                )
                : null,
              !props.isRoot
                ? h('button', {
                  onClick: (e) => { e.stopPropagation(); emit('delete', m.id); },
                  class: 'absolute -left-2 -top-2 w-6 h-6 bg-white text-[var(--color-error)] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-md hover:scale-110 z-20 border border-[var(--color-error)]',
                  title: 'Delete',
                },
                  h('span', { class: 'material-symbols-outlined text-[14px] font-bold' }, 'close'),
                )
                : null,
            ].filter(Boolean)
            : []),
        ],
      );

      const renderChildren = (childrenList: DiagramNodeData[], dir: string) => {
        if (!childrenList || childrenList.length === 0) return null;
        const isLeft = dir === 'left';
        return h('div', {
          class: ['flex flex-col gap-4 justify-center shrink-0 py-2', isLeft ? 'mr-8' : 'ml-8'],
        },
          childrenList.map((child) =>
            h(DiagramItem, {
              key: child.id,
              model: child,
              isEditing: props.isEditing,
              parentId: m.id,
              depth: props.depth + 1,
              direction: dir,
              onUpdate: (...args: any[]) => emit('update', ...args),
              onAdd: (...args: any[]) => emit('add', ...args),
              onDelete: (...args: any[]) => emit('delete', ...args),
            }),
          ),
        );
      };

      if (props.isRoot && mode.value === 'center') {
        const lefts: DiagramNodeData[] = [];
        const rights: DiagramNodeData[] = [];
        if (m.children) {
          m.children.forEach((c, i) => {
            if (i % 2 !== 0) lefts.push(c);
            else rights.push(c);
          });
        }
        return h('div', { class: 'flex items-center shrink-0' }, [
          renderChildren(lefts, 'left'),
          nodeEl,
          renderChildren(rights, 'right'),
        ]);
      }

      let finalDir = props.direction;
      if (props.isRoot) {
        if (mode.value === 'left') finalDir = 'right';
        if (mode.value === 'right') finalDir = 'left';
      }

      const childrenEl = m.children && m.children.length > 0 ? renderChildren(m.children, finalDir) : null;
      return h('div', { class: ['flex items-center shrink-0', finalDir === 'left' ? 'flex-row-reverse' : ''] }, [nodeEl, childrenEl]);
    };
  },
});

// --- MAIN LOGIC ---
const isPreview = ref(false);
const isEditable = computed(() => props.editor.isEditable);
const isEditing = computed(() => props.editor.isEditable && !isPreview.value);
const treeData = computed<DiagramNodeData | null>(() => props.node.attrs.diagram_data || null);

const layoutMode = ref(props.node.attrs.layout === 'tree' ? 'left' : 'center');
const toggleLayout = () => {
  const nextMode = layoutMode.value === 'center' ? 'left' : 'center';
  layoutMode.value = nextMode;
  props.updateAttributes({ layout: nextMode === 'center' ? 'mindmap' : 'tree' });
};

watch(() => props.node.attrs.layout, (newLayout) => {
  const targetMode = newLayout === 'tree' ? 'left' : 'center';
  if (layoutMode.value !== targetMode) layoutMode.value = targetMode;
});

provide(LAYOUT_KEY, {
  mode: layoutMode,
  setMode: (m: string) => {
    layoutMode.value = m;
    props.updateAttributes({ layout: m === 'center' ? 'mindmap' : 'tree' });
  },
});

const canvasRef = ref<HTMLElement | null>(null);
const contentRef = ref<HTMLElement | null>(null);
const paths = ref<Array<{ id: string; d: string }>>([]);
const arrows = ref<Array<ArrowData>>([]);
const nodeRegistry = new Map<string, HTMLElement>();
let resizeObserver: ResizeObserver | null = null;

// --- MATH HELPERS ---
const getCubicBezierXY = (t: number, p0: { x: number, y: number }, p1: { x: number, y: number }, p2: { x: number, y: number }, p3: { x: number, y: number }) => {
  const u = 1 - t;
  const x = (u ** 3) * p0.x + 3 * (u ** 2) * t * p1.x + 3 * u * (t ** 2) * p2.x + (t ** 3) * p3.x;
  const y = (u ** 3) * p0.y + 3 * (u ** 2) * t * p1.y + 3 * u * (t ** 2) * p2.y + (t ** 3) * p3.y;
  return { x, y };
};

const getDist = (p1: { x: number, y: number }, p2: { x: number, y: number }) => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

// --- LINE DRAWING ALGORITHM ---
const updateConnectors = () => {
  if (!canvasRef.value || !treeData.value || !contentRef.value) return;

  const newPaths: Array<{ id: string; d: string }> = [];
  const newArrows: Array<ArrowData> = [];
  const canvasRect = canvasRef.value.getBoundingClientRect();

  const getRelRect = (id: string) => {
    const el = nodeRegistry.get(id);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      left: r.left - canvasRect.left,
      right: r.right - canvasRect.left,
      cx: (r.left + r.right) / 2 - canvasRect.left,
      cy: (r.top + r.bottom) / 2 - canvasRect.top,
    };
  };

  const traverse = (node: DiagramNodeData) => {
    if (!node.children || node.children.length === 0) return;

    const parentRect = getRelRect(node.id);
    if (!parentRect) return;

    node.children.forEach((child) => {
      const childRect = getRelRect(child.id);
      if (childRect) {
        const isChildRight = childRect.cx > parentRect.cx;

        // Koordinat Utama
        const start = { x: isChildRight ? parentRect.right : parentRect.left, y: parentRect.cy };
        const end = { x: isChildRight ? childRect.left : childRect.right, y: childRect.cy };

        // Control Points untuk Bezier
        const dist = Math.abs(end.x - start.x);
        const cpOffset = Math.min(dist * 0.5, 80) * (isChildRight ? 1 : -1);

        const cp1 = { x: start.x + cpOffset, y: start.y };
        const cp2 = { x: end.x - cpOffset, y: end.y };

        // 1. Buat Path Visual
        const d = `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${end.x} ${end.y}`;
        newPaths.push({ id: `${node.id}-${child.id}`, d });

        // 2. Hitung Vektor Ujung (Tip) dan Titik Mundur 3px (Tail)
        const tip = end; // t = 1.0
        let tail = tip;
        let t = 1.0;

        // Loop mundur t sampai mendapatkan jarak minimal 3px
        while (t > 0) {
          t -= 0.005; // Step kecil
          const temp = getCubicBezierXY(t, start, cp1, cp2, end);
          if (getDist(tip, temp) >= 3) { // <--- DIGANTI JADI 3px AGAR LEBIH STABIL
            tail = temp;
            break;
          }
        }

        // 3. Hitung Sudut (Atan2)
        const dx = tip.x - tail.x;
        const dy = tip.y - tail.y;
        const angleRad = Math.atan2(dy, dx);
        const angleDeg = angleRad * (180 / Math.PI);

        newArrows.push({
          id: `arrow-${node.id}-${child.id}`,
          x: tip.x,
          y: tip.y,
          angle: angleDeg
        });
      }
      traverse(child);
    });
  };

  traverse(treeData.value);
  paths.value = newPaths;
  arrows.value = newArrows;
};

const queueUpdate = () => nextTick(() => requestAnimationFrame(updateConnectors));

provide(REGISTRY_KEY, {
  registerNode: (id, el) => { nodeRegistry.set(id, el); queueUpdate(); },
  unregisterNode: (id) => { nodeRegistry.delete(id); queueUpdate(); },
  notifyLayout: queueUpdate,
});

watch(treeData, queueUpdate, { deep: true });

onMounted(() => {
  queueUpdate();
  if (contentRef.value) {
    resizeObserver = new ResizeObserver(() => requestAnimationFrame(updateConnectors));
    resizeObserver.observe(contentRef.value);
  }
});

onUnmounted(() => {
  if (resizeObserver) resizeObserver.disconnect();
  nodeRegistry.clear();
});

// --- CRUD ---
const genId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
const handleUpdate = (id: string, field: string, value: any) => {
  const data = JSON.parse(JSON.stringify(treeData.value));
  const findAndUpdate = (n: DiagramNodeData): boolean => {
    if (n.id === id) { (n as any)[field] = value; return true; }
    return n.children?.some(findAndUpdate) ?? false;
  };
  if (findAndUpdate(data)) props.updateAttributes({ diagram_data: data });
};
const handleAdd = (parentId: string) => {
  const data = JSON.parse(JSON.stringify(treeData.value));
  const findAndAdd = (n: DiagramNodeData): boolean => {
    if (n.id === parentId) {
      if (!n.children) n.children = [];
      n.children.push({ id: genId(), label: 'Topik', children: [] });
      return true;
    }
    return n.children?.some(findAndAdd) ?? false;
  };
  if (findAndAdd(data)) props.updateAttributes({ diagram_data: data });
};
const handleDelete = (id: string) => {
  const data = JSON.parse(JSON.stringify(treeData.value));
  if (data.id === id) return;
  const findAndDel = (n: DiagramNodeData): boolean => {
    if (!n.children) return false;
    const idx = n.children.findIndex((c) => c.id === id);
    if (idx !== -1) { n.children.splice(idx, 1); return true; }
    return n.children.some(findAndDel);
  };
  if (findAndDel(data)) props.updateAttributes({ diagram_data: data });
};
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  height: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: var(--color-outline-variant);
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: var(--color-outline);
}
</style>