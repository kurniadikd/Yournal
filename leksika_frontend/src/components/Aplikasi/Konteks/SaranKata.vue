<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMagicKeys, whenever } from '@vueuse/core';
import { useSearchStore } from '@/stores/search'; // Impor Pinia store
// [PENTING] Pastikan path ini sesuai dengan lokasi file suggestion.js Anda
import { useSuggestions } from '@/stores/suggestion';
import LoadingSpinner from '@/components/LoadingSpinner.vue';

const searchStore = useSearchStore();
const { t } = useI18n();

// Gunakan useSuggestions secara langsung dengan reactive input dari store
const suggestionsQuery = useSuggestions(
  computed(() => searchStore.realtimeSearchInput),
);

// Akses data dan loading state dari query
const suggestions = computed<string[]>(() => suggestionsQuery.data.value || []);
const isLoading = computed<boolean>(() => suggestionsQuery.isFetching.value);

const emit = defineEmits<{
  (e: 'select', suggestion: string): void;
}>();

const listRef = ref<HTMLUListElement | null>(null);
const focusedIndex = ref(-1);
const activeDescendant = computed(() =>
  focusedIndex.value > -1 ? `suggestion-item-${focusedIndex.value}` : undefined,
);
const { ArrowUp, ArrowDown, Enter } = useMagicKeys({
  passive: false,
  onEventFired: (e) => {
    if (['ArrowUp', 'ArrowDown', 'Enter'].includes(e.key)) e.preventDefault();
  },
});

const scrollToItem = (index: number) => {
  nextTick(() => {
    const itemEl = listRef.value?.children[index] as HTMLElement;
    itemEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
};

whenever(ArrowDown, () => {
  if (suggestions.value.length > 0) {
    focusedIndex.value = (focusedIndex.value + 1) % suggestions.value.length;
    scrollToItem(focusedIndex.value);
  }
});

whenever(ArrowUp, () => {
  if (suggestions.value.length > 0) {
    focusedIndex.value =
      (focusedIndex.value - 1 + suggestions.value.length) %
      suggestions.value.length;
    scrollToItem(focusedIndex.value);
  }
});

whenever(Enter, () => {
  if (focusedIndex.value > -1) {
    handleSelect(suggestions.value[focusedIndex.value]);
  }
});

watch(suggestions, () => {
  focusedIndex.value = -1;
});

const handleSelect = (suggestion: string) => {
  emit('select', suggestion);
};
</script>

<template>
  <div v-if="suggestions.length > 0 || isLoading" @mousedown.prevent
    class="absolute top-full mt-2 left-0 right-0 shadow-lg rounded-2xl overflow-hidden z-20 bg-[var(--color-surface-container)] ring-1 ring-[var(--color-primary)]/50">
    <header
      class="px-4 py-2 flex justify-between items-center sticky top-0 z-10 bg-[var(--color-surface-container-high)]/90 backdrop-blur-sm border-b border-[var(--color-outline-variant)]">
      <h3 class="text-xs font-bold text-[var(--color-on-surface-variant)] tracking-wider">
        {{ $t('word_suggestions') }}
      </h3>
      <!-- Loading spinner removed as per user request -->
    </header>

    <div class="max-h-60 overflow-y-auto overflow-x-hidden scrollbar-thin overscroll-contain">
      <ul ref="listRef" @mouseleave="focusedIndex = -1" role="listbox" :aria-activedescendant="activeDescendant">
        <li v-if="!isLoading && suggestions.length === 0"
          class="px-4 py-2.5 text-sm text-[var(--color-on-surface-variant)] italic">
          {{ $t('no_suggestions_found') }}
        </li>
        <li v-else v-for="(suggestion, index) in suggestions" :key="index" :id="`suggestion-item-${index}`"
          role="option" :aria-selected="focusedIndex === index" @click="handleSelect(suggestion)"
          @mouseenter="focusedIndex = index"
          class="flex items-center px-4 py-2.5 cursor-pointer text-[var(--color-on-surface)] transition-colors duration-150"
          :class="{
            'bg-[var(--color-surface-container-low)]': focusedIndex === index,
            'hover:bg-[var(--color-surface-container-low)]': focusedIndex !== index,
          }">
          <span class="material-symbols-outlined text-[var(--color-outline)] text-base mr-3">prompt_suggestion</span>
          <span class="flex-grow truncate" :title="suggestion">{{ suggestion }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
/* Style tidak ada perubahan */
ul {
  padding: 0;
  margin: 0;
  position: relative;
}

.overscroll-contain {
  overscroll-behavior: contain;
}

.scrollbar-thin {
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
  transition: scrollbar-color 0.3s;
}

.scrollbar-thin::-webkit-scrollbar {
  width: 8px;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background-color: transparent;
  border-radius: 9999px;
  border: 2px solid transparent;
  background-clip: content-box;
}

.scrollbar-thin:hover::-webkit-scrollbar-thumb {
  background-color: var(--color-outline);
}
</style>
