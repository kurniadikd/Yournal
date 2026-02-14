<template>
  <div class="px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8 bg-white dark:bg-neutral-800 min-h-screen rounded-3xl w-full h-full flex flex-col">
    
    <header class="flex items-center justify-between mb-6 flex-shrink-0">
      <button @click="handleBack" class="flex items-center justify-center w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors">
        <span class="material-symbols-outlined">arrow_back</span>
      </button>
      <h1 class="text-xl font-bold text-neutral-800 dark:text-neutral-100">Evaluasi & Kemajuan</h1>
      <div class="w-10 h-10"></div> </header>

    <div class="flex-grow flex items-center justify-center text-center p-8 bg-neutral-100 dark:bg-neutral-700 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
      <div>
        <span class="material-symbols-outlined text-6xl text-neutral-500 dark:text-neutral-400 mb-4">analytics</span>
        <p class="text-xl font-semibold text-neutral-600 dark:text-neutral-300">Belum ada data evaluasi</p>
        <p class="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          Data pelajaran dan kuis yang Anda selesaikan akan muncul di sini.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUIStore } from '@/stores/ui';
import { onMounted, onUnmounted } from 'vue';

const uiStore = useUIStore();
const emit = defineEmits(['back']);

onMounted(() => {
  // Atur judul untuk tab browser jika diperlukan
  document.title = 'Leksika';
});

const handleBack = () => {
  uiStore.setActiveLearnView('menu');
};
</script>

<style scoped>
/* Anda bisa menambahkan gaya khusus di sini jika diperlukan */
</style>
