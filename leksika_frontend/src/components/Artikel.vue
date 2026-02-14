<template>
  <div class="min-h-screen flex flex-col bg-[var(--color-background)]">
    <Header />
    <main class="flex-grow flex flex-col">
       <ManajemenArtikel 
          :isPublicView="true" 
          :articleSlug="slug"
       />
    </main>
    <Footer />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import Header from './Header.vue';
import Footer from './Footer.vue';
import ManajemenArtikel from './Aplikasi/Admin/ManajemenArtikel.vue';

const route = useRoute();
const slug = computed(() => route.params.slug as string || null);
</script>
