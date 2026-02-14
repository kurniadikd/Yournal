<script setup lang="ts">
import {
  TransitionRoot,
  TransitionChild,
  Dialog,
  DialogPanel,
  // DialogTitle diimpor tapi tidak digunakan dalam template utama, ini dipertahankan
  DialogTitle,
} from '@headlessui/vue';
import { computed, nextTick, ref } from 'vue';
import { useMouseInElement } from '@vueuse/core';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';
import { storeToRefs } from 'pinia';

// 1. Impor komponen UserAvatar
import UserAvatar from '@/components/UserAvatar.vue';

const authStore = useAuthStore();
const uiStore = useUIStore();
const router = useRouter();
const { isPengaturanOpen } = storeToRefs(uiStore);

const user = computed(() => authStore.user);

// State untuk modal konfirmasi logout
const isConfirmLogoutDialogOpen = ref(false);

// Ref untuk initial focus (memperbaiki FocusTrap warning)
const initialFocusRef = ref<HTMLElement | null>(null);

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
const akunButtonRef = ref<HTMLElement | null>(null);
const isAkunPressed = ref(false);
const akunMouse = useMouseInElement(akunButtonRef);
const akunStyle = create3DStyle(akunMouse, isAkunPressed);

const personalisasiButtonRef = ref<HTMLElement | null>(null);
const isPersonalisasiPressed = ref(false);
const personalisasiMouse = useMouseInElement(personalisasiButtonRef);
const personalisasiStyle = create3DStyle(
  personalisasiMouse,
  isPersonalisasiPressed,
);

const lainnyaButtonRef = ref<HTMLElement | null>(null);
const isLainnyaPressed = ref(false);
const lainnyaMouse = useMouseInElement(lainnyaButtonRef);
const lainnyaStyle = create3DStyle(lainnyaMouse, isLainnyaPressed);

const handleLoginClick = () => {
  uiStore.closePengaturanModal();
  nextTick(() => {
    router.push('/login');
  });
};

const handleLogout = () => {
  isConfirmLogoutDialogOpen.value = true; // Open confirmation modal
};

const confirmLogout = () => {
  authStore.logout();
  isConfirmLogoutDialogOpen.value = false; // Close confirmation modal
  uiStore.closePengaturanModal(); // Close settings modal after logout
};

const handlePersonalisasiClick = () => {
  uiStore.closePengaturanModal();
  nextTick(() => {
    uiStore.openPersonalisasiModal();
  });
};

const handleAkunClick = () => {
  uiStore.closePengaturanModal();
  nextTick(() => {
    uiStore.openAkunModal();
  });
};

const handleLainnyaClick = () => {
  uiStore.closePengaturanModal();
  nextTick(() => {
    uiStore.openLainnyaModal();
  });
};
</script>

<template>
  <TransitionRoot :show="isPengaturanOpen" as="template">
    <Dialog @close="uiStore.closePengaturanModal()" class="relative z-50">
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
            <!-- Panel Content -->
            <div class="relative flex items-center justify-center mb-6">
              <h2 class="text-2xl font-bold text-[var(--color-on-background)]">{{ $t('settings') }}</h2>
              <button @click="uiStore.closePengaturanModal()" class="absolute right-0 top-0 p-1 text-[var(--color-outline)] hover:text-[var(--color-on-background)] transition-colors">
                <span class="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>

            <hr class="my-4 border-[var(--color-outline-variant)]" />

            <div class="px-2">
                <div
                  v-if="!authStore.isLoggedIn"
                  class="flex items-center space-x-4 rounded-2xl bg-[var(--color-tertiary-container)] px-2 py-4 mb-6"
                >
                  <div class="h-10 w-10 flex-shrink-0 flex items-center justify-center">
                    <span class="material-symbols-outlined text-[var(--color-on-tertiary-container)]">no_accounts</span>
                  </div>
                  <div>
                    <h3 class="font-bold text-[var(--color-on-tertiary-container)]">{{ $t('not_logged_in_title') }}</h3>
                    <p class="font-medium text-[var(--color-on-tertiary-container)]">
                      {{ $t('not_logged_in_message') }}
                    </p>
                    <button
                      @click="handleLoginClick"
                      class="mt-2 inline-flex items-center justify-center rounded-xl bg-[var(--color-tertiary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-tertiary)] transition-colors hover:opacity-90 active:scale-95 active:bg-[var(--color-tertiary-fixed-dim)]"
                    >
                      {{ $t('login') }}
                    </button>
                  </div>
                </div>
                <div v-else class="flex items-center space-x-4 rounded-xl bg-[var(--color-surface-container)] p-4 mb-6">
                  <UserAvatar :size="56" />

                  <div>
                    <h3 class="font-bold text-lg text-[var(--color-on-background)]">
                      {{ authStore.user.first_name }} {{ authStore.user.last_name }}
                    </h3>
                    <p class="text-sm text-[var(--color-on-surface-variant)]">
                      @{{ authStore.user.username }}
                    </p>
                  </div>

                  <button
                    @click="handleLogout"
                    class="ml-auto group flex-shrink-0 p-2 rounded-full transition-colors hover:bg-[var(--color-surface-container)] active:scale-95 active:bg-[var(--color-surface-container-low)]" :aria-label="$t('logout')"
                  >
                    <span class="material-symbols-outlined text-[var(--color-primary)] group-hover:text-[var(--color-error)] transition-colors">logout</span>
                  </button>
                </div>
                <div class="space-y-4">
                  <button
                    ref="akunButtonRef"
                    v-if="authStore.isLoggedIn"
                    @click="handleAkunClick"
                    @mousedown="isAkunPressed = true"
                    @mouseup="isAkunPressed = false"
                    @mouseleave="isAkunPressed = false"
                    @touchstart="isAkunPressed = true"
                    @touchend="isAkunPressed = false"
                    @touchcancel="isAkunPressed = false"
                    class="w-full group block relative" >
                    <div
                      :style="akunStyle"
                      style="transform-style: preserve-3d"
                      class="flex items-center space-x-4 p-2 rounded-xl transition-colors group-hover:bg-[var(--color-surface-container-low)]">
                      <span class="material-symbols-outlined text-[var(--color-on-surface-variant)] group-hover:text-[var(--color-control-activated)] transition-colors">manage_accounts</span>
                      <div class="text-left flex-1">
                        <h3 class="text-xl font-semibold text-[var(--color-on-background)]">{{ $t('account') }}</h3>
                      </div>
                    </div>
                  </button>

                  <button 
                    ref="personalisasiButtonRef"
                    @click="handlePersonalisasiClick" 
                    @mousedown="isPersonalisasiPressed = true"
                    @mouseup="isPersonalisasiPressed = false"
                    @mouseleave="isPersonalisasiPressed = false"
                    @touchstart="isPersonalisasiPressed = true"
                    @touchend="isPersonalisasiPressed = false"
                    @touchcancel="isPersonalisasiPressed = false"
                    class="w-full group block relative" >
                    <div
                      :style="personalisasiStyle"
                      style="transform-style: preserve-3d"
                      class="flex items-center space-x-4 p-2 rounded-xl transition-colors group-hover:bg-[var(--color-surface-container-low)]">
                      <span class="material-symbols-outlined text-[var(--color-on-surface-variant)] group-hover:text-[var(--color-control-activated)] transition-colors">design_services</span>
                      <div class="text-left flex-1">
                        <h3 class="text-xl font-semibold text-[var(--color-on-background)]">{{ $t('personalization') }}</h3>
                      </div>
                    </div>
                  </button>

                  <button 
                    ref="lainnyaButtonRef"
                    @click="handleLainnyaClick" 
                    @mousedown="isLainnyaPressed = true"
                    @mouseup="isLainnyaPressed = false"
                    @mouseleave="isLainnyaPressed = false"
                    @touchstart="isLainnyaPressed = true"
                    @touchend="isLainnyaPressed = false"
                    @touchcancel="isLainnyaPressed = false"
                    class="w-full group block relative" >
                    <div
                      :style="lainnyaStyle"
                      style="transform-style: preserve-3d"
                      class="flex items-center space-x-4 p-2 rounded-xl transition-colors group-hover:bg-[var(--color-surface-container-low)]">
                      <span class="material-symbols-outlined text-[var(--color-on-surface-variant)] group-hover:text-[var(--color-control-activated)] transition-colors">more_horiz</span>
                      <div class="text-left flex-1">
                        <h3 class="text-xl font-semibold text-[var(--color-on-background)]">{{ $t('others') }}</h3>
                      </div>
                    </div>
                  </button>

                  <div v-if="authStore.isAdmin">
                    <hr class="my-4 border-[var(--color-outline-variant)]" />
                    <div class="flex items-center justify-between p-2">
                      <div class="flex items-center space-x-4">
                        <span class="material-symbols-outlined text-[var(--color-on-surface-variant)]">palette</span> <h3 class="text-lg font-semibold text-[var(--color-on-background)]">{{ $t('color_palette') }}</h3>
                      </div>
                      <div
                        class="md-switch group relative inline-flex items-center flex-shrink-0"
                        :class="{ 'selected': uiStore.isColorPaletteOpen }"
                        @click="uiStore.toggleColorPalette()"
                        role="switch"
                        :aria-checked="uiStore.isColorPaletteOpen"
                        aria-label="Toggle Color Palette"
                        tabindex="0"
                        @keydown.space.prevent="uiStore.toggleColorPalette()"
                        @keydown.enter.prevent="uiStore.toggleColorPalette()"
                      >
                        <div
                            class="track h-[32px] w-[52px] rounded-full border-2 transition-colors duration-200 ease-in-out cursor-pointer relative"
                            :class="[
                                uiStore.isColorPaletteOpen
                                ? 'bg-[var(--color-primary)] border-[var(--color-primary)] group-hover:bg-[var(--color-primary-fixed-dim)]'
                                : 'bg-[var(--color-surface-container-highest)] border-[var(--color-outline)] group-hover:bg-[var(--color-surface-container-high)] group-hover:border-[var(--color-outline)]'
                            ]"
                        >
                            <div class="handle-container absolute top-0 left-0 h-full w-full pointer-events-none">
                                <div
                                    class="handle absolute top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)] shadow-sm"
                                    :class="[
                                        uiStore.isColorPaletteOpen
                                            ? 'h-[24px] w-[24px] bg-[var(--color-on-primary)] left-[calc(100%-24px-4px)]' 
                                            : 'h-[16px] w-[16px] bg-[var(--color-outline)] left-[6px] group-hover:bg-[var(--color-on-surface-variant)]',
                                        'group-active:h-[28px] group-active:w-[28px]',
                                        uiStore.isColorPaletteOpen ? 'group-active:left-[calc(100%-28px-2px)]' : 'group-active:left-[2px]'
                                    ]"
                                >
                                    <svg v-if="uiStore.isColorPaletteOpen" xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 -960 960 960" width="16" class="fill-[var(--color-primary)] opacity-100"><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/></svg>
                                    <svg v-if="!uiStore.isColorPaletteOpen" xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 -960 960 960" width="16" class="fill-[var(--color-surface-container-highest)] opacity-100"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>
                                </div>
                            </div>
                        </div>
                      </div>
                    </div>
                    <!-- AI Log Toggle -->
                    <div class="flex items-center justify-between p-2">
                      <div class="flex items-center space-x-4">
                        <span class="material-symbols-outlined text-[var(--color-on-surface-variant)]">terminal</span> <h3 class="text-lg font-semibold text-[var(--color-on-background)]">AI Log</h3>
                      </div>
                      <div
                        class="md-switch group relative inline-flex items-center flex-shrink-0"
                        :class="{ 'selected': uiStore.isAiLogOpen }"
                        @click="uiStore.toggleAiLog()"
                        role="switch"
                        :aria-checked="uiStore.isAiLogOpen"
                        aria-label="Toggle AI Log"
                        tabindex="0"
                        @keydown.space.prevent="uiStore.toggleAiLog()"
                        @keydown.enter.prevent="uiStore.toggleAiLog()"
                      >
                        <div
                            class="track h-[32px] w-[52px] rounded-full border-2 transition-colors duration-200 ease-in-out cursor-pointer relative"
                            :class="[
                                uiStore.isAiLogOpen
                                ? 'bg-[var(--color-primary)] border-[var(--color-primary)] group-hover:bg-[var(--color-primary-fixed-dim)]'
                                : 'bg-[var(--color-surface-container-highest)] border-[var(--color-outline)] group-hover:bg-[var(--color-surface-container-high)] group-hover:border-[var(--color-outline)]'
                            ]"
                        >
                            <div class="handle-container absolute top-0 left-0 h-full w-full pointer-events-none">
                                <div
                                    class="handle absolute top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)] shadow-sm"
                                    :class="[
                                        uiStore.isAiLogOpen
                                            ? 'h-[24px] w-[24px] bg-[var(--color-on-primary)] left-[calc(100%-24px-4px)]' 
                                            : 'h-[16px] w-[16px] bg-[var(--color-outline)] left-[6px] group-hover:bg-[var(--color-on-surface-variant)]',
                                        'group-active:h-[28px] group-active:w-[28px]',
                                        uiStore.isAiLogOpen ? 'group-active:left-[calc(100%-28px-2px)]' : 'group-active:left-[2px]'
                                    ]"
                                >
                                    <svg v-if="uiStore.isAiLogOpen" xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 -960 960 960" width="16" class="fill-[var(--color-primary)] opacity-100"><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/></svg>
                                    <svg v-if="!uiStore.isAiLogOpen" xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 -960 960 960" width="16" class="fill-[var(--color-surface-container-highest)] opacity-100"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>
                                </div>
                            </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <TransitionRoot :show="isConfirmLogoutDialogOpen" as="template">
                <Dialog @close="isConfirmLogoutDialogOpen = false" class="relative z-70">
                  <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100" leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
                    <div class="fixed inset-0 bg-black/60" />
                  </TransitionChild>
                  <div class="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
                    <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95">
                      <DialogPanel class="w-full max-w-sm transform overflow-hidden rounded-3xl bg-[var(--color-surface-container-high)] p-6 text-center align-middle shadow-xl transition-all">
                        <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-error-container)]">
                          <span class="material-symbols-outlined text-4xl text-[var(--color-on-error-container)]">logout</span>
                        </div>
                        <DialogTitle as="h3" class="mt-4 text-2xl font-bold text-[var(--color-on-background)]">{{ $t('confirm_logout') }}</DialogTitle>
                        <p class="mt-2 text-sm text-[var(--color-on-surface-variant)]">{{ $t('confirm_logout_desc') }}</p>
                        <div class="mt-6 grid grid-cols-2 gap-3">
                          <button type="button" @click="isConfirmLogoutDialogOpen = false" class="w-full rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] px-4 py-2 font-semibold text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-surface-container-low)]">{{ $t('cancel') }}</button>
                          <button @click="confirmLogout" class="w-full rounded-xl bg-[var(--color-error)] px-4 py-2 font-semibold text-[var(--color-on-error)] transition-colors hover:bg-[var(--color-error-container)]">{{ $t('yes_logout') }}</button>
                        </div>
                      </DialogPanel>
                    </TransitionChild>
                  </div>
                </Dialog>
              </TransitionRoot>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </TransitionRoot>
</template>
