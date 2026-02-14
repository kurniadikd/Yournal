<script setup lang="ts">
import { useUIStore } from '@/stores/ui';
// PERBAIKAN PATH: Mengarah ke folder Aplikasi/Admin
import ManajemenModul from '@/components/Aplikasi/Admin/ManajemenModul.vue';

const uiStore = useUIStore();

const handleBackToMenu = () => {
  // Kembali ke tampilan Menu (Grid Ikon)
  uiStore.setActiveLearnView('menu');
};
</script>

<template>
  <div class="h-full w-full bg-[var(--color-background)]">
    <ManajemenModul 
      :is-public-view="true"
      @back="handleBackToMenu"
    />
  </div>
</template>
