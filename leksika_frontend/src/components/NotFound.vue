<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Header from './Header.vue';

const router = useRouter();
const isVisible = ref(false);

onMounted(() => {
  setTimeout(() => {
    isVisible.value = true;
  }, 100);
});

const goHome = () => {
  router.push('/');
};

const goBack = () => {
  router.back();
};

const goApp = () => {
  router.push('/app');
};
</script>

<template>
  <div class="min-h-screen flex flex-col bg-[var(--color-background)]">
    <!-- Header -->
    <Header />

    <!-- Main Content -->
    <main class="flex-grow flex items-center justify-center p-8">
      <div class="text-center max-w-lg">
        <!-- Animated 404 Number -->
        <div 
          class="relative mb-8 transition-all duration-700"
          :class="isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-75'"
        >
          <span class="text-[12rem] font-black text-[var(--color-primary)] opacity-10 select-none leading-none">
            404
          </span>
          <div class="absolute inset-0 flex items-center justify-center">
            <span 
              class="material-symbols-outlined text-8xl text-[var(--color-primary)] animate-float"
            >
              search_off
            </span>
          </div>
        </div>

        <!-- Title -->
        <h1 
          class="text-4xl font-bold mb-4 text-[var(--color-on-background)] transition-all duration-700 delay-100"
          :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
        >
          {{ $t('not_found_title') }}
        </h1>

        <!-- Description -->
        <p 
          class="text-lg text-[var(--color-on-surface-variant)] transition-all duration-700 delay-200"
          :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
        >
          {{ $t('not_found_desc') }}
        </p>
      </div>
    </main>

    <!-- Footer -->
    <footer class="w-full p-4 bg-[var(--color-surface-container-low)] text-[var(--color-on-surface-variant)] text-center text-sm">
      {{ $t('footer_rights') }}
    </footer>
  </div>
</template>

<style scoped>
@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.animate-float {
  animation: float 3s ease-in-out infinite;
}
</style>
