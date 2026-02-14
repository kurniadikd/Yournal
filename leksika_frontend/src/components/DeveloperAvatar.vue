<template>
  <div class="developer-avatar-container" :class="{ 'is-dark': isDark }">
    <!-- Layer 1: Foreground (Masked) -->
    <div class="avatar-mask"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const isDark = ref(false);
let observer: MutationObserver | null = null;

const checkDarkMode = () => {
  isDark.value = document.documentElement.classList.contains('dark');
};

onMounted(() => {
  checkDarkMode();
  // Observe changes to the <html> element for the 'class' attribute
  observer = new MutationObserver(checkDarkMode);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });
});

onUnmounted(() => {
  if (observer) observer.disconnect();
});
</script>

<style scoped>
.developer-avatar-container {
  width: 100%;
  height: 100%;
  border-radius: 9999px;
  overflow: hidden;
  position: relative;
  border: 0px solid var(--avatar-bg-color); /* Ring follows adaptive Dark Pixel (Foreground) color */
  transition: border-color 0.3s ease, background-color 0.3s ease;
  
  /* --- Light Mode Configuration (Default) --- */
  /* Target: Dark Pixels -> Secondary (Darker), Light Pixels -> On-Secondary (Lighter) */
  --avatar-bg-color: var(--color-secondary);
  --avatar-fg-color: var(--color-on-secondary);
  
  background-color: var(--avatar-bg-color);
}

.developer-avatar-container.is-dark {
  /* --- Dark Mode Configuration (Scoped Override) --- */
  /* Target: Dark Pixels -> On-Secondary (Darker in Dark Mode), Light Pixels -> Secondary (Lighter in Dark Mode) */
  /* Using the configuration you manually set: BG=on-secondary, FG=secondary */
  --avatar-bg-color: var(--color-on-secondary);
  --avatar-fg-color: var(--color-secondary);
}

.avatar-mask {
  width: 100%;
  height: 100%;
  /* Foreground Color */
  background-color: var(--avatar-fg-color);
  
  /* Luma Key Mask */
  mask-image: url('/me.avif');
  -webkit-mask-image: url('/me.avif');
  mask-size: cover;
  -webkit-mask-size: cover;
  mask-position: center;
  -webkit-mask-position: center;
  mask-mode: luminance;
  -webkit-mask-mode: luminance;
}
</style>
