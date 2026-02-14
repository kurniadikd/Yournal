<script setup lang="ts">
import { watch, ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useTimeout, useVibrate, useMouseInElement } from '@vueuse/core';
import { useUIStore } from '@/stores/ui';
import { useLanguageStore } from '@/stores/language';
import { useAuthStore } from '@/stores/auth';
import { storeToRefs } from 'pinia';
import PilihBahasa from './PilihBahasa.vue';

import UserAvatar from '@/components/UserAvatar.vue';

const emit = defineEmits(['reset-state']);

// STORES
const uiStore = useUIStore();
const languageStore = useLanguageStore();
const authStore = useAuthStore();
const { vibrate } = useVibrate({ pattern: [50] });

// --- REFS & STATE UNTUK EFEK 3D ---
const logoWrapperRef = ref<HTMLElement | null>(null);
const { elementX, elementY, isOutside, elementHeight, elementWidth } =
  useMouseInElement(logoWrapperRef);
const isLogoPressed = ref(false);
const { ready, start } = useTimeout(300, { controls: true, immediate: false });

// REFS & STATE LAINNYA
const { isPengaturanOpen, activeTab } = storeToRefs(uiStore);
const { user } = storeToRefs(authStore);
const isLoggedIn = computed(() => authStore.isLoggedIn);
const showLanguagePicker = ref(false);

// Route detection - show target language only in /app
const route = useRoute();
const isInApp = computed(() => route.path.startsWith('/app'));

// --- LOGIKA STYLE 3D ---
const logo3DStyle = computed(() => {
  const MAX_ROTATION = 8;

  if (isOutside.value || !isLogoPressed.value) {
    return {
      transform: 'rotateX(0deg) rotateY(0deg) scale(1) translateZ(0px)',
      transition: 'transform 0.25s ease-out',
    };
  }

  const x =
    (elementX.value - elementWidth.value / 2) / (elementWidth.value / 2);
  const y =
    (elementY.value - elementHeight.value / 2) / (elementHeight.value / 2);

  const rotateY = x * MAX_ROTATION;
  const rotateX = -y * MAX_ROTATION;

  return {
    transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(0.95) translateZ(-10px)`,
    transition: 'transform 0.1s ease-out',
  };
});

// METHODS
const toggleLanguagePicker = () => {
  showLanguagePicker.value = !showLanguagePicker.value;
};

const handleLogoClick = () => {
  isLogoPressed.value = true;
  vibrate();
  start();
  emit('reset-state');
};

const handleAvatarClick = () => {
  // Langsung buka modal pengaturan tanpa bergantung pada parent emit handler
  uiStore.openPengaturanModal();
};

// WATCHERS
watch(ready, (newValue) => {
  if (newValue) {
    isLogoPressed.value = false;
  }
});
</script>

<template>
  <header
    class="sticky top-0 flex items-center justify-between w-full h-20 px-4 md:px-8 z-40 isolate bg-[var(--color-background)]"
    style="perspective: 800px;"
  >
    <div class="flex-1 flex justify-start">
      <div>
        <div
          @click="toggleLanguagePicker"
          class="flex items-center p-1 rounded-full cursor-pointer transition-colors duration-200 group"
          :class="showLanguagePicker 
            ? 'bg-[var(--color-primary)]' 
            : 'bg-[var(--color-surface-container-high)] hover:bg-[var(--color-primary)]'"
        >
          <Transition
            mode="out-in"
            enter-active-class="transition-all duration-200 ease-in-out"
            enter-from-class="opacity-0 scale-75"
            leave-active-class="transition-all duration-200 ease-in-out"
            leave-to-class="opacity-0 scale-75"
          >
            <img 
              v-if="languageStore.selectedAsal?.bendera"
              :key="languageStore.selectedAsal?.nama"
              :src="languageStore.selectedAsal?.bendera" 
              :alt="languageStore.selectedAsal?.nama" 
              class="w-6 h-6 rounded-full object-cover"
            />
          </Transition>
          <!-- Only show arrow and target flag when in /app - with smooth animation -->
          <Transition
            enter-active-class="transition-all duration-300 ease-out"
            enter-from-class="opacity-0 scale-75 -translate-x-2"
            enter-to-class="opacity-100 scale-100 translate-x-0"
            leave-active-class="transition-all duration-200 ease-in"
            leave-from-class="opacity-100 scale-100 translate-x-0"
            leave-to-class="opacity-0 scale-75 -translate-x-2"
          >
            <div v-if="isInApp" class="flex items-center">
              <span 
                class="material-symbols-outlined text-xl mx-1 transition-colors duration-200"
                :class="showLanguagePicker 
                  ? 'text-[var(--color-on-primary)]' 
                  : 'text-[var(--color-outline)] group-hover:text-[var(--color-on-primary)]'"
              >
                arrow_forward
              </span>
              <Transition
                mode="out-in"
                enter-active-class="transition-all duration-200 ease-in-out"
                enter-from-class="opacity-0 scale-75"
                leave-active-class="transition-all duration-200 ease-in-out"
                leave-to-class="opacity-0 scale-75"
              >
                <img 
                  v-if="languageStore.selectedTarget?.bendera"
                  :key="languageStore.selectedTarget?.nama"
                  :src="languageStore.selectedTarget?.bendera" 
                  :alt="languageStore.selectedTarget?.nama" 
                  class="w-6 h-6 rounded-full object-cover"
                />
              </Transition>
            </div>
          </Transition>
        </div>
      </div>
    </div>
    
    <div 
      ref="logoWrapperRef"
      @mousedown="isLogoPressed = true"
      @mouseup="isLogoPressed = false"
      @mouseleave="isLogoPressed = false"
      @click="handleLogoClick" 
      class="cursor-pointer h-7 flex-none"
      style="transform-style: preserve-3d;"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1857.5 405.5"
        fill="currentColor"
        class="h-full fill-current text-[var(--color-on-background)] transition-all duration-300 ease-in-out"
        :style="logo3DStyle"
      >
        <path d="M0,400.5V50.5H85v275H241v75Z"/>
        <path d="M412.5,405.5q-44,0-76.5-17.8c-21.7-11.9-38.6-28-50.5-48.5s-18-43.9-18-70.2q0-30.5,10-56a132.8,132.8,0,0,1,28-44.3,126.3,126.3,0,0,1,42.8-29c16.5-6.8,34.5-10.2,54.2-10.2s35.8,3.3,51.3,10a119.9,119.9,0,0,1,40.2,28A123.4,123.4,0,0,1,520,210c6,16.3,8.7,34.2,8,53.5l-.5,21.5H316l-11.5-45h158l-8.5,9.5v-10a44.6,44.6,0,0,0-7.7-22.3A47.5,47.5,0,0,0,428.5,202a54,54,0,0,0-25-5.5c-13,0-24.1,2.6-33.2,7.7a49.8,49.8,0,0,0-20.8,22.5c-4.7,9.9-7,22-7,36.3s3.1,27.4,9.3,38.2a63,63,0,0,0,27,25.3c11.9,6,25.9,9,42.2,9a86.8,86.8,0,0,0,30.3-5c8.8-3.3,18.4-9,28.7-17l37.5,53a148.4,148.4,0,0,1-33,22,168.7,168.7,0,0,1-35.7,12.7A158.7,158.7,0,0,1,412.5,405.5Z"/>
        <path d="M579,400.5V30.5h80v370Zm77-78-29.5-60L750.5,135H856Zm103,78-93.5-121,56.5-44,131.5,165Z"/>
        <path d="M979,405.5q-39,0-68.7-12.5c-19.9-8.3-35.6-19.5-47.3-33.5l48.5-42a96.6,96.6,0,0,0,35,22.7c13,4.9,25.3,7.3,37,7.3A44.1,44.1,0,0,0,996,346a27.2,27.2,0,0,0,9.3-4.3,18.1,18.1,0,0,0,7.7-15.2c0-6.7-3-11.8-9-15.5q-4.5-2.5-15-6c-7-2.3-16-5-27-8a218.5,218.5,0,0,1-40.7-14.3c-11.5-5.5-21-11.9-28.3-19.2a79.1,79.1,0,0,1-15.5-23.3c-3.7-8.5-5.5-18-5.5-28.7a64.6,64.6,0,0,1,8.8-33.5,84.8,84.8,0,0,1,23.5-26,111.3,111.3,0,0,1,34-16.8,140.6,140.6,0,0,1,39.7-5.7,174.2,174.2,0,0,1,42,5,171.2,171.2,0,0,1,37.3,14A142.4,142.4,0,0,1,1088,170l-42,47a115.4,115.4,0,0,0-20.2-15.3,119.6,119.6,0,0,0-23.3-10.7,69,69,0,0,0-22-4,58.5,58.5,0,0,0-13.2,1.2,29,29,0,0,0-9.8,4,17.8,17.8,0,0,0-6,6.5,18.9,18.9,0,0,0-2,8.8,17.6,17.6,0,0,0,2.8,9.5,22.1,22.1,0,0,0,7.7,7.5c3.3,2,8.7,4.2,16,6.7s17.3,5.6,30,9.3a253.8,253.8,0,0,1,40.5,14.5c11.3,5.3,20.3,11.7,27,19a57.1,57.1,0,0,1,12,19.7,71.6,71.6,0,0,1,4,24.3c0,17-4.7,32.1-14.2,45.2s-22.6,23.5-39.3,31S1000.3,405.5,979,405.5Z"/>
        <path d="M1181.5,82.5c-15,0-26.7-3.6-35.2-10.8s-12.8-17.4-12.8-30.7,4.3-21.8,13-29.5S1166.8,0,1181.5,0s26.7,3.6,35,10.7S1229,28,1229,41s-4.2,22.3-12.7,30S1196.2,82.5,1181.5,82.5Zm-40,318V135h80V400.5Z"/>
        <path d="M1296.5,400.5V30.5h80v370Zm77-78-29.5-60L1468,135h105.5Zm103,78-93.5-121,56.5-44,131.5,165Z"/>
        <path d="M1696.5,405c-22.3,0-42.3-5.9-59.8-17.8s-31.4-28.1-41.7-49-15.5-44.4-15.5-70.7,5.2-50.8,15.5-71.5,24.5-36.9,42.5-48.8,38.5-17.7,61.5-17.7a102.5,102.5,0,0,1,34.7,5.5,91.8,91.8,0,0,1,27.8,15.2,102.1,102.1,0,0,1,20.5,22.5,95.2,95.2,0,0,1,12.5,27.3l-16.5-2V135h79.5V400.5h-81v-64l18-.5a87.2,87.2,0,0,1-13,26.5,95.7,95.7,0,0,1-22,22,109.4,109.4,0,0,1-29,15A103.1,103.1,0,0,1,1696.5,405Zm22-67.5c12.3,0,23-2.8,32-8.5s16-13.8,21-24.3,7.5-22.9,7.5-37.2-2.5-26.8-7.5-37.3a58.1,58.1,0,0,0-21-24.5c-9-5.8-19.7-8.7-32-8.7s-22.4,2.9-31.3,8.7a59.3,59.3,0,0,0-20.7,24.5c-5,10.5-7.5,23-7.5,37.3s2.5,26.7,7.5,37.2,11.9,18.6,20.7,24.3S1706.5,337.5,1718.5,337.5Z"/>
      </svg>
    </div>

    <div class="flex-1 flex justify-end">
      <button
        @click="handleAvatarClick"
        class="relative w-10 h-10 rounded-full flex items-center justify-center overflow-hidden border-2 transition-all duration-300 group"
        :class="[
          isLoggedIn && activeTab !== 'profil' ? 
            (isPengaturanOpen ? 'border-[var(--color-primary)]' : 'border-[var(--color-outline-variant)] hover:border-[var(--color-primary)]') :
            'border-transparent'
        ]"
        :aria-label="$t('settings')"
      >
        <span 
          class="material-symbols-outlined text-2xl absolute transition-all duration-300"
          :class="isPengaturanOpen 
            ? 'text-[var(--color-primary)] scale-125' 
            : 'text-[var(--color-outline)] group-hover:text-[var(--color-primary)] group-hover:scale-125'"
        >
          settings
        </span>
        
        <Transition
          enter-active-class="transition-all duration-300 ease-in-out delay-100"
          enter-from-class="transform translate-x-full scale-75 opacity-0"
          enter-to-class="transform translate-x-0 scale-100 opacity-100"
          leave-active-class="transition-all duration-300 ease-in-out"
          leave-from-class="transform translate-x-0 scale-100 opacity-100"
          leave-to-class="transform translate-x-full scale-75 opacity-0"
        >
          <div 
            v-if="activeTab !== 'profil'" 
            key="avatar-layer"
            class="absolute inset-0 w-full h-full"
          >
            <div 
              v-if="isLoggedIn"
              class="w-full h-full rounded-full flex items-center justify-center"
            >
              <UserAvatar
                :size="40"
              />
            </div>
            <div v-else
              class="w-full h-full flex items-center justify-center transition-all duration-300"
              :class="isPengaturanOpen
                ? 'bg-[var(--color-surface-container-lowest)] dark:bg-[var(--color-surface-container-high)]'
                : 'bg-[var(--color-surface-container-lowest)] dark:bg-[var(--color-surface-container-high)] group-hover:bg-[var(--color-surface-container-low)] dark:group-hover:bg-[var(--color-surface-container)]'"
            >
              <span
                class="material-symbols-outlined text-2xl transition-all duration-300"
                :class="isPengaturanOpen
                  ? 'text-[var(--color-primary)] scale-125'
                  : 'text-[var(--color-outline)] group-hover:text-[var(--color-primary)] group-hover:scale-125'"
              >
                no_accounts
              </span>
            </div>
          </div>
        </Transition>
      </button>
    </div>
  </header>

  <PilihBahasa 
    :is-open="showLanguagePicker"
    @close="showLanguagePicker = false" 
  />
</template>
