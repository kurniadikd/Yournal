<script setup lang="ts">
import { useAsyncState, useMemoize } from '@vueuse/core';
import { fetchPopoverData } from '@/stores/word';
import LoadingSpinner from '@/components/LoadingSpinner.vue';

const props = defineProps({
  word: {
    type: String,
    required: true,
  },
  // PERUBAHAN: Menerima style untuk panah sebagai prop
  arrowStyle: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(['search-lemma']);

const getPopoverData = useMemoize(async (word: string) => {
  console.log(`[Debug Popover] Fetching data for word: "${word}"`);
  const data = await fetchPopoverData(word);
  if (!data || Object.keys(data).length === 0) {
    throw new Error('no_data_found');
  }
  return data;
});

const {
  state: popoverData,
  isLoading,
  error,
} = useAsyncState(() => getPopoverData(props.word), null);

const handleSearchLemma = () => {
  emit('search-lemma', props.word);
};
</script>

<template>
  <div class="popover-content-wrapper p-3 bg-[var(--color-surface-container)] rounded-lg shadow-lg border border-[var(--color-outline-variant)] text-sm w-auto backdrop-blur-sm">
    
    <div class="popover-arrow" :style="arrowStyle"></div>

    <div v-if="isLoading" class="flex justify-center items-center min-w-max px-4">
      <LoadingSpinner size="sm" color="primary" />
    </div>

    <div v-else-if="error" class="text-center text-[var(--color-on-surface-variant)]">
      <p>{{ $t((error as any).message || 'no_data_found') }}</p>
    </div>

    <div v-else-if="popoverData">
      <div 
        @click="handleSearchLemma" 
        class="flex items-center justify-center gap-2 cursor-pointer text-[var(--color-primary)] hover:underline"
      >
        <span class="font-bold text-lg whitespace-nowrap">{{ popoverData.accented || props.word }}</span>
        <span class="material-symbols-outlined text-lg">search</span>
      </div>
      <div v-if="popoverData.translations && popoverData.translations.length" class="mt-2 flex justify-center flex-wrap gap-1">
        <span 
          v-for="(translation, index) in popoverData.translations" 
          :key="index"
          class="inline-block bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface-variant)] text-xs font-semibold px-3 py-1 rounded-full"
        >
          {{ translation }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.popover-content-wrapper {
  /* position relative penting agar panah bisa diposisikan terhadap container ini */
  position: relative;
}

/* PERBAHAN: Semua style ::before dan ::after dihapus dan diganti dengan ini */
.popover-arrow {
  position: absolute;
  width: 12px;
  height: 12px;
  transform: rotate(45deg);
  /* Warna akan diatur via prop 'arrowStyle' */
  z-index: -1;
}

/* Biarkan warna latar belakang/border diatur dari Konteks.vue via prop agar konsisten */
</style>
