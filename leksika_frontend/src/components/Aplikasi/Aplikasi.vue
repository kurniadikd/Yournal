<script setup lang="ts">
import {
  onMounted,
  watchEffect,
  computed,
  ref,
  watch,
  nextTick,
  defineAsyncComponent,
} from 'vue';
import { Popover, PopoverPanel } from '@headlessui/vue';
import { onClickOutside, useResizeObserver } from '@vueuse/core';

// Impor Komponen Utama
import AppHeader from '../Header.vue';
import Navigasi from './Navigasi.vue'; // Critical UI, keep eager

// Lazy Load Dynamic Components
const Auth = defineAsyncComponent(() => import('./Auth.vue'));
const Profil = defineAsyncComponent(() => import('./Profil.vue') as any);
const Konteks = defineAsyncComponent(() => import('./Konteks.vue') as any);
const Pelajari = defineAsyncComponent(() => import('./Pelajari.vue') as any);
const Laporkan = defineAsyncComponent(() => import('./Laporkan.vue') as any);
const Admin = defineAsyncComponent(() => import('./Admin.vue') as any);
const SelamatDatang = defineAsyncComponent(() => import('./SelamatDatang.vue') as any);
const Penerjemah = defineAsyncComponent(() => import('./Penerjemah.vue') as any);
const PopOverKata = defineAsyncComponent(() => import('./PopOverKata.vue') as any);

// Impor Stores
import { useLanguageStore } from '@/stores/language';
import { useSettingsStore } from '@/stores/settings';
import { useUIStore } from '@/stores/ui';
import { useSearchHistory } from '@/composables/useSearchHistory';
import { useSearchStore } from '@/stores/search';
import { useTranslationStore } from '@/stores/translation';
import { useWordStore } from '@/stores/word';
import { useAuthStore } from '@/stores/auth';
import { useListsStore } from '@/stores/lists';
import { storeToRefs } from 'pinia';

// Inisialisasi Stores
const languageStore = useLanguageStore();
const settingsStore = useSettingsStore();
const uiStore = useUIStore();
const { addToHistory } = useSearchHistory();
const searchStore = useSearchStore();
const translationStore = useTranslationStore();
const wordStore = useWordStore();
const authStore = useAuthStore();
const listsStore = useListsStore();

const { effectiveTheme } = storeToRefs(settingsStore);
const {
  isAkunOpen,
  activeTab,
  isXLargeScreen,
  isNavVisible,
  isFullScreenAuth,
  isOnboardingActive,
} = storeToRefs(uiStore);

// --- LOGIKA POPOVER GLOBAL ---
const popoverPanelRef = ref<any>(null);
const popoverStyle = ref<Record<string, string | number>>({});
const popoverArrowStyle = ref<Record<string, string | number>>({});

const updatePopoverPosition = () => {
  const popoverEl = popoverPanelRef.value?.$el;
  const targetEl = wordStore.popoverTarget;
  if (!popoverEl || !targetEl) return;

  const targetRect = targetEl.getBoundingClientRect();
  const popoverRect = popoverEl.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const screenPadding = 16;
  const popoverOffset = 12;
  let isPopoverAbove = false;

  const spaceBelow = viewportHeight - targetRect.bottom;
  const spaceAbove = targetRect.top;
  if (
    spaceBelow < popoverRect.height + screenPadding &&
    spaceAbove > popoverRect.height + screenPadding
  ) {
    isPopoverAbove = true;
  }

  let clampedLeft =
    targetRect.left + targetRect.width / 2 - popoverRect.width / 2;
  let clampedTop = isPopoverAbove
    ? targetRect.top - popoverOffset - popoverRect.height
    : targetRect.bottom + popoverOffset;

  clampedTop = Math.max(screenPadding, clampedTop);
  clampedLeft = Math.max(screenPadding, clampedLeft);
  clampedLeft = Math.min(
    clampedLeft,
    viewportWidth - popoverRect.width - screenPadding,
  );

  popoverStyle.value = {
    top: `${clampedTop}px`,
    left: `${clampedLeft}px`,
    opacity: 1,
  };

  const targetCenterX = targetRect.left + targetRect.width / 2;
  const arrowLeftPosition = targetCenterX - clampedLeft;
  const arrowSize = 12;

  const isDarkMode = document.documentElement.classList.contains('dark');
  const borderColor = 'var(--color-outline-variant)';
  const bgColor = 'var(--color-surface-container)';

  let newArrowStyle: Record<string, string> = {
    left: `${arrowLeftPosition - arrowSize / 2}px`,
    backgroundColor: bgColor,
  };

  if (isPopoverAbove) {
    newArrowStyle.bottom = `-${arrowSize / 2}px`;
    newArrowStyle.borderRight = `1px solid ${borderColor}`;
    newArrowStyle.borderBottom = `1px solid ${borderColor}`;
  } else {
    newArrowStyle.top = `-${arrowSize / 2}px`;
    newArrowStyle.borderLeft = `1px solid ${borderColor}`;
    newArrowStyle.borderTop = `1px solid ${borderColor}`;
  }
  popoverArrowStyle.value = newArrowStyle;
};

onClickOutside(popoverPanelRef, () => {
  if (wordStore.popoverTarget) {
    wordStore.hidePopover();
  }
});

watch(
  () => wordStore.popoverTarget,
  (newTarget) => {
    if (newTarget) {
      nextTick(updatePopoverPosition);
    }
  },
);

useResizeObserver(popoverPanelRef, updatePopoverPosition);

const handleSearchFromPopover = (word: string) => {
  if (!word) return;
  wordStore.hidePopover();
  uiStore.setActiveTab('konteks');
  searchStore.setRealtimeInput(word);
  searchStore.setSearchQuery(word);
  if (word) addToHistory(word);
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
// --- AKHIR LOGIKA POPOVER GLOBAL ---

const tabs: Record<string, any> = {
  auth: Auth,
  pelajari: Pelajari,
  konteks: Konteks,
  penerjemah: Penerjemah,
  profil: Profil,
  admin: Admin,
};
const currentTabComponent = computed(() => tabs[activeTab.value]);

const handleReset = () => {
  searchStore.setSearchQuery('');
  searchStore.setRealtimeInput('');
  translationStore.clear();
  wordStore.clear();
  uiStore.setSearchFocus(false);
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
</script>

<template>
  <main class="antialiased min-h-screen relative isolate transition-colors duration-300
               flex flex-col 
               xl:grid xl:grid-cols-[16rem_1fr] xl:grid-rows-[1fr]"
        :style="{ backgroundColor: 'var(--color-background)', color: 'var(--color-on-background)' }">
    
    <Laporkan title="Laporkan Kalimat Ini">
      <template #content="{ item }">
        <div v-if="item">
          <p class="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            {{ item.konten }}
          </p>
          <p class="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {{ item.terjemahan }}
          </p>
        </div>
      </template>
    </Laporkan>
    
    <Navigasi v-if="isNavVisible" class="xl:col-start-1 xl:row-start-1 z-50" />

    <div
      v-if="!isFullScreenAuth" 
      class="flex flex-col flex-grow w-full transition-all duration-500 ease-out
             pb-24 xl:pb-0 
             xl:col-start-2 xl:row-start-1 min-h-screen"
      :class="{ 
        'scale-95 opacity-80': isAkunOpen, 
        'scale-90 opacity-0': isOnboardingActive,
      }"
    >
      <AppHeader
        @reset-state="handleReset"
      />

      <div class="mx-auto w-full max-w-3xl md:max-w-4xl xl:max-w-5xl flex-grow px-4 md:px-8">
        <Transition name="fade" mode="out-in">
          <KeepAlive>
            <component :is="currentTabComponent" />
          </KeepAlive>
        </Transition>
      </div>
    </div>
    
    <Transition name="fade" mode="out-in">
        <Auth v-if="activeTab === 'auth'" />
    </Transition>

    <Popover as="div">
      <transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="transform scale-95 opacity-0"
        enter-to-class="transform scale-100 opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="transform scale-100 opacity-100"
        leave-to-class="transform scale-95 opacity-0"
      >
        <PopoverPanel
          v-if="wordStore.popoverTarget"
          ref="popoverPanelRef"
          :style="popoverStyle"
          static
          class="fixed z-50 focus:outline-none will-change-transform"
        >
          <PopOverKata
            :key="wordStore.popoverWord"
            :word="wordStore.popoverWord"
            @search-lemma="handleSearchFromPopover"
            :arrow-style="popoverArrowStyle"
          />
        </PopoverPanel>
      </transition>
    </Popover>

    <SelamatDatang />
  </main>
</template>
