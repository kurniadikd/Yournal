import { defineStore } from 'pinia';
import { useSettingsStore } from './settings';

function argbFromHex(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 6) {
    return (0xff000000 | parseInt(hex, 16)) >>> 0;
  }
  return 0xff000000;
}

export const md3FullKeys = [
  'primary',
  'onPrimary',
  'primaryContainer',
  'onPrimaryContainer',
  'inversePrimary',
  'secondary',
  'onSecondary',
  'secondaryContainer',
  'onSecondaryContainer',
  'tertiary',
  'onTertiary',
  'tertiaryContainer',
  'onTertiaryContainer',
  'background',
  'onBackground',
  'surface',
  'onSurface',
  'surfaceVariant',
  'onSurfaceVariant',
  'surfaceTint',
  'inverseSurface',
  'inverseOnSurface',
  'error',
  'onError',
  'errorContainer',
  'onErrorContainer',
  'success',
  'onSuccess',
  'successContainer',
  'onSuccessContainer',
  'outline',
  'outlineVariant',
  'scrim',
  'surfaceBright',
  'surfaceDim',
  'surfaceContainer',
  'surfaceContainerHigh',
  'surfaceContainerHighest',
  'surfaceContainerLow',
  'surfaceContainerLowest',
  'primaryFixed',
  'primaryFixedDim',
  'onPrimaryFixed',
  'onPrimaryFixedVariant',
  'secondaryFixed',
  'secondaryFixedDim',
  'onSecondaryFixed',
  'onSecondaryFixedVariant',
  'tertiaryFixed',
  'tertiaryFixedDim',
  'onTertiaryFixed',
  'onTertiaryFixedVariant',
];

function transformToCss(scheme: Record<string, string>, sourceColorHex: string) {
  const vars: Record<string, string> = {};
  md3FullKeys.forEach((key) => {
    const value = scheme[key];
    if (value && typeof value === 'string') {
      const cssVarName = `--color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      vars[cssVarName] = value;
    }
  });
  vars['--color-seed'] = sourceColorHex;
  return vars;
}

// WASM Loader
let wasmExports: any = null;

async function initWasm() {
  if (wasmExports) return wasmExports;

  console.log('DEBUG: initWasm (v5 - Direct) started.');

  // 1. Load the JS companion script if missing
  if (!(window as any)['material-kolor']) {
    const script = document.createElement('script');
    script.src = '/wasm/material-kolor.js';
    document.head.appendChild(script);
    
    // Wait for script to load
    await new Promise((resolve) => {
      script.onload = resolve;
    });
  }

  // 2. Initialize WASM
  let bundle = (window as any)['material-kolor'];
  
  if (!bundle) {
     throw new Error('window["material-kolor"] is undefined. Script failed to load??');
  }

  // Handle Promise
  if (bundle instanceof Promise) {
      // console.log('DEBUG: Awaiting bundle Promise...');
      bundle = await bundle;
  }

  // 3. Direct Usage Check
  // The resolved bundle IS the exports module in this configuration.
  if (bundle.generateColorSchemeJson) {
      console.log('DEBUG: WASM exports found directly on bundle.');
      wasmExports = bundle;
  } else if (bundle.exports && bundle.exports.generateColorSchemeJson) {
       console.log('DEBUG: WASM exports found in .exports property.');
       wasmExports = bundle.exports;
  } else {
       console.error('DEBUG: Bundle dump:', bundle);
       throw new Error(`WASM bundle loaded but 'generateColorSchemeJson' not found. Keys: ${Reflect.ownKeys(bundle).join(', ')}`);
  }

  console.log('DEBUG: WASM init success. Ready to generate colors.');
  return wasmExports;
}

function findDominantVibrantColor(pixels) {
  let bestColor = { r: 0, g: 0, b: 0 };
  let maxScore = -Infinity;

  for (let i = 0; i < pixels.length; i += 16) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const a = pixels[i + 3];

    if (a < 250) continue;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const chroma = max - min;
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;

    if (luma < 15 || luma > 240) continue;
    if (chroma < 10) continue;

    let score = chroma;
    if (luma < 60) score -= (60 - luma) * 0.5;
    if (luma > 200) score -= (luma - 200) * 0.5;

    if (score > maxScore) {
      maxScore = score;
      bestColor = { r, g, b };
    }
  }

  if (maxScore === -Infinity) return null;

  const toHex = (c) => c.toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(bestColor.r)}${toHex(bestColor.g)}${toHex(bestColor.b)}`;
}

const themePickerData = {
  'leksika-default': { name: 'Leksika', color: '#AC0087' }, // Hue: 311° (Magenta/Ungu)
  orange: { name: 'Oranye', color: '#E64B19' }, // Hue: 23° (Merah/Oranye)
  lime: { name: 'Lime', color: '#BFE617' }, // Hue: 95° (Kuning/Lime)
  cyan: { name: 'Cyan', color: '#17E6BF' }, // Hue: 167° (Cyan)
  blue: { name: 'Biru', color: '#194BE6' }, // Hue: 239° (Biru)
};

export const useThemeStore = defineStore('themes', {
  state: () => ({
    themes: themePickerData,
    generatedPalettes: null as Record<string, Record<string, string>> | null,
  }),

  getters: {
    // Getter untuk mendapatkan seed color dari settingsStore
    activeSeedColor() {
      const settingsStore = useSettingsStore();
      return settingsStore.themeSeedColor;
    },
    // Getter untuk mendapatkan style dari settingsStore
    activeStyle() {
      const settingsStore = useSettingsStore();
      return settingsStore.themeStyle;
    },
    isHardcodedMode() {
      const settingsStore = useSettingsStore();
      const seed = settingsStore.themeSeedColor?.toUpperCase();
      return Object.values(themePickerData).some(
        (t) => t.color.toUpperCase() === seed,
      );
    },
  },

  actions: {
    applyCurrentPalette() {
      const settingsStore = useSettingsStore();
      const mode = settingsStore.effectiveTheme || 'light';

      if (!this.generatedPalettes) return;

      const palette = this.generatedPalettes[mode];
      if (!palette) return;

      for (const [key, value] of Object.entries(palette)) {
        document.documentElement.style.setProperty(key, value as string);
      }
    },

    clearDynamicStyles() {
      const mode = useSettingsStore().effectiveTheme || 'light';
      const palette = this.generatedPalettes?.[mode];

      if (palette) {
        for (const key of Object.keys(palette)) {
          document.documentElement.style.removeProperty(key);
        }
      }
      document.documentElement.style.removeProperty('--color-seed');
    },

    initializeTheme() {
      console.warn('DEPRECATED: Gunakan initializeThemeAsync().');
    },

    async initializeThemeAsync() {
      const settingsStore = useSettingsStore();

      let needsRegen = false;

      // Check if we have palettes
      if (this.generatedPalettes && this.generatedPalettes.light) {
         // Check if we have the new Success keys (Migration check)
         if (!this.generatedPalettes.light['--color-success']) {
             needsRegen = true;
         } else {
             this.applyCurrentPalette();
         }
      } else {
          needsRegen = true;
      }

      const seedColor = settingsStore.themeSeedColor || '#AC0087';
      const style = settingsStore.themeStyle || 'tonal-spot';

      if (needsRegen) {
          try {
            await this.generateThemeFromSeed(seedColor, style);
          } catch (e) {
            console.error('Failed to initialize theme:', e);
          }
      }
    },

    async waitForMaterialKolor() {
        return await initWasm();
    },

    /**
     * Generate theme dari seed color dan style.
     * Secara otomatis menyimpan ke settingsStore (yang akan sync ke backend).
     */
    async generateThemeFromSeed(seedColor, style = null) {
      const settingsStore = useSettingsStore();

      // OPTIMIZATION: Check if WASM is already loaded synchronously
      // This bypasses the Microtask queue (await) for instant updates (Live Preview friendly)
      let MaterialKolor = wasmExports;
      
      if (!MaterialKolor) {
          try {
            MaterialKolor = await this.waitForMaterialKolor();
          } catch (e) {
            console.error('Core Logic Load Failure:', e);
            return;
          }
      }

      const styleToUse = style || settingsStore.themeStyle || 'tonal-spot';
      const sourceArgb = argbFromHex(seedColor);

      // Map 'tonal-spot' -> 'TonalSpot'
      const kotlinStyle = styleToUse
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');

      // Kotlin/WASM: generateColorSchemeJson returns a JSON string
      const generate = (isDark: boolean) => {
        const jsonStr = MaterialKolor.generateColorSchemeJson(
          sourceArgb,
          isDark,
          kotlinStyle,
          0.0,
          false
        );
        return JSON.parse(jsonStr);
      };

      const lightScheme = generate(false);
      const darkScheme = generate(true);

      this.generatedPalettes = {
        light: transformToCss(lightScheme, seedColor),
        dark: transformToCss(darkScheme, seedColor),
      };

      this.applyCurrentPalette();
      
      // Update settings store
      settingsStore.setThemeSeedColor(seedColor);
      settingsStore.setThemeStyle(styleToUse);
    },

    setSeedColor(newSeedHex) {
      const settingsStore = useSettingsStore();
      this.generateThemeFromSeed(newSeedHex, settingsStore.themeStyle);
    },

    setThemeStyle(style) {
      const settingsStore = useSettingsStore();
      this.generateThemeFromSeed(settingsStore.themeSeedColor, style);
    },

    async extractColorFromImage(src) {
      const settingsStore = useSettingsStore();
      const defaultColor = settingsStore.themeSeedColor;

      try {
        await this.waitForMaterialKolor();
      } catch (e) {}

      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';

        img.onload = function () {
          try {
            const canvas = document.createElement('canvas');
            const size = 128;
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, size, size);

            const imageData = ctx.getImageData(0, 0, size, size);
            const pixels = imageData.data;

            const vibrantColor = findDominantVibrantColor(pixels);

            if (vibrantColor) {
              resolve(vibrantColor);
            } else {
              const i =
                (Math.floor(size / 2) + Math.floor(size / 2) * size) * 4;
              const r = pixels[i];
              const g = pixels[i + 1];
              const b = pixels[i + 2];
              const hex =
                '#' +
                ((1 << 24) + (r << 16) + (g << 8) + b)
                  .toString(16)
                  .slice(1)
                  .toUpperCase();
              resolve(hex);
            }
          } catch (e) {
            resolve(defaultColor);
          }
        };

        img.onerror = () => resolve(defaultColor);
        img.src = src;
      });
    },
  },

  persist: {
    key: 'leksika-theme-storage',
    storage: localStorage,
    // Hanya persist generatedPalettes untuk performa
    // activeSeedColor dan activeStyle sekarang di-manage oleh settingsStore
    paths: ['generatedPalettes'],
  } as any,
});
