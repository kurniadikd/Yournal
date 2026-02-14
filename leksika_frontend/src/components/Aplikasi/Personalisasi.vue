<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useSettingsStore } from '@/stores/settings';
import { useThemeStore } from '@/stores/themes';
import { useUIStore } from '@/stores/ui';
import { useAuthStore } from '@/stores/auth';
import { onClickOutside } from '@vueuse/core';
import {
  TransitionRoot,
  TransitionChild,
  Dialog,
  DialogPanel,
  DialogTitle,
} from '@headlessui/vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

// === Stores ===
const settingsStore = useSettingsStore();
const themeStore = useThemeStore();
const uiStore = useUIStore();
const authStore = useAuthStore();

const {
  uiTheme,
  showVirtualKeyboard,
  hideNativeKeyboard,
  selectedFont,
  availableFonts,
} = storeToRefs(settingsStore);
const { activeSeedColor, activeStyle } = storeToRefs(themeStore);
const { isPersonalisasiOpen } = storeToRefs(uiStore);
const { user } = storeToRefs(authStore);

// === State & Logic Color Picker ===
const isColorPickerModalOpen = ref(false);
const tempHexColor = ref('#AC0087');
const tempHue = ref<string | number>(0);
const originalSeedColor = ref(''); // Store original color for cancellation

// Throttled update to prevent locking the UI (32ms ~ 30fps)
import { useThrottleFn } from '@vueuse/core';

const throttledUpdateTheme = useThrottleFn((hex: string) => {
    themeStore.generateThemeFromSeed(hex);
}, 32);

// Logic Modal Color Picker
const openColorPicker = () => {
  originalSeedColor.value = activeSeedColor.value; // Save current state
  tempHexColor.value = activeSeedColor.value;
  isColorPickerModalOpen.value = true;
};

const cancelColorPicker = () => {
    // Revert to original color
    themeStore.generateThemeFromSeed(originalSeedColor.value);
    isColorPickerModalOpen.value = false;
};

// Apply is just closing (since we are live updating)
const applyCustomColor = () => {
  // Ensure final value is applied
  themeStore.generateThemeFromSeed(tempHexColor.value);
  isColorPickerModalOpen.value = false;
};

const updateColorFromSlider = (e: Event) => {
  const hue = (e.target as HTMLInputElement).value;
  tempHue.value = hue;
  const hex = hslToHex(Number(hue), 100, 50);
  tempHexColor.value = hex;
  
  // Live Update!
  throttledUpdateTheme(hex);
};
// === Dropdown Font ===
const isFontDropdownOpen = ref(false);
const fontDropdownContainer = ref<HTMLElement | null>(null);

const selectNewFont = (fontName: string) => {
  settingsStore.setSelectedFont(fontName);
  isFontDropdownOpen.value = false;
};

onClickOutside(fontDropdownContainer, () => {
  isFontDropdownOpen.value = false;
});

// === Data Options ===
const themeOptions = [
  { value: 'light', label: t('light') },
  { value: 'dark', label: t('dark') },
  { value: 'system', label: t('system') },
];

const styleOptions = computed(() => [
  { value: 'expressive', label: t('style_expressive') },
  { value: 'tonal-spot', label: t('style_tonal_spot') },
  { value: 'vibrant', label: t('style_vibrant') },
  { value: 'neutral', label: t('style_neutral') },
]);

const themes = computed(() => Object.values(themeStore.themes));

// ========================================================================
// LOGIC AVATAR DYNAMIC COLOR
// ========================================================================

const userAvatarSrc = computed(() => {
  const profile = user.value?.profile;
  if (profile?.avatar_base64 && profile?.avatar_mimetype) {
    return `data:${profile.avatar_mimetype};base64,${profile.avatar_base64}`;
  }
  return user.value?.avatar || null;
});

const avatarThemeColor = ref<string | null>(null);

/**
 * Mengambil warna dominan dari avatar.
 * Menggunakan action dari themeStore yang sudah menangani
 * loading library MaterialKolorJS secara asinkron.
 */
const processAvatarColor = async (src: string) => {
  if (!src) return null;
  try {
    return (await themeStore.extractColorFromImage(src)) as string | null;
  } catch (error) {
    console.warn('Gagal memproses warna avatar:', error);
    return null;
  }
};

// Pantau perubahan src avatar (misal saat login/load awal)
watch(
  userAvatarSrc,
  async (newSrc) => {
    if (newSrc) {
      // Tunggu sebentar untuk memastikan browser idle, lalu proses
      avatarThemeColor.value = await processAvatarColor(newSrc);
    }
  },
  { immediate: true },
);

// ========================================================================
// COMPUTED STATES & HANDLERS
// ========================================================================

const currentHex = computed(() => activeSeedColor.value.toLowerCase());

// Cek apakah tema saat ini berasal dari Preset
const isPresetActive = (color: string) => currentHex.value === color.toLowerCase();

// Cek apakah tema saat ini berasal dari Avatar
const isAvatarActive = computed(() => {
  if (!avatarThemeColor.value) return false;
  return currentHex.value === avatarThemeColor.value.toLowerCase();
});

// Cek apakah tema saat ini Custom (bukan preset & bukan avatar)
const isCustomActive = computed(() => {
  const isPreset = themes.value.some(
    (t: any) => t.color.toLowerCase() === currentHex.value,
  );
  return !isPreset && !isAvatarActive.value;
});

// Handler Klik
const handlePresetClick = (color: string) => themeStore.generateThemeFromSeed(color);

const handleAvatarClick = () => {
  if (avatarThemeColor.value) {
    themeStore.generateThemeFromSeed(avatarThemeColor.value);
  }
};


// Logic for color picker moved to top with Live Preview

// Helper lokal untuk slider UI

// Helper lokal untuk slider UI
function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

const handleHexInput = (e: Event) => {
  let val = (e.target as HTMLInputElement).value;
  if (!val.startsWith('#')) val = '#' + val;
  tempHexColor.value = val;
};

// Styling Uniformity
const baseBtnClass =
  'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 border border-black/10 overflow-hidden relative group';
const activeBtnClass =
  'scale-110 ring-2 ring-offset-2 ring-[var(--color-primary)] dark:ring-offset-[var(--color-surface-container-low)]';
const inactiveBtnClass = 'hover:scale-110 opacity-90 hover:opacity-100';
</script>

<template>
  <Teleport to="body">
  <TransitionRoot :show="isPersonalisasiOpen" as="template">
    <Dialog @close="uiStore.closePersonalisasiModal()" class="relative z-50">
      
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
          <DialogPanel tabindex="-1" class="modal-box mx-4 w-full max-w-sm rounded-4xl bg-[var(--color-surface-container-high)] p-6 flex flex-col max-h-[90vh]">
            
            <div class="relative flex items-center justify-center mb-6 shrink-0">
              <h2 class="text-2xl font-bold text-[var(--color-on-background)]">{{ $t('personalization') }}</h2>
              <button @click="uiStore.closePersonalisasiModal()" class="absolute right-0 top-0 p-1 text-[var(--color-outline)] hover:text-[var(--color-on-background)] transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <hr class="my-4 border-[var(--color-outline-variant)] shrink-0" />

            <div class="px-2 overflow-y-auto custom-scrollbar space-y-6">
              
              <section>
                <h3 class="text-lg font-bold mb-4 text-[var(--color-on-background)]">{{ $t('view_mode') }}</h3>
                <div class="flex space-x-2 bg-[var(--color-surface-container)] p-1 rounded-2xl">
                  <button v-for="option in themeOptions" :key="option.value" @click="settingsStore.setUiTheme(option.value)" :class="uiTheme === option.value ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]' : 'text-[var(--color-on-background)] hover:bg-[var(--color-surface-container-high)]'" class="flex-1 py-1.5 rounded-xl font-medium transition-all duration-200 text-sm">
                    {{ option.label }}
                  </button>
                </div>
              </section>

              <section>
                <h3 class="text-lg font-bold mb-4 text-[var(--color-on-background)]">{{ $t('color_style') }}</h3>
                <div class="grid grid-cols-2 gap-3">
                  <button v-for="style in styleOptions" :key="style.value" @click="themeStore.setThemeStyle(style.value)" :class="activeStyle === style.value ? 'bg-[var(--color-tertiary)] text-[var(--color-on-tertiary)] ring-2 ring-[var(--color-tertiary-container)]' : 'bg-[var(--color-surface-container)] text-[var(--color-on-background)] hover:bg-[var(--color-surface-container-highest)]'" class="py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center">
                    <span class="text-sm font-bold">{{ style.label }}</span>
                  </button>
                </div>
              </section>

              <section>
                <h3 class="text-lg font-bold mb-4 text-[var(--color-on-background)]">{{ $t('base_color') }}</h3>
                
                <div class="flex flex-wrap justify-center gap-4">
                  <!-- Preset Theme Colors -->
                  <button v-for="th in themes" :key="th.name" @click="handlePresetClick(th.color)" :class="[baseBtnClass, isPresetActive(th.color) ? activeBtnClass : inactiveBtnClass]" :style="{ backgroundColor: th.color }" :aria-label="`Pilih tema ${th.name}`">
                    <span v-if="isPresetActive(th.color)" class="material-symbols-outlined text-[var(--color-primary)] text-base font-bold" style="-webkit-text-stroke: 3px var(--color-surface-container-high); paint-order: stroke fill;">check</span>
                  </button>

                  <!-- Avatar Color -->
                  <button v-if="userAvatarSrc" @click="handleAvatarClick" :class="[baseBtnClass, isAvatarActive ? activeBtnClass : inactiveBtnClass]" title="Warna Foto Profil">
                    <img :src="userAvatarSrc" alt="Avatar" class="w-full h-full object-cover" />
                    <div v-if="isAvatarActive" class="absolute inset-0 flex items-center justify-center rounded-full">
                      <span class="material-symbols-outlined text-[var(--color-primary)] text-base font-bold" style="-webkit-text-stroke: 3px var(--color-surface-container-high); paint-order: stroke fill;">check</span>
                    </div>
                  </button>

                  <!-- Custom Color Picker -->
                  <button @click="openColorPicker" :class="[baseBtnClass, '!border-0', isCustomActive ? activeBtnClass : inactiveBtnClass, !isCustomActive ? 'bg-conic-rainbow' : '']" :style="isCustomActive ? { backgroundColor: activeSeedColor } : {}" title="Pilih warna bebas">
                    <span v-if="!isCustomActive" class="material-symbols-outlined text-[var(--color-white)] text-lg font-bold">colorize</span>
                    <span v-else class="material-symbols-outlined text-[var(--color-primary)] text-base font-bold" style="-webkit-text-stroke: 3px var(--color-surface-container-high); paint-order: stroke fill;">check</span>
                  </button>
                </div>
              </section>

              <section>
                <h3 class="text-lg font-bold mb-4 text-[var(--color-on-background)]">{{ $t('font_style') }}</h3>
                <div ref="fontDropdownContainer" class="relative">
                  <button @click="isFontDropdownOpen = !isFontDropdownOpen" class="w-full text-left p-3 border border-[var(--color-outline)] rounded-2xl bg-[var(--color-surface-container)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] flex justify-between items-center transition" :style="{ color: 'var(--color-on-background)' }">
                    <span>{{ selectedFont }}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 transition-transform duration-200" :class="{ 'rotate-180': isFontDropdownOpen }" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
                  </button>
                  <div v-if="isFontDropdownOpen" class="absolute z-10 mt-2 w-full bg-[var(--color-surface-container)] border border-[var(--color-outline)] rounded-2xl py-1 max-h-40 overflow-y-auto">
                    <ul :style="{ color: 'var(--color-on-background)' }">
                      <li v-for="font in availableFonts" :key="font.name" @click="selectNewFont(font.name)" class="px-4 py-2 hover:bg-[var(--color-primary)] hover:text-[var(--color-on-primary)] cursor-pointer transition-colors duration-150" :class="{ 'bg-[var(--color-primary)] text-[var(--color-on-primary)]': font.name === selectedFont }" :style="{ fontFamily: font.family }">
                        {{ font.name }}
                      </li>
                    </ul>
                  </div>
                </div>
              </section>
              
              <section>
                <div class="flex items-center justify-between">
                  <span class="text-lg font-bold text-[var(--color-on-background)]">{{ $t('virtual_keyboard') }}</span>
                  <div
                    class="md-switch group relative inline-flex items-center flex-shrink-0"
                    :class="{ 'selected': showVirtualKeyboard }"
                    @click="settingsStore.toggleVirtualKeyboard(!showVirtualKeyboard)"
                    role="switch"
                    :aria-checked="showVirtualKeyboard"
                    aria-label="Tampilkan keyboard aksara Rusia"
                    tabindex="0"
                    @keydown.space.prevent="settingsStore.toggleVirtualKeyboard(!showVirtualKeyboard)"
                    @keydown.enter.prevent="settingsStore.toggleVirtualKeyboard(!showVirtualKeyboard)"
                  >
                    <div
                        class="track h-[32px] w-[52px] rounded-full border-2 transition-colors duration-200 ease-in-out cursor-pointer relative"
                        :class="[
                            showVirtualKeyboard
                            ? 'bg-[var(--color-primary)] border-[var(--color-primary)] group-hover:bg-[var(--color-primary-fixed-dim)]'
                            : 'bg-[var(--color-surface-container-highest)] border-[var(--color-outline)] group-hover:bg-[var(--color-surface-container-high)] group-hover:border-[var(--color-outline)]'
                        ]"
                    >
                        <div class="handle-container absolute top-0 left-0 h-full w-full pointer-events-none">
                            <div
                                class="handle absolute top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)]"
                                :class="[
                                    showVirtualKeyboard
                                        ? 'h-[24px] w-[24px] bg-[var(--color-on-primary)] left-[calc(100%-24px-4px)]' 
                                        : 'h-[16px] w-[16px] bg-[var(--color-outline)] left-[6px] group-hover:bg-[var(--color-on-surface-variant)]',
                                    'group-active:h-[28px] group-active:w-[28px]',
                                    showVirtualKeyboard ? 'group-active:left-[calc(100%-28px-2px)]' : 'group-active:left-[2px]'
                                ]"
                            >
                                <svg v-if="showVirtualKeyboard" xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 -960 960 960" width="16" class="fill-[var(--color-primary)] opacity-100"><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/></svg>
                                <svg v-if="!showVirtualKeyboard" xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 -960 960 960" width="16" class="fill-[var(--color-surface-container-highest)] opacity-100"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>
                            </div>
                        </div>
                    </div>
                  </div>
                </div>
                
                <Transition
                  enter-active-class="transition-all duration-300 ease-out"
                  leave-active-class="transition-all duration-200 ease-in"
                  enter-from-class="opacity-0 max-h-0"
                  enter-to-class="opacity-100 max-h-24"
                  leave-from-class="opacity-100 max-h-24"
                  leave-to-class="opacity-0 max-h-0"
                >
                  <div v-if="showVirtualKeyboard" class="overflow-hidden mt-3 pl-4 border-l-2 border-[var(--color-primary)]/30">
                    <div class="flex items-center justify-between py-2">
                      <div class="flex flex-col">
                        <span class="text-sm font-medium text-[var(--color-on-background)]">{{ $t('hide_native_keyboard') }}</span>
                        <span class="text-xs text-[var(--color-on-surface-variant)]">{{ $t('hide_native_keyboard_desc') }}</span>
                      </div>
                      <div
                        class="md-switch group relative inline-flex items-center flex-shrink-0"
                        :class="{ 'selected': hideNativeKeyboard }"
                        @click="settingsStore.toggleHideNativeKeyboard(!hideNativeKeyboard)"
                        role="switch"
                        :aria-checked="hideNativeKeyboard"
                        aria-label="Sembunyikan keyboard bawaan perangkat"
                        tabindex="0"
                        @keydown.space.prevent="settingsStore.toggleHideNativeKeyboard(!hideNativeKeyboard)"
                        @keydown.enter.prevent="settingsStore.toggleHideNativeKeyboard(!hideNativeKeyboard)"
                      >
                        <div
                            class="track h-[32px] w-[52px] rounded-full border-2 transition-colors duration-200 ease-in-out cursor-pointer relative"
                            :class="[
                                hideNativeKeyboard
                                ? 'bg-[var(--color-primary)] border-[var(--color-primary)] group-hover:bg-[var(--color-primary-fixed-dim)]'
                                : 'bg-[var(--color-surface-container-highest)] border-[var(--color-outline)] group-hover:bg-[var(--color-surface-container-high)] group-hover:border-[var(--color-outline)]'
                            ]"
                        >
                            <div class="handle-container absolute top-0 left-0 h-full w-full pointer-events-none">
                                <div
                                    class="handle absolute top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)]"
                                    :class="[
                                        hideNativeKeyboard
                                            ? 'h-[24px] w-[24px] bg-[var(--color-on-primary)] left-[calc(100%-24px-4px)]' 
                                            : 'h-[16px] w-[16px] bg-[var(--color-outline)] left-[6px] group-hover:bg-[var(--color-on-surface-variant)]',
                                        'group-active:h-[28px] group-active:w-[28px]',
                                        hideNativeKeyboard ? 'group-active:left-[calc(100%-28px-2px)]' : 'group-active:left-[2px]'
                                    ]"
                                >
                                    <svg v-if="hideNativeKeyboard" xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 -960 960 960" width="16" class="fill-[var(--color-primary)] opacity-100"><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/></svg>
                                    <svg v-if="!hideNativeKeyboard" xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 -960 960 960" width="16" class="fill-[var(--color-surface-container-highest)] opacity-100"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>
                                </div>
                            </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Transition>
              </section>




            </div>

            <TransitionRoot :show="isColorPickerModalOpen" as="template">
              <Dialog @close="isColorPickerModalOpen = false" class="relative z-[60]">
                
                <TransitionChild 
                  as="template" 
                  enter="duration-300 ease-out" 
                  enter-from="opacity-0" 
                  enter-to="opacity-100" 
                  leave="duration-200 ease-in" 
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
                    leave="duration-200 ease-in" 
                    leave-from="opacity-100 scale-100" 
                    leave-to="opacity-0 scale-95"
                  >
                    <DialogPanel class="w-full max-w-xs rounded-4xl bg-[var(--color-surface-container-high)] p-6 flex flex-col gap-6 ring-1 ring-[var(--color-outline-variant)]">
                      
                      <div class="text-center">
                        <DialogTitle class="text-xl font-bold text-[var(--color-on-background)]">{{ $t('pick_color') }}</DialogTitle>
                        <p class="text-xs text-[var(--color-on-surface-variant)] mt-1">{{ $t('adjust_base_color') }}</p>
                      </div>

                      <div class="flex justify-center">
                        <div class="w-24 h-24 rounded-full border-4 border-[var(--color-surface-container-low)] flex items-center justify-center transition-colors duration-200" :style="{ backgroundColor: tempHexColor }">
                          <span class="material-symbols-outlined text-[var(--color-white)]/80 text-3xl">palette</span>
                        </div>
                      </div>

                      <div class="space-y-4">
                        <div class="space-y-2">
                          <label class="text-xs font-bold text-[var(--color-on-surface-variant)] ml-1">{{ $t('hue') }}</label>
                          <input type="range" min="0" max="360" v-model="tempHue" @input="updateColorFromSlider" class="w-full h-4 rounded-full appearance-none cursor-pointer border border-[var(--color-white)]/20 hue-slider-bg" />
                        </div>
                        <div class="space-y-2">
                          <label class="text-xs font-bold text-[var(--color-on-surface-variant)] ml-1">{{ $t('hex_code') }}</label>
                          <div class="flex items-center bg-[var(--color-surface-container)] rounded-xl px-3 py-2 border border-[var(--color-outline)] focus-within:ring-2 focus-within:ring-[var(--color-primary)] focus-within:border-[var(--color-primary)] transition-all">
                            <span class="text-[var(--color-on-surface-variant)] mr-2 select-none">#</span>
                            <input type="text" :value="tempHexColor.replace('#', '')" @input="handleHexInput" maxlength="6" class="bg-transparent border-none focus:ring-0 text-[var(--color-on-surface)] w-full font-mono uppercase tracking-wider text-sm" />
                          </div>
                        </div>
                      </div>

                      <div class="grid grid-cols-2 gap-3 pt-2">
                        <button @click="cancelColorPicker" class="py-3 rounded-xl font-bold text-sm bg-[var(--color-surface-container)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-highest)] transition-colors">{{ $t('cancel') }}</button>
                        <button @click="applyCustomColor" class="py-3 rounded-xl font-bold text-sm bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:brightness-110 transition-all">{{ $t('apply') }}</button>
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
  </Teleport>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: var(--color-outline-variant); border-radius: 20px; }

.bg-conic-rainbow {
  background: conic-gradient(from 0deg,
    var(--color-spectrum-red),
    var(--color-spectrum-yellow),
    var(--color-spectrum-green),
    var(--color-spectrum-cyan),
    var(--color-spectrum-blue),
    var(--color-spectrum-magenta),
    var(--color-spectrum-red)
  );
}

.hue-slider-bg {
  background: linear-gradient(to right,
    var(--color-spectrum-red) 0%,
    var(--color-spectrum-yellow) 17%,
    var(--color-spectrum-green) 33%,
    var(--color-spectrum-cyan) 50%,
    var(--color-spectrum-blue) 67%,
    var(--color-spectrum-magenta) 83%,
    var(--color-spectrum-red) 100%
  );
}

/* Slider Thumb Custom */
input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none;
  height: 20px;
  width: 20px;
  border-radius: 50%;
  background: var(--color-white);
  cursor: pointer;
  border: 2px solid color-mix(in srgb, var(--color-black), transparent 90%);
  margin-top: -2px;
}
</style>
