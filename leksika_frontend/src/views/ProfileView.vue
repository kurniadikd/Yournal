<template>
  <Profil />
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useLanguageStore } from '@/stores/language';
import Profil from '../components/Profil.vue';

const route = useRoute();
const languageStore = useLanguageStore();

onMounted(async () => {
  await languageStore.init();
  const sourceLang = route.params.sourceLang as string | undefined;
  const targetLang = route.params.targetLang as string | undefined;
  if (sourceLang && targetLang) {
    const source = languageStore.opsiBahasa.find(
      (b) => b.kodeBahasa === sourceLang,
    );
    const target = languageStore.opsiBahasa.find(
      (b) => b.kodeBahasa === targetLang,
    );
    if (source && target) {
      languageStore.bahasaAsal = source.nama;
      languageStore.bahasaTarget = target.nama;
    }
  }
});
</script>
