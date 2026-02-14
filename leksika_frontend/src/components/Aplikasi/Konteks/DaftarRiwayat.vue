<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useMagicKeys } from '@vueuse/core';
import { useSearchHistory } from '@/composables/useSearchHistory';

const emit = defineEmits<{
  (e: 'select-item', item: string): void;
}>();
const { searchHistory, removeFromHistory, clearHistory } = useSearchHistory();

// --- Refs untuk Navigasi Keyboard ---
const listRef = ref<any>(null); // TransitionGroup instance or element
const focusedIndex = ref(-1);

// --- Fungsionalitas VueUse (Navigasi Keyboard) ---
const historyItems = computed(() => searchHistory.value);
const { ArrowUp, ArrowDown, Enter } = useMagicKeys({
  passive: false,
  onEventFired: (e) => {
    if (['ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault();
  },
});

const scrollToItem = (index: number) => {
  nextTick(() => {
    const itemEl = listRef.value?.$el?.children[index];
    itemEl?.scrollIntoView({ block: 'nearest' });
  });
};

watch(ArrowDown, (v) => {
  if (v && historyItems.value.length > 0) {
    focusedIndex.value = (focusedIndex.value + 1) % historyItems.value.length;
    scrollToItem(focusedIndex.value);
  }
});

watch(ArrowUp, (v) => {
  if (v && historyItems.value.length > 0) {
    focusedIndex.value =
      (focusedIndex.value - 1 + historyItems.value.length) %
      historyItems.value.length;
    scrollToItem(focusedIndex.value);
  }
});

watch(Enter, (v) => {
  if (v && focusedIndex.value > -1) {
    handleSelectItem(historyItems.value[focusedIndex.value]);
  }
});

// --- Handlers (Sesuai Perilaku Asli) ---
const handleSelectItem = (item: string) => {
  emit('select-item', item);
};

const handleDeleteItem = (item: string) => {
  removeFromHistory(item);
  focusedIndex.value = -1;
};

const handleClearAll = () => {
  clearHistory();
  focusedIndex.value = -1;
};
</script>

<template>
  <div
    class="absolute top-full mt-2 left-0 right-0 shadow-lg rounded-2xl overflow-hidden z-90 bg-[var(--color-surface-container)] ring-1 ring-[var(--color-primary)]/50"
    @mousedown.prevent
  >
    <header
      class="px-4 py-2 flex justify-between items-center sticky top-0 z-100 bg-[var(--color-surface-container-high)]/90 backdrop-blur-sm"
    >
      <h3 class="text-xs font-bold text-[var(--color-on-surface-variant)] tracking-wider">
        Riwayat Pencarian
      </h3>
      <button
                v-if="searchHistory.length > 0"
        @click="handleClearAll"
        class="text-[var(--color-primary)] hover:text-[var(--color-primary-fixed-dim)] text-xs font-semibold focus:outline-none transition-colors"
      >
        Hapus Semua
      </button>
    </header>

    <div
              v-if="searchHistory.length > 0"
      class="max-h-50 overflow-y-auto overflow-x-hidden scrollbar-thin overscroll-contain touch-auto"
      :class="{ 'is-scrollable': searchHistory.length > 5 }"
    >
      <TransitionGroup
        ref="listRef"
        name="fade-slide-right"
        tag="ul"
        @mouseleave="focusedIndex = -1"
      >
        <li
          v-for="(item, index) in historyItems"
          :key="item"
          class="flex items-center justify-between px-4 py-1 cursor-pointer text-[var(--color-on-surface)] transition-colors"
          :class="{
            'bg-[var(--color-surface-container-low)]': focusedIndex === index,
            'hover:bg-[var(--color-surface-container-low)]': focusedIndex !== index,
          }"
          @click="handleSelectItem(item)"
          @mouseenter="focusedIndex = index"
        >
          <svg class="w-5 h-5 mr-3 text-[var(--color-outline)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <span class="flex-grow truncate" :title="item">{{ item }}</span>
          <button
            @click.stop.prevent="handleDeleteItem(item)"
            class="ml-3 text-[var(--color-outline)] hover:text-[var(--color-error)] hover:bg-[var(--color-surface-container-high)] focus:outline-none p-1.5 rounded-full transition-colors"
            aria-label="Hapus item riwayat"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </li>
      </TransitionGroup>
    </div>
  </div>
</template>

<style scoped>
/* Semua style sama seperti kode asli Anda */
ul {
  padding: 0;
  margin: 0;
  position: relative;
}
.touch-auto {
 touch-action: auto;
}
.overscroll-contain {
 overscroll-behavior: contain;
}
.fade-slide-right-leave-active {
  transition: all 0.4s ease;
  position: absolute;
  width: 100%;
}
.fade-slide-right-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
.scrollbar-thin {
  scrollbar-width: thin;
  scrollbar-gutter: stable;
  scrollbar-color: transparent transparent;
  transition: scrollbar-color 0.3s;
}
.scrollbar-thin::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background-color: transparent;
  border-radius: 9999px;
  transition: background-color 0.3s;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background-color: transparent;
}
.scrollbar-thin.is-scrollable {
  scrollbar-color: var(--color-outline-variant) transparent;
}
.scrollbar-thin.is-scrollable::-webkit-scrollbar-thumb {
  background-color: var(--color-outline-variant);
}
</style>
