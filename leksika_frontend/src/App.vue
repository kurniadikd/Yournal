<script setup lang="ts">
import { onMounted, watchEffect, computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

// Impor Stores
import { useLanguageStore } from '@/stores/language';
import { useSettingsStore } from '@/stores/settings';
import { useUIStore } from '@/stores/ui';
import { useSearchStore } from '@/stores/search';
import { useTranslationStore } from '@/stores/translation';
import { useWordStore } from '@/stores/word';
import { useAuthStore } from '@/stores/auth';
import { useListsStore } from '@/stores/lists';
import { useThemeStore } from '@/stores/themes';
import { storeToRefs } from 'pinia';
import PaletWarna from '@/components/PaletWarna.vue';
import LogAi from '@/components/LogAi.vue';
import VirtualKeyboard from '@/components/VirtualKeyboard.vue';
import MasukBerhasil from '@/components/MasukBerhasil.vue';
import { useSession, initializeSession } from '@/utils/session';
import {
  useTitle,
  useOnline,
  useMagicKeys,
  whenever,
  useEventListener,
} from '@vueuse/core';

// Import global modals for Header functionality
import Pengaturan from '@/components/Aplikasi/Pengaturan.vue';
import Akun from '@/components/Aplikasi/Akun.vue';
import Personalisasi from '@/components/Aplikasi/Personalisasi.vue';
import Lainnya from '@/components/Aplikasi/Lainnya.vue';
import InfoAplikasi from '@/components/Aplikasi/InfoAplikasi.vue';

// Inisialisasi Stores & Session Manager
const { isConnected, isSessionValidated } = useSession();
const languageStore = useLanguageStore();
const settingsStore = useSettingsStore();
const uiStore = useUIStore();
const searchStore = useSearchStore();
const translationStore = useTranslationStore();
const wordStore = useWordStore();
const authStore = useAuthStore();
const listsStore = useListsStore();
const themeStore = useThemeStore();

const { isColorPaletteOpen, isAiLogOpen } = storeToRefs(uiStore);
const { effectiveTheme } = storeToRefs(settingsStore);

// Inisialisasi Router
const route = useRoute();
const router = useRouter();
const isHomePage = computed(() => route.path === '/');

// Inisialisasi store penting
languageStore.init();

watchEffect(() => {
  if (authStore.isLoggedIn) {
    listsStore.initializeLists();
    settingsStore.fetchUserSettings();
  }
});

// Watch untuk regenerate tema ketika settings theme berubah (setelah fetch dari server)
watch(
  () => [settingsStore.themeSeedColor, settingsStore.themeStyle],
  ([newSeedColor, newStyle]) => {
    if (newSeedColor && newStyle) {
      themeStore.generateThemeFromSeed(newSeedColor, newStyle);
    }
  },
);

const googleFontsUrl = computed(() => {
  const fontFamilies = settingsStore.availableFonts
    ?.filter((font) => font.name !== 'Times New Roman')
    .map((font) => `family=${font.name.replace(/ /g, '+')}:wght@400;700`)
    .join('&');
  return fontFamilies
    ? `https://fonts.googleapis.com/css2?${fontFamilies}&display=swap`
    : '';
});

// Watcher untuk tema gelap dan meta theme-color
watchEffect(() => {
  const isDark = effectiveTheme.value === 'dark';
  document.documentElement.classList.toggle('dark', isDark);

  // Perbarui meta theme-color secara dinamis dari palet yang dihasilkan
  const newThemeColor =
    themeStore.generatedPalettes?.[effectiveTheme.value]?.[
      '--color-background'
    ];
  if (newThemeColor) {
    let metaThemeColor = document.querySelector(
      "meta[name='theme-color']:not([media])",
    );
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', newThemeColor);
  }
});

watchEffect(() => {
  const url = googleFontsUrl.value;
  if (!url) return;
  let link = document.querySelector('link[data-google-fonts]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.rel = 'stylesheet';
    link.setAttribute('data-google-fonts', 'true');
    document.head.appendChild(link);
  }
  link.href = url;
});

watchEffect(() => {
  const font = settingsStore.availableFonts?.find(
    (f) => f.name === settingsStore.selectedFont,
  );
  if (font) {
    document.documentElement.style.setProperty(
      '--font-family-utama',
      font.family,
    );
  }
});

// Terapkan palet saat mode tema berubah (Terang/Gelap)
watch(effectiveTheme, () => {
  if (themeStore.generatedPalettes) {
    themeStore.applyCurrentPalette();
  }
});

/**
 * Prefetches all lazy-loaded routes in the background.
 */
function prefetchRoutes() {
  if (typeof window === 'undefined') return;

  const startPrefetch = () => {
    const routes = router.getRoutes();
    const seenLoaders = new Set();
    const lazyComponents = [];

    routes.forEach((route) => {
      if (!route.components) return;
      Object.values(route.components).forEach((component) => {
        if (typeof component === 'function') {
          lazyComponents.push(component);
        }
      });
    });

    console.log(
      `[Prefetch] Starting background prefetch for ${lazyComponents.length} components...`,
    );
    let index = 0;

    const runNext = () => {
      if (index >= lazyComponents.length) return;
      const loader = lazyComponents[index];
      index++;

      if (!seenLoaders.has(loader)) {
        seenLoaders.add(loader);
        loader()
          .then(() => {})
          .catch(() => {})
          .finally(() => {
            if ('requestIdleCallback' in window) {
              window.requestIdleCallback(runNext, { timeout: 1000 });
            } else {
              setTimeout(runNext, 50);
            }
          });
      } else {
        runNext();
      }
    };

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(runNext);
    } else {
      setTimeout(runNext, 1000);
    }
  };

  const delay = 3000;
  if (document.readyState === 'complete') {
    setTimeout(startPrefetch, delay);
  } else {
    window.addEventListener('load', () => {
      setTimeout(startPrefetch, delay);
    });
  }
}

onMounted(() => {
  console.log('✅ App.vue mounted.');
  initializeSession();

  // === PERBAIKAN UTAMA: TERAPKAN TEMA TERSIMPAN ===
  themeStore.applyCurrentPalette();

  // Push state awal ke history agar tombol kembali tidak langsung keluar dari /app
  if (route.path === '/app') {
    window.history.pushState({ appState: 'initial' }, '');
  }

  // === OPTIMIZATION: Prefetch all chunks in background ===
  prefetchRoutes();
});

// VueUse Global Features
useTitle('Leksika - Kamus & Belajar Bahasa');
const isOnline = useOnline();

// --- Ctrl+K Shortcut ---
const { Ctrl_K, Meta_K } = useMagicKeys();

whenever(
  () => Ctrl_K.value || Meta_K.value,
  () => {
    uiStore.setSearchFocus(true);
  },
);

// --- Handle Device Back Button (VueUse useEventListener) ---

// Fungsi untuk handle tombol kembali perangkat
const handleBackButton = () => {
  // Hanya handle jika di halaman /app
  if (route.path !== '/app') return;

  // Urutan prioritas: Tutup modal/popup terlebih dahulu, baru navigasi

  if (uiStore.isAiLogOpen) {
    uiStore.closeAiLog();
    window.history.pushState({ appState: 'ailog-closed' }, '');
    return;
  }

  // 1. Tutup Color Palette jika terbuka
  if (uiStore.isColorPaletteOpen) {
    uiStore.closeColorPalette();
    window.history.pushState({ appState: 'palette-closed' }, '');
    return;
  }

  // 2. Tutup modal-modal global (urutan berdasarkan hirarki)
  if (uiStore.isInfoAplikasiOpen) {
    uiStore.closeInfoAplikasiModal();
    window.history.pushState({ appState: 'info-closed' }, '');
    return;
  }

  if (uiStore.isLainnyaOpen) {
    uiStore.closeLainnyaModal();
    window.history.pushState({ appState: 'lainnya-closed' }, '');
    return;
  }

  if (uiStore.isMasukanOpen) {
    uiStore.closeMasukanModal();
    window.history.pushState({ appState: 'masukan-closed' }, '');
    return;
  }

  if (uiStore.isPersonalisasiOpen) {
    uiStore.closePersonalisasiModal();
    window.history.pushState({ appState: 'personalisasi-closed' }, '');
    return;
  }

  if (uiStore.isAkunOpen) {
    uiStore.closeAkunModal();
    window.history.pushState({ appState: 'akun-closed' }, '');
    return;
  }

  if (uiStore.isPengaturanOpen) {
    uiStore.closePengaturanModal();
    window.history.pushState({ appState: 'pengaturan-closed' }, '');
    return;
  }

  if (uiStore.isLoginOpen) {
    uiStore.closeLoginModal();
    window.history.pushState({ appState: 'login-closed' }, '');
    return;
  }

  if (uiStore.isReportModalOpen) {
    uiStore.closeReportModal();
    window.history.pushState({ appState: 'report-closed' }, '');
    return;
  }

  // 3. Handle navigasi internal dalam tab Pelajari
  if (uiStore.activeTab === 'pelajari' && uiStore.activeLearnView !== 'menu') {
    uiStore.setActiveLearnView('menu');
    window.history.pushState({ appState: 'learn-menu' }, '');
    return;
  }

  // 4. Handle navigasi internal dalam tab Profil
  if (uiStore.activeTab === 'profil' && uiStore.activeProfileView !== 'utama') {
    uiStore.setActiveProfileView('utama');
    window.history.pushState({ appState: 'profile-main' }, '');
    return;
  }

  // 5. Kembali ke tab default (konteks) jika di tab lain
  if (uiStore.activeTab !== 'konteks') {
    uiStore.setActiveTab('konteks');
    window.history.pushState({ appState: 'konteks' }, '');
    return;
  }

  // 6. Jika sudah di tab konteks, push state lagi agar tidak keluar
  // (User harus tekan 2x cepat untuk keluar dari app)
  window.history.pushState({ appState: 'stay' }, '');
};

// Listen untuk event popstate (tombol kembali browser/device)
useEventListener(window, 'popstate', handleBackButton);
</script>

<template>
  <div
    class="antialiased min-h-screen relative isolate transition-colors duration-300"
    :style="{ backgroundColor: 'var(--color-background)', color: 'var(--color-on-background)' }"
  >
    <router-view v-slot="{ Component }">
      <Transition name="fly-transition" mode="out-in">
        <component :is="Component" />
      </Transition>
    </router-view>

    <MasukBerhasil />

    <!-- Global Modals for Header functionality -->
    <Pengaturan />
    <Akun />
    <Personalisasi />
    <Lainnya />
    <InfoAplikasi />
    
    <!-- Offline Banner -->
    <Transition name="fade">
      <div v-if="!isOnline" class="fixed top-0 left-0 w-full bg-[var(--color-error)] text-[var(--color-on-error)] text-center py-2 z-[60] text-sm font-bold shadow-md">
        <span class="flex items-center justify-center gap-2">
           <span class="material-symbols-outlined text-lg">wifi_off</span>
           {{ $t('offline_message') }}
        </span>
      </div>
    </Transition>

    <PaletWarna v-if="isColorPaletteOpen" @close="uiStore.closeColorPalette()" />
    <LogAi v-if="isAiLogOpen" @close="uiStore.closeAiLog()" />



    <VirtualKeyboard />

    <!-- Toast Notification -->
    <Transition name="toast">
      <div 
        v-if="uiStore.isToastVisible" 
        class="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-2xl shadow-xl backdrop-blur-sm flex items-center gap-2 min-w-[200px] max-w-[90vw]"
        :class="{
          'bg-[var(--color-success)]/95 text-[var(--color-on-success)]': uiStore.toastType === 'success',
          'bg-[var(--color-error)]/95 text-[var(--color-on-error)]': uiStore.toastType === 'error',
          'bg-[var(--color-secondary)]/95 text-[var(--color-on-secondary)]': uiStore.toastType === 'warning',
          'bg-[var(--color-inverse-surface)]/95 text-[var(--color-inverse-on-surface)]': uiStore.toastType === 'info'
        }"
      >
        <span class="material-symbols-outlined text-xl">
          {{ uiStore.toastType === 'success' ? 'check_circle' :
             uiStore.toastType === 'error' ? 'error' :
             uiStore.toastType === 'warning' ? 'warning' : 'info' }}
        </span>
        <span class="text-sm font-medium">{{ uiStore.toastMessage }}</span>
      </div>
    </Transition>
  </div>
</template>

<style>
/* CSS HARDCODED TETAP DIPERTAHANKAN SEBAGAI FALLBACK/DEFAULT */
/* Tetapi akan langsung tertimpa oleh themeStore.applyCurrentPalette() saat mounted */
:root {
  --font-family-utama: 'Roboto', sans-serif;
  
  --color-seed: #FF00C9;
  --color-primary: #AC0087;
  --color-on-primary: #FFEFF5;
  --color-primary-container: #FF66CE;
  --color-on-primary-container: #480037;
  --color-inverse-primary: #FF35CA;
  --color-secondary: #8B3B8E;
  --color-on-secondary: #FFEFF9;
  --color-secondary-container: #FFBCFA;
  --color-on-secondary-container: #742578;
  --color-tertiary: #3255B7;
  --color-on-tertiary: #F1F2FF;
  --color-tertiary-container: #96ADFF;
  --color-on-tertiary-container: #00297C;
  --color-background: #FFF3F9;
  --color-on-background: #432342;
  --color-surface: #FFF3F9;
  --color-on-surface: #432342;
  --color-surface-variant: #FFCEF9;
  --color-on-surface-variant: #744F71;
  --color-surface-tint: #AC0087;
  --color-inverse-surface: #1E0320;
  --color-inverse-on-surface: #BA90B5;
  --color-error: #B41340;
  --color-on-error: #FFEFEF;
  --color-error-container: #F74B6D;
  --color-on-error-container: #510017;
  --color-success: #386A20;
  --color-on-success: #FFFFFF;
  --color-success-container: #B7F397;
  --color-on-success-container: #042100;
  --color-outline: #916A8E;
  --color-outline-variant: #D39BCF;
  --color-scrim: #000000;
  --color-surface-bright: #FFF3F9;
  --color-surface-container: #FFDFF9;
  --color-surface-container-high: #FFD6F9;
  --color-surface-container-highest: #FFCEF9;
  --color-surface-container-low: #FFEBF9;
  --color-surface-container-lowest: #FFFFFF;
  --color-surface-dim: #FFC0F9;
  --color-primary-fixed: #FF66CE;
  --color-primary-fixed-dim: #FF40CB;
  --color-on-primary-fixed: #000000;
  --color-on-primary-fixed-variant: #590044;
  --color-secondary-fixed: #FFBCFA;
  --color-secondary-fixed-dim: #FFA4FC;
  --color-on-secondary-fixed: #5D0A63;
  --color-on-secondary-fixed-variant: #7F2F82;
  --color-tertiary-fixed: #96ADFF;
  --color-tertiary-fixed-dim: #829FFF;
  --color-on-tertiary-fixed: #001345;
  --color-on-tertiary-fixed-variant: #00308F;
}

:root.dark {
  --color-primary: #FF83D3;
  --color-on-primary: #5D0047;
  --color-primary-container: #FF66CE;
  --color-on-primary-container: #480037;
  --color-inverse-primary: #B2008C;
  --color-secondary: #FEA0FB;
  --color-on-secondary: #67176C;
  --color-secondary-container: #732477;
  --color-on-secondary-container: #FFBAFA;
  --color-tertiary: #8AA4FF;
  --color-on-tertiary: #00236D;
  --color-tertiary-container: #7796FD;
  --color-on-tertiary-container: #001851;
  --color-background: #1E0320;
  --color-on-background: #FFDBF9;
  --color-surface: #1E0320;
  --color-on-surface: #FFDBF9;
  --color-surface-variant: #3E1440;
  --color-on-surface-variant: #B086AC;
  --color-surface-tint: #FF83D3;
  --color-inverse-surface: #FFF7FA;
  --color-inverse-on-surface: #6D496B;
  --color-error: #FF6E84;
  --color-on-error: #490013;
  --color-error-container: #A70138;
  --color-on-error-container: #FFB2B9;
  --color-success: #9CD67D;
  --color-on-success: #0C3900;
  --color-success-container: #1E5108;
  --color-on-success-container: #B7F397;
  --color-outline: #90698C;
  --color-outline-variant: #653764;
  --color-scrim: #000000;
  --color-surface-bright: #471948;
  --color-surface-container: #2E0A2F;
  --color-surface-container-high: #360F37;
  --color-surface-container-highest: #3E1440;
  --color-surface-container-low: #250527;
  --color-surface-container-lowest: #000000;
  --color-surface-dim: #1E0320;
  --color-seed: #FF00C9;
  --color-primary-fixed: #FF66CE;
  --color-primary-fixed-dim: #FF40CB;
  --color-on-primary-fixed: #000000;
  --color-on-primary-fixed-variant: #590044;
  --color-secondary-fixed: #FFBCFA;
  --color-secondary-fixed-dim: #FFA4FC;
  --color-on-secondary-fixed: #5D0A63;
  --color-on-secondary-fixed-variant: #7F2F82;
  --color-tertiary-fixed: #96ADFF;
  --color-tertiary-fixed-dim: #829FFF;
  --color-on-tertiary-fixed: #001345;
  --color-on-tertiary-fixed-variant: #00308F;
}
body {
  font-family: var(--font-family-utama), 'Noto Color Emoji' ;
}
.grecaptcha-badge {
  visibility: hidden;
}

/* Gaya Transisi Global */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: all 0.2s ease-out;
}
.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}

/* Toast Transition */
.toast-enter-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.toast-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 1, 1);
}
.toast-enter-from {
  opacity: 0;
  transform: translate(-50%, 20px) scale(0.95);
}
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 20px) scale(0.95);
}
</style>
