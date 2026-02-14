<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { initializeGoogleAnalytics } from '@/utils/telemetry';
import { useStorage } from '@vueuse/core';

const COOKIE_KEY = 'leksika_cookie_consent';
// ID Google Analytics
const GA_MEASUREMENT_ID = 'G-Q7S6VYYSN1';

interface CookieConsent {
  accepted: boolean | 'essential';
  timestamp: number;
}

// Gunakan useStorage untuk persistensi cookie consent
const cookieState = useStorage<CookieConsent | null>(COOKIE_KEY, null);

const isVisible = ref(false);

onMounted(() => {
  if (!cookieState.value) {
    // Show banner after short delay for better UX
    setTimeout(() => {
      isVisible.value = true;
    }, 1000);
  } else {
    // Jika sudah pernah setuju, cek apakah boleh tracking
    try {
      // useStorage otomatis parse JSON jika value tersimpan valid
      const consentData = cookieState.value;
      if (consentData && consentData.accepted === true) {
        initializeGoogleAnalytics(GA_MEASUREMENT_ID);
      }
    } catch (e) {
      console.error('Error parsing cookie consent:', e);
    }
  }
});

const acceptAll = () => {
  cookieState.value = { accepted: true, timestamp: Date.now() };
  initializeGoogleAnalytics(GA_MEASUREMENT_ID);
  isVisible.value = false;
  
};

const acceptEssential = () => {
  cookieState.value = { accepted: 'essential', timestamp: Date.now() };
  isVisible.value = false;
};
</script>

<template>
  <Transition
    enter-active-class="transition duration-500 ease-out"
    enter-from-class="opacity-0 translate-y-8"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition duration-300 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-8"
  >
    <div v-if="isVisible" class="fixed bottom-0 left-0 right-0 z-50 p-4">
      <div class="max-w-4xl mx-auto bg-[var(--color-tertiary-container)] rounded-2xl shadow-2xl dark:shadow-black/50 overflow-hidden">
        <div class="p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-4">
          <!-- Cookie Icon -->
          <div class="flex-shrink-0 w-12 h-12 rounded-full bg-[var(--color-tertiary)] flex items-center justify-center">
            <span class="material-symbols-outlined text-2xl text-[var(--color-on-tertiary)]">cookie</span>
          </div>
          
          <!-- Text -->
          <div class="flex-grow">
            <h3 class="text-lg font-bold text-[var(--color-on-tertiary-container)] mb-1">Kami Menggunakan Cookie 🍪</h3>
            <p class="text-sm text-[var(--color-on-tertiary-container)] opacity-90">
              Leksika menggunakan cookie untuk menyimpan preferensi Anda dan meningkatkan pengalaman pengguna. 
              <a href="/cookies" class="font-bold hover:underline">Pelajari lebih lanjut</a>
            </p>
          </div>
          
          <!-- Buttons -->
          <div class="flex flex-shrink-0 gap-2 w-full md:w-auto">
            <button 
              @click="acceptEssential" 
              class="flex-1 md:flex-none px-4 py-2 rounded-xl bg-[var(--color-on-tertiary-container)]/10 text-[var(--color-on-tertiary-container)] hover:bg-[var(--color-on-tertiary-container)]/20 transition-colors font-medium text-sm"
            >
              Hanya Esensial
            </button>
            <button 
              @click="acceptAll" 
              class="flex-1 md:flex-none px-6 py-2 rounded-xl bg-[var(--color-tertiary)] text-[var(--color-on-tertiary)] hover:bg-[var(--color-tertiary-fixed-dim)] transition-colors font-bold text-sm shadow-md"
            >
              Terima Semua
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>
