<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useUIStore } from '@/stores/ui';
import { useTitle } from '@vueuse/core';

// PERUBAHAN 1: Ganti impor Pelajaran.vue menjadi Modul.vue
import Modul from '@/components/Aplikasi/Pelajari/Modul.vue';
import Rekomendasi from '@/components/Aplikasi/Pelajari/Rekomendasi.vue';
import Kuis from '@/components/Aplikasi/Pelajari/Kuis.vue';
import Materi from '@/components/Aplikasi/Pelajari/Materi.vue';
// PERUBAHAN 3: Tambahkan impor komponen Evaluasi yang baru
import Evaluasi from '@/components/Aplikasi/Pelajari/Evaluasi.vue';

// Inisialisasi store
const uiStore = useUIStore();

// PERUBAHAN 2: Petakan 'pelajaran' ke komponen Modul yang baru
const views: Record<string, any> = {
  pelajaran: Modul, // <-- Diubah dari Pelajaran ke Modul
  rekomendasi: Rekomendasi,
  kuis: Kuis,
  materi: Materi,
  // PERUBAHAN 4: Tambahkan 'evaluasi' ke daftar tampilan
  evaluasi: Evaluasi,
};

// 3. Buat computed property untuk mendapatkan komponen yang aktif secara dinamis
const activeComponent = computed(() => {
  return views[uiStore.activeLearnView] || null;
});

// Dynamic transition name based on navigation direction
const transitionName = ref('fade');

watch(
  () => uiStore.activeLearnView,
  (newView, oldView) => {
    // Entering materi view = zoom in
    if (newView === 'materi') {
      transitionName.value = 'zoom-in';
    }
    // Leaving materi view = zoom out (for the leaving element effect)
    else if (oldView === 'materi') {
      transitionName.value = 'zoom-out';
    }
    // Default fade for other navigations
    else {
      transitionName.value = 'fade';
    }
  },
);

// Set judul tab browser
useTitle('Leksika');
</script>

<template>
  <div>
    <Transition :name="transitionName" mode="out-in">
      
      <div v-if="uiStore.activeLearnView === 'menu'" class="text-center" key="menu">
              
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-4xl mx-auto">
          
          <div @click="uiStore.setActiveLearnView('pelajaran')" 
               class="bg-[var(--color-surface-container-high)] rounded-xl p-8 cursor-pointer transition-all duration-200 hover:-translate-y-1">
            <div class="text-5xl mb-4 text-[var(--color-primary)]">
              <span class="material-symbols-outlined !text-5xl">school</span>
            </div>
            <h2 class="text-xl font-semibold text-[var(--color-on-background)] mb-2">{{ $t('learn_modules') }}</h2>
            <p class="text-sm text-[var(--color-on-surface-variant)]">{{ $t('learn_modules_desc') }}</p>
          </div>

          <div v-if="false" @click="uiStore.setActiveLearnView('rekomendasi')" 
               class="bg-[var(--color-surface-container-high)] rounded-xl p-8 cursor-pointer transition-all duration-200 hover:-translate-y-1">
            <div class="text-5xl mb-4 text-[var(--color-secondary)]">
              <span class="material-symbols-outlined !text-5xl">recommend</span>
            </div>
            <h2 class="text-xl font-semibold text-[var(--color-on-background)] mb-2">{{ $t('recommendation_title') }}</h2>
            <p class="text-sm text-[var(--color-on-surface-variant)]">{{ $t('recommendation_desc') }}</p>
          </div>

          <div @click="uiStore.setActiveLearnView('kuis')"
               class="bg-[var(--color-surface-container-high)] rounded-xl p-8 cursor-pointer transition-all duration-200 hover:-translate-y-1">
            <div class="text-5xl mb-4 text-[var(--color-tertiary)]">
              <span class="material-symbols-outlined !text-5xl">quiz</span>
            </div>
            <h2 class="text-xl font-semibold text-[var(--color-on-background)] mb-2">{{ $t('quiz_mode') }}</h2>
            <p class="text-sm text-[var(--color-on-surface-variant)]">{{ $t('quiz_mode_desc') }}</p>
          </div>
          
          <div v-if="false" @click="uiStore.setActiveLearnView('evaluasi')"
               class="bg-[var(--color-surface-container-high)] rounded-xl p-8 cursor-pointer transition-all duration-200 hover:-translate-y-1">
            <div class="text-5xl mb-4 text-[var(--color-error)]">
              <span class="material-symbols-outlined !text-5xl">article</span></div>
            <h2 class="text-xl font-semibold text-[var(--color-on-background)] mb-2">{{ $t('evaluation_title') }}</h2>
            <p class="text-sm text-[var(--color-on-surface-variant)]">{{ $t('evaluation_desc') }}</p>
          </div>

        </div>
      </div>

      <KeepAlive v-else>
        <component :is="activeComponent" :key="uiStore.activeLearnView" />
      </KeepAlive>

    </Transition>
  </div>
</template>

<style>
/* Default fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
