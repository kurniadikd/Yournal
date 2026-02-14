<template>
  <Penerjemah />
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useLanguageStore } from '@/stores/language';
import Penerjemah from '../components/Penerjemah.vue';

const route = useRoute();
const languageStore = useLanguageStore();

onMounted(async () => {
  // Pastikan daftar bahasa sudah dimuat
  await languageStore.init();

  const sourceLang = route.params.sourceLang as string | undefined;
  const targetLang = route.params.targetLang as string | undefined;

  if (sourceLang && targetLang) {
    // Cari nama bahasa berdasarkan kode bahasa dari URL
    const source = languageStore.opsiBahasa.find(
      (b) => b.kodeBahasa === sourceLang,
    );
    const target = languageStore.opsiBahasa.find(
      (b) => b.kodeBahasa === targetLang,
    );

    if (source && target) {
      // Set bahasa di store tanpa memicu navigasi balik (karena URL sudah benar)
      languageStore.bahasaAsal = source.nama;
      languageStore.bahasaTarget = target.nama;
    }
  }
});
</script>
