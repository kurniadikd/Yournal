<script setup lang="ts">
import {
  TransitionRoot,
  TransitionChild,
  Dialog,
  DialogPanel,
} from '@headlessui/vue';
import { useUIStore } from '@/stores/ui';
import { storeToRefs } from 'pinia';
import { nextTick, ref, computed } from 'vue';
import { useMouseInElement } from '@vueuse/core';
import { useRouter } from 'vue-router';

const uiStore = useUIStore();
const { isLainnyaOpen } = storeToRefs(uiStore);
const router = useRouter();

// Ref untuk initial focus (memperbaiki FocusTrap warning)
const initialFocusRef = ref<HTMLElement | null>(null);

// --- Deteksi apakah berada di dalam /app ---
const isInsideApp = computed(() => {
  return router.currentRoute.value.path.startsWith('/app');
});

// --- LOGIKA EFEK 3D ---
// Deteksi apakah perangkat adalah touch device
const isTouchDevice = ref(false);
if (typeof window !== 'undefined') {
  isTouchDevice.value =
    'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

const create3DStyle = (mouse: any, isPressed: any) => {
  return computed(() => {
    const MAX_ROTATION = 6;
    // Nonaktifkan efek 3D pada touch device untuk menghindari masalah click detection
    if (isTouchDevice.value || mouse.isOutside.value || !isPressed.value) {
      return {
        transform: 'rotateX(0deg) rotateY(0deg) scale(1) translateZ(0px)',
        transition: 'transform 0.25s ease-out',
      };
    }
    const x =
      (mouse.elementX.value - mouse.elementWidth.value / 2) /
      (mouse.elementWidth.value / 2);
    const y =
      (mouse.elementY.value - mouse.elementHeight.value / 2) /
      (mouse.elementHeight.value / 2);
    const rotateY = x * MAX_ROTATION;
    const rotateX = -y * MAX_ROTATION;
    return {
      transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(0.97) translateZ(-5px)`,
      transition: 'transform 0.1s ease-out',
    };
  });
};

// Refs & state untuk tombol
const goHomeButtonRef = ref<HTMLElement | null>(null);
const isGoHomePressed = ref(false);
const goHomeMouse = useMouseInElement(goHomeButtonRef);
const goHomeStyle = create3DStyle(goHomeMouse, isGoHomePressed);

const masukanButtonRef = ref<HTMLElement | null>(null);
const isMasukanPressed = ref(false);
const masukanMouse = useMouseInElement(masukanButtonRef);
const masukanStyle = create3DStyle(masukanMouse, isMasukanPressed);

const infoAplikasiButtonRef = ref<HTMLElement | null>(null);
const isInfoAplikasiPressed = ref(false);
const infoAplikasiMouse = useMouseInElement(infoAplikasiButtonRef);
const infoAplikasiStyle = create3DStyle(
  infoAplikasiMouse,
  isInfoAplikasiPressed,
);

const handleClose = () => {
  uiStore.closeLainnyaModal();
};

const handleGoHome = () => {
  uiStore.closeLainnyaModal();
  if (isInsideApp.value) {
    router.push('/');
  } else {
    router.push('/app');
    uiStore.setActiveTab('konteks');
  }
};
const handleMasukanClick = () => {
  uiStore.closeLainnyaModal();
  router.push('/contact');
};

const handleInfoAplikasiClick = () => {
  uiStore.closeLainnyaModal();
  nextTick(() => {
    uiStore.openInfoAplikasiModal();
  });
};
</script>

<template>
  <TransitionRoot :show="isLainnyaOpen" as="template">
    <Dialog @close="handleClose" class="relative z-50">
      <TransitionChild
        as="template"
        enter="duration-300 ease-out"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="duration-300 ease-in"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-[var(--color-scrim)]/50" />
      </TransitionChild>
      <div class="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
        <TransitionChild
          as="template"
          enter="duration-300 ease-out"
          enter-from="opacity-0 scale-95"
          enter-to="opacity-100 scale-100"
          leave="duration-300 ease-in"
          leave-from="opacity-100 scale-100"
          leave-to="opacity-0 scale-95"
        >
          <DialogPanel class="modal-box mx-4 w-full max-w-sm rounded-4xl bg-[var(--color-surface-container-high)] p-6 shadow-2xl">
            <div class="relative flex items-center justify-center mb-6">
              <h2 class="text-2xl font-bold text-[var(--color-on-background)]">{{ $t('others') }}</h2>
              <button @click="handleClose" class="absolute right-0 top-0 p-1 text-[var(--color-outline)] hover:text-[var(--color-on-background)] transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <hr class="my-4 border-[var(--color-outline-variant)]" />

            <div class="px-2">
              <div class="space-y-4">
                <button 
                  ref="goHomeButtonRef"
                  @click="handleGoHome" 
                  @mousedown="isGoHomePressed = true"
                  @mouseup="isGoHomePressed = false"
                  @mouseleave="isGoHomePressed = false"
                  @touchstart="isGoHomePressed = true"
                  @touchend="isGoHomePressed = false"
                  @touchcancel="isGoHomePressed = false"
                  :style="goHomeStyle"
                  style="transform-style: preserve-3d"
                  class="w-full group flex items-center space-x-4 p-2 rounded-xl transition-colors hover:bg-[var(--color-surface-container-low)]" >
                  <!-- Ikon dan teks kondisional -->
                  <template v-if="isInsideApp">
                    <span class="material-symbols-outlined text-[var(--color-on-surface-variant)] group-hover:text-[var(--color-control-activated)] transition-colors">home</span>
                    <div class="text-left flex-1">
                      <h3 class="text-xl font-semibold text-[var(--color-on-background)]">{{ $t('home_page') }}</h3>
                    </div>
                  </template>
                  <template v-else>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1018.2 1201" fill="currentColor" class="w-6 h-6 text-[var(--color-on-surface-variant)] group-hover:text-[var(--color-control-activated)] transition-colors">
                      <path d="M1149,619.7q0,247.5,0,495.2c-.2,85.4-39.6,125.4-124.4,125.4q-384.9.5-769.8,0c-82.9-.1-123.8-40.1-123.9-121.7-.1-249.7.5-499.4.1-749.1-.1-50.2,16.5-89.5,63.2-112.2,8-4,18.2-11.2,26.9-3.4,7.1,6.4,1.6,15.6-.9,23.4-11.9,37.6-12.6,76.2-12.5,115.2q.6,343.3.5,686.6c.1,68.7,14.9,83.8,82.2,83.8H989.5c67.4,0,81.9-15,82.1-83.8.1-30.5,0-61,0-91.5-.1-55.1-.1-55.2-53.3-55.2q-235,0-470.2,0c-70.7-.1-84.3-13.9-84.3-85.7q.1-362.1.5-724.1c.1-68.5,14.5-82.9,82.9-83q262.2-.1,524.4.1c60,.1,76.7,16.7,76.8,76.5q.4,251.7.1,503.5Z" transform="translate(-130.9 -39.5)"/>
                    </svg>
                    <div class="text-left flex-1">
                      <h3 class="text-xl font-semibold text-[var(--color-on-background)]">{{ $t('open_app') }}</h3>
                    </div>
                  </template>
                </button>

                <button 
                  ref="masukanButtonRef"
                  @click="handleMasukanClick" 
                  @mousedown="isMasukanPressed = true"
                  @mouseup="isMasukanPressed = false"
                  @mouseleave="isMasukanPressed = false"
                  @touchstart="isMasukanPressed = true"
                  @touchend="isMasukanPressed = false"
                  @touchcancel="isMasukanPressed = false"
                  :style="masukanStyle"
                  style="transform-style: preserve-3d"
                  class="w-full group flex items-center space-x-4 p-2 rounded-xl transition-colors hover:bg-[var(--color-surface-container-low)]" >
                  <span class="material-symbols-outlined text-[var(--color-on-surface-variant)] group-hover:text-[var(--color-control-activated)] transition-colors">feedback</span> <div class="text-left flex-1">
                    <h3 class="text-xl font-semibold text-[var(--color-on-background)]">{{ $t('menu_contact') }}</h3>
                  </div>
                </button>

                <button 
                  ref="infoAplikasiButtonRef"
                  @click="handleInfoAplikasiClick" 
                  @mousedown="isInfoAplikasiPressed = true"
                  @mouseup="isInfoAplikasiPressed = false"
                  @mouseleave="isInfoAplikasiPressed = false"
                  @touchstart="isInfoAplikasiPressed = true"
                  @touchend="isInfoAplikasiPressed = false"
                  @touchcancel="isInfoAplikasiPressed = false"
                  :style="infoAplikasiStyle"
                  style="transform-style: preserve-3d"
                  class="w-full group flex items-center space-x-4 p-2 rounded-xl transition-colors hover:bg-[var(--color-surface-container-low)]" >
                  <span class="material-symbols-outlined text-[var(--color-on-surface-variant)] group-hover:text-[var(--color-control-activated)] transition-colors">info</span> <div class="text-left flex-1">
                    <h3 class="text-xl font-semibold text-[var(--color-on-background)]">{{ $t('app_info') }}</h3>
                  </div>
                </button>
              </div>
            </div>
          </DialogPanel>
        </TransitionChild>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
