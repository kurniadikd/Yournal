<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useDraggable, useWindowSize, useClipboard, useStorage } from '@vueuse/core';
import { useSettingsStore } from '@/stores/settings';
import { useThemeStore } from '@/stores/themes';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import { storeToRefs } from 'pinia';

const emit = defineEmits(['close']);

// --- Stores ---
const settingsStore = useSettingsStore();
const themeStore = useThemeStore();
const { effectiveTheme } = storeToRefs(settingsStore);
const { activeSeedColor, activeStyle } = storeToRefs(themeStore); // Watch perubahan ini

// --- Draggable state (Adopted from VirtualKeyboard) ---
const paletteRef = ref<HTMLElement | null>(null);
const dragHandleRef = ref<HTMLElement | null>(null);
const { width: windowWidth, height: windowHeight } = useWindowSize();

const position = useStorage('palet-warna-position', { 
    x: windowWidth.value - 400, 
    y: 100 
});

const { x, y, isDragging } = useDraggable(paletteRef, {
  initialValue: position.value,
  handle: dragHandleRef,
  preventDefault: true,
  onEnd: () => {
    // Clamp position on drag end to keep within window bounds
    if (!paletteRef.value) return;
    const rect = paletteRef.value.getBoundingClientRect();
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    
    // Clamp X
    if (x.value < 0) x.value = 0;
    else if (x.value + rect.width > winW) x.value = winW - rect.width;
    
    // Clamp Y
    if (y.value < 0) y.value = 0;
    else if (y.value + rect.height > winH) y.value = winH - rect.height;

    // Sync storage
    position.value = { x: x.value, y: y.value };
  },
});

const paletteStyle = computed(() => ({
  transform: `translate(${x.value}px, ${y.value}px)`,
}));

// --- Daftar Nama Variabel (Source of Truth) ---
const colorVariableNames = [
  '--color-seed',
  '--color-primary',
  '--color-on-primary',
  '--color-primary-container',
  '--color-on-primary-container',
  '--color-inverse-primary',
  '--color-secondary',
  '--color-on-secondary',
  '--color-secondary-container',
  '--color-on-secondary-container',
  '--color-tertiary',
  '--color-on-tertiary',
  '--color-tertiary-container',
  '--color-on-tertiary-container',
  '--color-background',
  '--color-on-background',
  '--color-surface',
  '--color-on-surface',
  '--color-surface-variant',
  '--color-on-surface-variant',
  '--color-surface-tint',
  '--color-inverse-surface',
  '--color-inverse-on-surface',
  '--color-error',
  '--color-on-error',
  '--color-error-container',
  '--color-on-error-container',
  '--color-success',
  '--color-on-success',
  '--color-success-container',
  '--color-on-success-container',
  '--color-outline',
  '--color-outline-variant',
  '--color-scrim',
  '--color-surface-bright',
  '--color-surface-container',
  '--color-surface-container-high',
  '--color-surface-container-highest',
  '--color-surface-container-low',
  '--color-surface-container-lowest',
  '--color-surface-dim',
  '--color-primary-fixed',
  '--color-primary-fixed-dim',
  '--color-on-primary-fixed',
  '--color-on-primary-fixed-variant',
  '--color-secondary-fixed',
  '--color-secondary-fixed-dim',
  '--color-on-secondary-fixed',
  '--color-on-secondary-fixed-variant',
  '--color-tertiary-fixed',
  '--color-tertiary-fixed-dim',
  '--color-on-tertiary-fixed',
  '--color-on-tertiary-fixed-variant',
];

interface ColorEntry {
  name: string;
  light: { name: string; value: string };
  dark: { name: string; value: string };
}

const comparisonColors = ref<ColorEntry[]>([]);
const isLoading = ref(true);
let observer: MutationObserver | null = null;

// --- FUNGSI REFRESH WARNA (DIPISAHKAN AGAR BISA DIPANGGIL ULANG) ---
const refreshColors = () => {
  try {
    // console.log("🔄 PaletWarna: Refreshing colors...");

    // Kita perlu "mengintip" nilai computed style aktual
    // Namun, variabel CSS dinamis biasanya ada di element.style (inline) atau computed
    const docEl = document.documentElement;
    const computedStyles = getComputedStyle(docEl);
    
    // NOTE: Karena kita tidak bisa dengan mudah memaksa browser render ulang light/dark
    // dalam satu frame untuk dibaca getComputedStyle tanpa flash,
    // kita akan membaca nilai aktual yang sedang aktif saja,
    // atau mencoba simulasi manual jika memungkinkan.
    // TAPI, strategi paling aman & akurat untuk "Realtime Debug" adalah
    // membaca nilai yang tersimpan di ThemeStore (jika ada), atau membaca CSS Var saat ini.

    // Strategi di sini: Kita baca nilai CSS Variable saat ini.
    // Untuk Light vs Dark, karena ini debug panel, kita hanya bisa menampilkan nilai REALTIME
    // yang sedang aktif di browser.
    // *Kecuali* kita punya akses ke raw palette data dari ThemeStore (which we do!).

    // SOLUSI TERBAIK: Ambil data dari ThemeStore.generatedPalettes jika ada
    const generated = themeStore.generatedPalettes;

    const populatedColors: ColorEntry[] = [];

    if (generated && generated.light && generated.dark) {
      // Jika data generator tersedia (akurat & realtime dari logic JS)
      for (const name of colorVariableNames) {
        populatedColors.push({
          name: name,
          light: { name: name, value: generated.light[name] || '#??????' },
          dark: { name: name, value: generated.dark[name] || '#??????' },
        });
      }
    } else {
      // Fallback: Baca dari Computed Style (Hanya akan akurat untuk mode yang sedang aktif)
      // Ini terjadi jika Hardcoded Mode aktif atau belum generate.
      for (const name of colorVariableNames) {
        const val = computedStyles.getPropertyValue(name).trim();
        populatedColors.push({
          name: name,
          light: { name: name, value: val }, // Tidak bisa bedakan light/dark tanpa store
          dark: { name: name, value: val },
        });
      }
    }

    comparisonColors.value = populatedColors;
    isLoading.value = false;
  } catch (error) {
    console.error('Gagal membaca palet warna:', error);
    isLoading.value = false;
  }
};

const ensureInBounds = () => {
    // Beri waktu sejenak agar element dirender & ukurannya diketahui
    nextTick(() => {
        if (!paletteRef.value) return;
        const rect = paletteRef.value.getBoundingClientRect();
        const winW = window.innerWidth;
        const winH = window.innerHeight;

        let needsAdjustment = false;
        let newX = x.value;
        let newY = y.value;

        // Reset jika koordinat benar-benar di luar atau ukuran window mengecil drastis
        if (newX < 0 || newX + 20 > winW) {
            newX = winW - rect.width - 20;
            needsAdjustment = true;
        }
        if (newY < 0 || newY + 20 > winH) {
            newY = 100;
            needsAdjustment = true;
        }

        if (needsAdjustment) {
            console.log("🎨 PaletWarna: Resetting off-screen position", { x: newX, y: newY });
            x.value = Math.max(10, newX);
            y.value = Math.max(10, newY);
            position.value = { x: x.value, y: y.value };
        }
    });
};

// --- LIFECYCLE & WATCHERS ---

onMounted(() => {
  refreshColors();
  ensureInBounds();

  // 1. Watch Perubahan Store (Seed, Style, HardcodedMode)
  // Ini menangkap perubahan dari modal Personalisasi
  watch(
    [activeSeedColor, activeStyle, () => themeStore.isHardcodedMode],
    () => {
      // Beri sedikit delay agar themeGenerator selesai memproses
      setTimeout(refreshColors, 50);
    },
  );

  // 2. Watch Perubahan generatedPalettes langsung (Paling akurat)
  watch(
    () => themeStore.generatedPalettes,
    () => {
      refreshColors();
    },
    { deep: true },
  );

  // 3. MutationObserver (Opsional, untuk menangkap perubahan inline style manual lain)
  observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (
        mutation.type === 'attributes' &&
        mutation.attributeName === 'style'
      ) {
        refreshColors();
      }
    }
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['style'],
  });
});

onUnmounted(() => {
  if (observer) observer.disconnect();
});

// --- Helper Functions ---

const { copy } = useClipboard({ legacy: true });

const copyToClipboard = (text: string) => {
  copy(text);
};

const getPairStyle = (color: { value: string } | undefined) => {
  if (!color || !color.value)
    return { backgroundColor: '#FFFFFF', color: '#000000' };

  let textColor = '#000000';
  try {
    const hex = color.value.replace('#', '');
    if (hex.length >= 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const luminance = (r * 299 + g * 587 + b * 114) / 1000;
      textColor = luminance > 128 ? '#000000' : '#FFFFFF';
    }
  } catch (e) {}
  return { backgroundColor: color.value, color: textColor };
};

const shortenName = (name: string) => {
  return name.replace('--color-', '');
};
</script>

<template>
  <Teleport to="body">
    <div
      ref="paletteRef"
      :class="[
        'fixed top-0 left-0 z-[9999] will-change-transform',
        'w-48 rounded-xl shadow-xl', 
        'bg-[var(--color-surface-container)] text-[var(--color-on-surface)]',
        'border border-[var(--color-outline)]/50',
        'flex flex-col',
        { 'is-dragging': isDragging }
      ]"
      :style="paletteStyle"
      @mousedown.prevent
    >
      <div
        ref="dragHandleRef"
        class="w-full h-4 flex-shrink-0 flex justify-center items-center cursor-grab active:cursor-grabbing"
        style="touch-action: none;"
      >
        <div class="w-6 h-1 rounded-full bg-[var(--color-outline-variant)]"></div>
      </div>

      <div class="relative flex-shrink-0 flex items-center justify-between mb-1 px-3">
        <h2 class="text-xs font-bold text-[var(--color-on-background)] uppercase tracking-wider">Pallet</h2>
        <button @click="emit('close')" class="p-0.5 text-[var(--color-outline)] hover:text-[var(--color-on-background)] transition-colors">
          <span class="material-symbols-outlined text-base">close</span>
        </button>
      </div>

      <div class="flex-1 max-h-[40vh] overflow-y-auto px-1.5 pb-1.5 custom-scrollbar">
        
        <div v-if="isLoading" class="flex flex-col justify-center items-center h-16 gap-1">
          <LoadingSpinner size="sm" color="primary" />
          <span class="text-[10px] text-[var(--color-on-surface-variant)]">Loading...</span>
        </div>
        
        <template v-else>
          <!-- Header: Light / Dark -->
          <div class="grid grid-cols-2 gap-1 px-0.5 mb-1 sticky top-0 bg-[var(--color-surface-container)] pt-1 z-10 pb-0.5">
             <!-- Icons instead of Text for compactness -->
             <div class="flex justify-center"><span class="material-symbols-outlined text-[14px] opacity-70">light_mode</span></div>
             <div class="flex justify-center"><span class="material-symbols-outlined text-[14px] opacity-70">dark_mode</span></div>
          </div>

          <div class="space-y-1">
            <div v-for="color in comparisonColors" :key="color.name" class="w-full">
              <!-- Variable name overlay or simpler display -->
              <div class="flex items-center justify-between px-0.5 mb-0.5">
                   <div class="text-[9px] font-medium text-[var(--color-on-surface-variant)] capitalize truncate max-w-[90%]" :title="color.name">
                     {{ shortenName(color.name) }}
                   </div>
              </div>
              
              <div class="grid grid-cols-2 gap-1">
                <div class="flex flex-col justify-end p-1 h-6 rounded-md cursor-pointer transition-transform active:scale-95 border border-black/5" :style="getPairStyle(color.light)" @click="copyToClipboard(color.name)" :title="'Light: ' + color.light.value">
                  <span class="text-[8px] font-mono opacity-80 self-end leading-none">{{ color.light.value }}</span>
                </div>
                <div class="flex flex-col justify-end p-1 h-6 rounded-md cursor-pointer transition-transform active:scale-95 border border-black/5" :style="getPairStyle(color.dark)" @click="copyToClipboard(color.name)" :title="'Dark: ' + color.dark.value">
                  <span class="text-[8px] font-mono opacity-80 self-end leading-none">{{ color.dark.value }}</span>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.is-dragging {
  transition: none;
}
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: var(--color-outline-variant);
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background-color: transparent;
}
</style>
