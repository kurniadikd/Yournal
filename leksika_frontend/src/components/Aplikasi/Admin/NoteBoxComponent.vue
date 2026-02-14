<template>
  <node-view-wrapper class="note-box-container my-6">
    <div class="wiggly-wrapper transition-all duration-300 group">

      <div class="wiggly-box" ref="boxRef" :style="boxStyles">

        <div class="relative z-10 flex items-center gap-2 mb-2 px-4 pt-3 text-inherit">
          <span class="material-symbols-outlined text-xl select-none opacity-80 text-inherit">
            {{ typeIcon }}
          </span>

          <div :contenteditable="isEditing" class="font-bold text-base outline-none flex-grow min-w-0 text-inherit"
            :class="{ 'cursor-text focus:bg-black/10 rounded px-1': isEditing }" @input="updateTitle"
            @keydown.enter.prevent>
            {{ node.attrs.title }}
          </div>

          <div v-if="isEditing" class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button v-for="t in types" :key="t" @click="setType(t)"
              class="w-4 h-4 rounded-full transition-transform hover:scale-125 border border-white/20 shadow-sm"
              :style="{ backgroundColor: `var(--color-${t})` }" :title="t"></button>
            <div class="w-[1px] h-3 bg-black/20 mx-1"></div>
            <button @click="deleteNode"
              class="flex items-center justify-center text-red-700 hover:scale-110 transition-transform" title="Hapus">
              <span class="material-symbols-outlined text-sm">delete</span>
            </button>
          </div>
        </div>

        <div
          class="content-area relative z-10 prose prose-sm max-w-none text-inherit font-medium leading-relaxed px-4 pb-3
                 prose-p:text-inherit prose-headings:text-inherit prose-strong:text-inherit prose-ul:text-inherit prose-ol:text-inherit prose-li:text-inherit">
          <node-view-content />
        </div>

      </div>
    </div>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import { nodeViewProps, NodeViewWrapper, NodeViewContent } from '@tiptap/vue-3';

const props = defineProps(nodeViewProps);
const types = ['primary', 'secondary', 'tertiary'] as const;
const isEditing = computed(() => props.editor.isEditable);

const boxRef = ref<HTMLElement | null>(null);
const roundedHeight = ref<string>('auto');

// Calculate consistent wave size (must match CSS --s)
const S_PX = 4;
const WAVE_UNIT = 4 * S_PX; // 16px

let resizeObserver: ResizeObserver;

onMounted(() => {
  if (boxRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // We need the content height to calculate the target snapped height.
        // We use scrollHeight to get the full height of the content.
        // However, setting height on the element itself might cause loops if not careful.
        // We will assume the visible content dictates height.

        // Reset height temporarily to 'auto' to get the natural height if needed?
        // Actually, let's just use the entry.contentRect.height + vertical padding/border

        // Better approach: Let the element grow naturally, but force min-height or specific height 
        // to snap to the grid.

        // We can't easily measure "natural height without fixed height" if we already set fixed height.
        // So we might use a wrapper or just check if the current height is off.

        const currentHeight = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;

        // Round to nearest multiple of WAVE_UNIT
        const remainder = currentHeight % WAVE_UNIT;

        if (remainder !== 0) {
          // If we are not aligned, we need to correct it.
          // Usually we want to GROW to the next unit to avoid cutting content.
          // However, if we just set height, we might trap the element.

          // Strategy: Set min-height to the snapped value? No, that doesn't force exact multiple if content is smaller.
          // We need exact multiple for the mask to align perfectly at the bottom.

          // Let's use a "height" style that we update.
          // To avoid loops: only update if diff is significant (> 1px).

          // But how to get the 'natural' height?
          // The ResizeObserver triggers when size changes.
          // If we set style.height, it triggers again.

          // Let's rely on a min-height approach but applied to the CONTAINER wrapper, 
          // and let the wiggly box fill it? 

          // No, simply: Snap the height UP to the nearest 16px.
          // validation: box-sizing is border-box.
          const targetHeight = Math.ceil(currentHeight / WAVE_UNIT) * WAVE_UNIT;

          if (Math.abs(targetHeight - currentHeight) > 0.5) {
            roundedHeight.value = `${targetHeight}px`;
          }
        }
      }
    });
    resizeObserver.observe(boxRef.value);
  }
});

onBeforeUnmount(() => {
  if (resizeObserver) resizeObserver.disconnect();
});

// Style dinamis
const boxStyles = computed(() => {
  const type = props.node.attrs.type || 'primary';
  return {
    '--bg-color': `var(--color-${type}-container)`,
    color: `var(--color-on-${type}-container)`,
    height: roundedHeight.value,
  };
});

const typeIcon = computed(() => {
  switch (props.node.attrs.type) {
    case 'secondary': return 'lightbulb';
    case 'tertiary': return 'report';
    default: return 'info';
  }
});

const defaultLabels: Record<string, string> = {
  primary: 'Info',
  secondary: 'Tips',
  tertiary: 'Peringatan'
};

const updateTitle = (e: Event) => {
  const target = e.target as HTMLElement;
  props.updateAttributes({ title: target.innerText });
};

const setType = (type: string) => {
  props.updateAttributes({
    type,
    title: defaultLabels[type] || 'NOTE'
  });
};

const deleteNode = () => props.deleteNode();
</script>

<style scoped>
.note-box-container :deep(.ProseMirror) {
  min-height: unset;
  padding: 0;
}

/* --- WIGGLY BOX STYLE --- */
.wiggly-box {
  --s: 4px;
  /* Ensure width is a multiple of the wave pattern (4*s) to avoid clipping */
  width: 100%;
  width: round(down, 100%, 4 * var(--s));
  margin-inline: auto;
  box-sizing: border-box;

  /* Background Color */
  background: var(--bg-color);

  /* PENTING: Border transparan untuk memberi ruang bagi gelombang */
  border: calc(2 * var(--s)) solid #0000;

  /* Padding konten agar tidak nabrak gelombang */
  /* The mask needs this exact padding to match the logic */
  padding: calc(3 * var(--s) / 2);

  /* --- WAVY MASK --- */
  mask:
    conic-gradient(#000 0 0) no-repeat 50% / calc(100% - 6 * var(--s)) calc(100% - 6 * var(--s)),
    radial-gradient(var(--s), #000 100%, #0000 calc(100% + 1px)) 0 0 / calc(4 * var(--s)) calc(4 * var(--s)),
    radial-gradient(var(--s), #0000 calc(100% - 1px), #000) var(--s) var(--s) / calc(2 * var(--s)) calc(2 * var(--s)) padding-box;
}

/* Shadow removed to match PercakapanComponent style */


.content-area {
  color: inherit;
}

.content-area :deep(*) {
  color: inherit !important;
  --tw-prose-body: inherit;
  --tw-prose-headings: inherit;
  --tw-prose-lead: inherit;
  --tw-prose-links: inherit;
  --tw-prose-bold: inherit;
  --tw-prose-counters: inherit;
  --tw-prose-bullets: inherit;
  --tw-prose-hr: inherit;
  --tw-prose-quotes: inherit;
  --tw-prose-quote-borders: inherit;
  --tw-prose-captions: inherit;
  --tw-prose-code: inherit;
  --tw-prose-pre-code: inherit;
  --tw-prose-pre-bg: inherit;
  --tw-prose-th-borders: inherit;
  --tw-prose-td-borders: inherit;
}
</style>