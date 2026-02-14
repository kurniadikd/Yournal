<template>
  <node-view-wrapper as="span" class="image-wrapper inline-block max-w-full">
    <div 
      class="relative group"
      :class="{ 'ring-2 ring-[var(--color-primary)] rounded-lg': selected && editor.isEditable }"
      :style="{ width: `${node.attrs.width}px`, maxWidth: '100%' }"
    >
      <img
        :src="node.attrs.src"
        :alt="node.attrs.alt"
        :title="node.attrs.title"
        class="rounded-lg block w-full h-auto object-contain"
      />

      <button 
        v-if="selected && editor.isEditable" 
        @click="deleteNode" 
        class="absolute top-1 right-1 z-10 w-6 h-6 flex items-center justify-center rounded-full bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-fixed-dim)] transition-colors shadow-md"
        title="Hapus Gambar"
      >
        <span class="material-symbols-outlined text-base">close</span>
      </button>

      <div
        v-if="selected && editor.isEditable"
        data-drag-handle
        class="absolute top-1 left-1 z-10 w-6 h-6 flex items-center justify-center rounded-full bg-[var(--color-surface-bright)] text-[var(--color-on-background)] cursor-grab backdrop-blur-sm"
        title="Geser Gambar"
      >
        <span class="material-symbols-outlined text-base">drag_indicator</span>
      </div>

      <div
        v-if="selected && editor.isEditable"
        class="absolute bottom-0 right-0 w-4 h-4 bg-[var(--color-primary)] border-2 border-[var(--color-surface)] dark:border-[var(--color-surface-lowest)] rounded-full cursor-se-resize shadow-sm hover:scale-125 transition-transform"
        @mousedown.prevent="onResizeStart"
      ></div>
    </div>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { useEventListener } from '@vueuse/core';

const props = defineProps(nodeViewProps);

const onResizeStart = (event: MouseEvent) => {
  const imageContainer = (event.target as HTMLElement).closest('.image-wrapper') as HTMLElement;
  if (!imageContainer) return;

  const startX = event.clientX;
  const startWidth = imageContainer.offsetWidth; // Mengambil lebar saat ini

  const onMouseMove = (moveEvent: MouseEvent) => {
    const currentX = moveEvent.clientX;
    const diffX = currentX - startX;
    const newWidth = startWidth + diffX;
    
    // Batasi lebar minimum gambar agar tidak terlalu kecil (misal: 80px)
    props.updateAttributes({ width: Math.max(80, newWidth) });
  };

  // Gunakan VueUse untuk cleanup otomatis listener saat komponen di-unmount atau event selesai
  const cleanupMove = useEventListener(document, 'mousemove', onMouseMove);
  
  const onMouseUp = () => {
    cleanupMove();
    cleanupUp();
  };
  
  const cleanupUp = useEventListener(document, 'mouseup', onMouseUp);
};
</script>

<style scoped>
/* Opsional: Tambahan styling jika tailwind tidak mencakup semuanya */
.image-wrapper img {
  display: block;
}
</style>