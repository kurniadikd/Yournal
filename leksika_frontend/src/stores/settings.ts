// src/stores/settings.js

import { defineStore } from 'pinia';
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useStorage } from '@vueuse/core';
import { useAuthStore } from './auth';
import { api } from '@/utils/api';

// Default values untuk settings
const DEFAULTS = {
  uiTheme: 'system',
  selectedFont: 'Noto Sans',
  showVirtualKeyboard: false,
  hideNativeKeyboard: false,
  themeSeedColor: '#AC0087',
  themeStyle: 'vibrant',
};

export const useSettingsStore = defineStore('settings', () => {
  // --- STATE ---
  const showVirtualKeyboard = useStorage<boolean>(
    'setting-keyboard',
    DEFAULTS.showVirtualKeyboard,
  );
  const hideNativeKeyboard = useStorage<boolean>(
    'setting-hide-native-keyboard',
    DEFAULTS.hideNativeKeyboard,
  );
  const uiTheme = useStorage<string>('setting-theme', DEFAULTS.uiTheme);
  const systemTheme = ref<string>('light');
  const selectedFont = useStorage<string>('setting-font', DEFAULTS.selectedFont);
  const themeSeedColor = useStorage<string>(
    'setting-theme-seed-color',
    DEFAULTS.themeSeedColor,
  );
  const themeStyle = useStorage<string>('setting-theme-style', DEFAULTS.themeStyle);

  // Flag untuk mencegah save saat fetching dari server
  const isFetchingSettings = ref(false);

  // --- LOGIC UNTUK MELACAK TEMA SISTEM ---
  let mediaQuery;

  const updateSystemTheme = (event) => {
    systemTheme.value = event.matches ? 'dark' : 'light';
  };

  onMounted(() => {
    if (typeof window !== 'undefined') {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      systemTheme.value = mediaQuery.matches ? 'dark' : 'light';
      mediaQuery.addEventListener('change', updateSystemTheme);
    }
  });

  onUnmounted(() => {
    if (mediaQuery) {
      mediaQuery.removeEventListener('change', updateSystemTheme);
    }
  });

  // --- GETTERS ---
  const effectiveTheme = computed(() => {
    if (uiTheme.value === 'system') {
      return systemTheme.value;
    }
    return uiTheme.value;
  });

  const availableFonts = ref([
    { name: 'Roboto', family: "'Roboto', sans-serif" },
    { name: 'PT Serif', family: "'PT Serif', serif" },
    { name: 'Noto Sans', family: "'Noto Sans', serif" },
    { name: 'Merriweather', family: "'Merriweather', serif" },
    { name: 'Nunito', family: "'Nunito', serif" },
    { name: 'Playpen Sans', family: "'Playpen Sans', serif" },
    { name: 'Shantell Sans', family: "'Shantell Sans', serif" },
    { name: 'Comfortaa', family: "'Comfortaa', sans-serif" },
    { name: 'Times New Roman', family: "'Times New Roman', serif" },
  ]);

  // --- ACTIONS ---
  const toggleVirtualKeyboard = (value) => {
    showVirtualKeyboard.value =
      typeof value === 'boolean' ? value : !showVirtualKeyboard.value;
  };

  const toggleHideNativeKeyboard = (value) => {
    hideNativeKeyboard.value =
      typeof value === 'boolean' ? value : !hideNativeKeyboard.value;
  };

  const setUiTheme = (theme) => {
    uiTheme.value = theme;
  };

  const setSelectedFont = (fontName) => {
    if (availableFonts.value.some((font) => font.name === fontName)) {
      selectedFont.value = fontName;
    } else {
      console.error(
        `Gagal mengubah, font "${fontName}" tidak ada dalam daftar.`,
      );
    }
  };

  const setThemeSeedColor = (color) => {
    themeSeedColor.value = color;
  };

  const setThemeStyle = (style) => {
    themeStyle.value = style;
  };

  /**
   * Reset semua pengaturan ke nilai default.
   * Dipanggil saat user logout.
   */
  const resetToDefaults = () => {
    // Jangan trigger save saat reset
    isFetchingSettings.value = true;

    uiTheme.value = DEFAULTS.uiTheme;
    selectedFont.value = DEFAULTS.selectedFont;
    showVirtualKeyboard.value = DEFAULTS.showVirtualKeyboard;
    hideNativeKeyboard.value = DEFAULTS.hideNativeKeyboard;
    themeSeedColor.value = DEFAULTS.themeSeedColor;
    themeStyle.value = DEFAULTS.themeStyle;

    // Gunakan nextTick atau setTimeout untuk memastikan nilai sudah diset
    setTimeout(() => {
      isFetchingSettings.value = false;
    }, 100);

    console.log('Settings reset to defaults.');
  };

  /**
   * Fetch pengaturan user dari server dan terapkan ke local state.
   */
  const fetchUserSettings = async () => {
    const authStore = useAuthStore();
    if (!authStore.isLoggedIn || !authStore.user?.id) return;

    // Set flag untuk mencegah watch men-trigger save
    isFetchingSettings.value = true;

    try {
      const response = await api.get(`/users/${authStore.user.id}/`);
      const profile = response.data.profile;
      if (profile) {
        uiTheme.value = profile.ui_theme || DEFAULTS.uiTheme;
        selectedFont.value = profile.selected_font || DEFAULTS.selectedFont;
        showVirtualKeyboard.value =
          profile.show_virtual_keyboard ?? DEFAULTS.showVirtualKeyboard;
        hideNativeKeyboard.value =
          profile.hide_native_keyboard ?? DEFAULTS.hideNativeKeyboard;
        themeSeedColor.value =
          profile.theme_seed_color || DEFAULTS.themeSeedColor;
        themeStyle.value = profile.theme_style || DEFAULTS.themeStyle;

        console.log('User settings fetched from server.');
      }
    } catch (error) {
      console.error('Error fetching user settings:', error);
    } finally {
      // Beri jeda sebelum mengaktifkan kembali save
      setTimeout(() => {
        isFetchingSettings.value = false;
      }, 100);
    }
  };

  /**
   * Simpan pengaturan user ke server.
   */
  const saveUserSettings = async () => {
    const authStore = useAuthStore();
    if (!authStore.isLoggedIn || !authStore.user?.id) return;

    // Jangan save jika sedang fetching (mencegah loop)
    if (isFetchingSettings.value) {
      console.log('Skipping save: currently fetching settings.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('ui_theme', uiTheme.value);
      formData.append('selected_font', selectedFont.value);
      formData.append('show_virtual_keyboard', String(showVirtualKeyboard.value));
      formData.append('hide_native_keyboard', String(hideNativeKeyboard.value));
      formData.append('theme_seed_color', themeSeedColor.value);
      formData.append('theme_style', themeStyle.value);

      await api.patch(`/users/${authStore.user.id}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      console.log('User settings saved to backend.');
    } catch (error) {
      console.error('Error saving user settings:', error);
    }
  };

  // Watch untuk perubahan settings dan simpan ke backend jika logged in
  // Menggunakan debounce untuk menghindari terlalu banyak request
  let saveTimeout = null;
  watch(
    [
      uiTheme,
      selectedFont,
      showVirtualKeyboard,
      hideNativeKeyboard,
      themeSeedColor,
      themeStyle,
    ],
    () => {
      const authStore = useAuthStore();
      if (authStore.isLoggedIn && !isFetchingSettings.value) {
        // Debounce: tunggu 500ms sebelum save
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
          saveUserSettings();
        }, 500);
      }
    },
  );

  return {
    // State
    showVirtualKeyboard,
    hideNativeKeyboard,
    uiTheme,
    effectiveTheme,
    availableFonts,
    selectedFont,
    themeSeedColor,
    themeStyle,

    // Actions
    toggleVirtualKeyboard,
    toggleHideNativeKeyboard,
    setUiTheme,
    setSelectedFont,
    setThemeSeedColor,
    setThemeStyle,
    fetchUserSettings,
    saveUserSettings,
    resetToDefaults,
  };
});
