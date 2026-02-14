<script setup lang="ts">
import { computed } from 'vue';
import { useUIStore } from '@/stores/ui';
// PERBAIKAN PATH: Mengarah ke folder Aplikasi/Admin
import ManajemenMateri from '@/components/Aplikasi/Admin/ManajemenMateri.vue';

const uiStore = useUIStore();

// Mengambil data materi yang sedang aktif dari store
// Asumsi: uiStore.selectedMateriData diisi sebelum berpindah ke view 'materi'
const currentMateri = computed(() => uiStore.selectedMateriData);

const handleBack = () => {
  // Jika user menekan tombol kembali, kembalikan ke menu utama
  // Atau bisa dikembalikan ke 'rekomendasi' tergantung flow yang diinginkan
  uiStore.selectedMateriData = null; // Reset data
  uiStore.setActiveLearnView('menu');
};

const handleGlobalSave = () => {
  // Fungsi ini kosong karena di mode public (Materi.vue) tidak ada penyimpanan data
  console.warn('Save attempted in public view');
};

const handleTogglePreview = () => {
  // Opsional: Handle toggle jika diperlukan, tapi di mode siswa ini biasanya statis true
  console.log('Toggle preview clicked in student mode');
};
</script>

<template>
  <div class="h-full w-full bg-[var(--color-background)]">
    <div v-if="currentMateri" class="h-full">
      <ManajemenMateri
        :materi="currentMateri"
        :is-public-view="true"
        @back="handleBack"
        @request-global-save="handleGlobalSave"
        @toggle-preview="handleTogglePreview"
      />
    </div>
    
    <div v-else class="h-full flex flex-col items-center justify-center text-[var(--color-on-surface-variant)]">
      <span class="material-symbols-outlined text-6xl mb-4 opacity-50">menu_book</span>
      <p>Data materi tidak ditemukan.</p>
      <button 
        @click="handleBack" 
        class="mt-4 px-4 py-2 bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-full hover:bg-[var(--color-primary-fixed-dim)] transition-colors">
        Kembali ke Menu
      </button>
    </div>
  </div>
</template>
