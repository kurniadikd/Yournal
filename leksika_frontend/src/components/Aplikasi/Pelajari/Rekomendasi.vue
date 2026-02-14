<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useLearnStore } from '@/stores/learn';
import { useUIStore } from '@/stores/ui';
import { useTitle } from '@vueuse/core';
import LoadingSpinner from '@/components/LoadingSpinner.vue';

useTitle('Rekomendasi Belajar');

const store = useLearnStore();
const uiStore = useUIStore(); // Inisialisasi UI store
const SKOR_MINIMUM = 70; // Tentukan standar skor minimum di sini

onMounted(() => {
  store.fetchInitialData();
});

// Helper untuk meratakan silabus menjadi satu array materi
const semuaMateri = computed(() => {
  return store.silabus.flatMap((level) =>
    level.moduls.flatMap((modul) => modul.materis),
  );
});

// Mengecek apakah pengguna sudah punya progres
const hasProgress = computed(() => Object.keys(store.progres).length > 0);

// --- LOGIKA REKOMENDASI ---

// 1. Rekomendasi untuk diulas kembali (skor rendah)
const rekomendasiUlasan = computed(() => {
  if (!hasProgress.value) return [];

  const idMateriSkorRendah = Object.entries(store.progres)
    .filter(([_, data]) => data.selesai && data.skor < SKOR_MINIMUM)
    .map(([materiId, _]) => parseInt(materiId));

  return semuaMateri.value.filter((materi) =>
    idMateriSkorRendah.includes(materi.id),
  );
});

// 2. Rekomendasi untuk melanjutkan ke materi berikutnya
const rekomendasiLanjutan = computed(() => {
  if (semuaMateri.value.length === 0) return null;

  const materiSelesaiIds = new Set(
    Object.entries(store.progres)
      .filter(([_, data]) => data.selesai)
      .map(([materiId, _]) => parseInt(materiId)),
  );

  const materiBerikutnya = semuaMateri.value.find(
    (materi) => !materiSelesaiIds.has(materi.id),
  );

  return materiBerikutnya || null;
});

// 3. Rekomendasi untuk pengguna baru
const rekomendasiAwal = computed(() => {
  return semuaMateri.value.length > 0 ? semuaMateri.value[0] : null;
});

// Helper untuk mendapatkan nama modul & level dari sebuah materi
const getMateriParent = (materiId) => {
  for (const level of store.silabus) {
    for (const modul of level.moduls) {
      if (modul.materis.some((m) => m.id === materiId)) {
        return { level: level.nama, modul: modul.nama };
      }
    }
  }
  return { level: '', modul: '' };
};

// Fungsi untuk kembali ke menu
const backToMenu = () => {
  uiStore.setActiveLearnView('menu');
};
</script>

<template>
  <div class="rekomendasi-container mx-auto max-w-3xl p-4 sm:p-6">
    <!-- Header dengan Tombol Kembali -->
    <div class="relative mb-8 text-center">
      <button 
        @click="backToMenu" 
        class="absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-1 text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
      >
        <span class="material-symbols-outlined">arrow_back</span>
        Kembali
      </button>
      <h1 class="text-3xl sm:text-4xl font-bold text-neutral-800 dark:text-neutral-100">
        Rekomendasi Belajar
      </h1>
    </div>
    
    <!-- Tampilan Loading & Error -->
    <div v-if="store.isLoading" class="text-center text-neutral-500 dark:text-neutral-400 py-10 flex flex-col items-center gap-3">
      <LoadingSpinner size="lg" color="outline" />
      <span>Menganalisis progres Anda...</span>
    </div>
    <div v-if="store.error" class="text-center bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-lg">{{ store.error }}</div>

    <!-- Tampilan Utama -->
    <div v-if="!store.isLoading && !store.error">
      
      <!-- Skenario 1: Untuk Pengguna Baru -->
      <div v-if="!hasProgress && rekomendasiAwal" class="mb-12">
        <h3 class="text-xl font-semibold mb-2 text-neutral-800 dark:text-neutral-100">Mulai dari Awal</h3>
        <p class="text-neutral-600 dark:text-neutral-300 mb-6">Sepertinya Anda baru di sini. Ayo mulai perjalanan belajar Anda dengan materi pertama!</p>
        <router-link :to="{ name: 'DetailMateri', params: { id: rekomendasiAwal.id } }" class="flex items-center bg-white dark:bg-neutral-800 p-6 rounded-xl shadow-lg text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-xl">
          <span class="material-symbols-outlined text-4xl mr-6 text-indigo-500 dark:text-indigo-400">rocket_launch</span>
          <div class="flex-grow">
            <h4 class="text-lg font-bold text-neutral-900 dark:text-neutral-50">{{ rekomendasiAwal.judul }}</h4>
            <span class="text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 py-1 px-2 rounded-md">{{ getMateriParent(rekomendasiAwal.id).modul }}</span>
          </div>
          <span class="material-symbols-outlined text-3xl text-neutral-300 dark:text-neutral-500">arrow_forward</span>
        </router-link>
      </div>

      <!-- Skenario 2 & 3: Untuk Pengguna Aktif / Selesai -->
      <div v-else>
        <!-- Rekomendasi Lanjutan -->
        <div v-if="rekomendasiLanjutan" class="mb-12">
          <h3 class="text-xl font-semibold mb-2 text-neutral-800 dark:text-neutral-100">Lanjutkan Belajar</h3>
          <p class="text-neutral-600 dark:text-neutral-300 mb-6">Ini adalah materi selanjutnya dalam perjalanan belajar Anda. Semangat!</p>
          <router-link :to="{ name: 'DetailMateri', params: { id: rekomendasiLanjutan.id } }" class="flex items-center bg-white dark:bg-neutral-800 p-6 rounded-xl shadow-lg text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-xl">
            <span class="material-symbols-outlined text-4xl mr-6 text-green-500 dark:text-green-400">trending_flat</span>
            <div class="flex-grow">
              <h4 class="text-lg font-bold text-neutral-900 dark:text-neutral-50">{{ rekomendasiLanjutan.judul }}</h4>
              <span class="text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 py-1 px-2 rounded-md">{{ getMateriParent(rekomendasiLanjutan.id).modul }}</span>
            </div>
            <span class="material-symbols-outlined text-3xl text-neutral-300 dark:text-neutral-500">arrow_forward</span>
          </router-link>
        </div>
        
        <!-- Pesan Selesai Semua Materi -->
        <div v-else class="text-center bg-green-50 dark:bg-green-900/30 p-8 rounded-xl border border-green-200 dark:border-green-800 mb-12">
          <span class="material-symbols-outlined text-6xl text-green-500 dark:text-green-400">celebration</span>
          <h3 class="text-2xl font-bold mt-4 text-green-800 dark:text-green-200">Selamat!</h3>
          <p class="text-green-700 dark:text-green-300 mt-2">Anda telah menyelesaikan semua materi yang tersedia. Kerja bagus!</p>
        </div>

        <!-- Rekomendasi Ulasan (jika ada) -->
        <div v-if="rekomendasiUlasan.length > 0">
          <h3 class="text-xl font-semibold mb-2 text-neutral-800 dark:text-neutral-100">Ulas Kembali Materi Ini</h3>
          <p class="text-neutral-600 dark:text-neutral-300 mb-6">Kami melihat skor Anda pada beberapa materi ini masih bisa ditingkatkan.</p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <router-link v-for="materi in rekomendasiUlasan" :key="materi.id" :to="{ name: 'DetailMateri', params: { id: materi.id } }" class="block bg-amber-50 dark:bg-amber-900/30 p-4 rounded-lg border border-amber-200 dark:border-amber-800 transition-all hover:border-amber-400 dark:hover:border-amber-600 hover:shadow-md">
              <h4 class="font-semibold text-amber-900 dark:text-amber-100">{{ materi.judul }}</h4>
              <span class="text-sm font-bold text-red-600 dark:text-red-400">Skor Anda: {{ store.getProgresForMateri(materi.id).skor }}</span>
            </router-link>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
