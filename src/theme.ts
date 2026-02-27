import { createStore } from "solid-js/store";

export const md3FullKeys = [
  'primary', 'onPrimary', 'primaryContainer', 'onPrimaryContainer', 'inversePrimary',
  'secondary', 'onSecondary', 'secondaryContainer', 'onSecondaryContainer',
  'tertiary', 'onTertiary', 'tertiaryContainer', 'onTertiaryContainer',
  'background', 'onBackground', 'surface', 'onSurface', 'surfaceVariant', 'onSurfaceVariant',
  'surfaceTint', 'inverseSurface', 'inverseOnSurface',
  'error', 'onError', 'errorContainer', 'onErrorContainer',
  'success', 'onSuccess', 'successContainer', 'onSuccessContainer',
  'outline', 'outlineVariant', 'scrim',
  'surfaceBright', 'surfaceDim', 'surfaceContainer', 'surfaceContainerHigh',
  'surfaceContainerHighest', 'surfaceContainerLow', 'surfaceContainerLowest',
  'primaryFixed', 'primaryFixedDim', 'onPrimaryFixed', 'onPrimaryFixedVariant',
  'secondaryFixed', 'secondaryFixedDim', 'onSecondaryFixed', 'onSecondaryFixedVariant',
  'tertiaryFixed', 'tertiaryFixedDim', 'onTertiaryFixed', 'onTertiaryFixedVariant',
];

function argbFromHex(hex: string) {
  hex = hex.replace('#', '');
  if (hex.length === 6) {
    return (0xff000000 | parseInt(hex, 16)) >>> 0;
  }
  return 0xff000000;
}

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

let wasmExports: any = null;

async function initWasm() {
  if (wasmExports) return wasmExports;
  if (!(window as any)['material-kolor']) {
    const script = document.createElement('script');
    script.src = '/wasm/material-kolor.js';
    document.head.appendChild(script);
    await new Promise((resolve) => { script.onload = resolve; });
  }
  let bundle = (window as any)['material-kolor'];
  if (bundle instanceof Promise) bundle = await bundle;
  wasmExports = bundle.generateColorSchemeJson ? bundle : bundle.exports;
  return wasmExports;
}

interface ThemeState {
  mode: 'light' | 'dark' | 'system';
  isDark: boolean;
  seedColor: string;
  style: string;
  fontFamily: string;
  isInitializing: boolean;
  generatedPalettes: {
    light: Record<string, string> | null;
    dark: Record<string, string> | null;
  };
}

const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

const [state, setState] = createStore<ThemeState>({
  mode: 'system',
  isDark: mediaQuery.matches,
  seedColor: '#AC0087',
  style: 'expressive',
  fontFamily: 'Noto Sans',
  isInitializing: true,
  generatedPalettes: {
    light: null,
    dark: null,
  },
});

// System theme listener
mediaQuery.addEventListener('change', (e) => {
  if (state.mode === 'system') {
    themeStore.updateDarkState(e.matches);
  }
});

export const themePresets = [
  { name: 'Yournal', color: '#AC0087' },
  { name: 'Ocean', color: '#0061A4' },
  { name: 'Forest', color: '#006D3B' },
  { name: 'Sunset', color: '#9C4235' },
  { name: 'Lavender', color: '#6D53A5' },
];

export const themeStyles = [
  { id: 'expressive', name: 'Expressive' },
  { id: 'tonal-spot', name: 'Tonal Spot' },
  { id: 'vibrant', name: 'Vibrant' },
  { id: 'neutral', name: 'Neutral' },
];

export const availableFonts = [
  { name: 'Noto Sans', family: "'Noto Sans', 'Noto Color Emoji', sans-serif" },
  { name: 'Noto Sans Mono', family: "'Noto Sans Mono', 'Noto Color Emoji', monospace" },
  { name: 'Serif', family: "'Noto Serif', 'Noto Color Emoji', serif" },
];

export const themeStore = {
  state,
  
  setMode: async (mode: 'light' | 'dark' | 'system') => {
    setState("mode", mode);
    saveSettings();
    
    let shouldBeDark = state.isDark;
    if (mode === 'system') {
      shouldBeDark = mediaQuery.matches;
    } else {
      shouldBeDark = mode === 'dark';
    }
    
    await themeStore.updateDarkState(shouldBeDark);
  },

  updateDarkState: async (isDark: boolean) => {
    if (state.isDark !== isDark) {
      setState("isDark", isDark);
      await themeStore.updateTheme();
    }
  },
  
  setSeedColor: async (color: string) => {
    setState("seedColor", color);
    saveSettings();
    await themeStore.updateTheme();
  },
  
  setStyle: async (style: string) => {
    setState("style", style);
    saveSettings();
    await themeStore.updateTheme();
  },

  setFontFamily: (font: string) => {
    setState("fontFamily", font);
    saveSettings();
    const fontObj = availableFonts.find(f => f.name === font);
    if (fontObj) {
      document.documentElement.style.setProperty('--font-main', fontObj.family);
    }
  },
  
  toggleTheme: () => {
    const nextMode = state.mode === 'light' ? 'dark' : 'light'; // Simple toggle ignores system
    themeStore.setMode(nextMode);
  },

  updateTheme: async () => {
    const MaterialKolor = await initWasm();
    const sourceArgb = argbFromHex(state.seedColor);
    
    // Map kebab-case to PascalCase for Kotlin
    const kotlinStyle = state.style
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');

    // Generate BOTH for comparison (for PaletWarna)
    const lightJson = MaterialKolor.generateColorSchemeJson(sourceArgb, false, kotlinStyle, 0.0, false);
    const darkJson = MaterialKolor.generateColorSchemeJson(sourceArgb, true, kotlinStyle, 0.0, false);
    
    const lightScheme = JSON.parse(lightJson);
    const darkScheme = JSON.parse(darkJson);
    
    const lightPalette = transformToCss(lightScheme, state.seedColor);
    const darkPalette = transformToCss(darkScheme, state.seedColor);
    
    setState("generatedPalettes", { light: lightPalette, dark: darkPalette });

    const currentPalette = state.isDark ? darkPalette : lightPalette;

    for (const [key, value] of Object.entries(currentPalette)) {
      document.documentElement.style.setProperty(key, value as string);
    }
    document.documentElement.setAttribute('data-theme', state.isDark ? 'dark' : 'light');

    // Logo Filter for Dark Mode (making it visible on dark)
    document.documentElement.style.setProperty('--theme-logo-filter', state.isDark 
      ? 'invert(100%) sepia(0%) saturate(0%) hue-rotate(93deg) brightness(103%) contrast(103%)' 
      : 'none'
    );
    
    // Apply Font
    const fontObj = availableFonts.find(f => f.name === state.fontFamily);
    if (fontObj) {
      document.documentElement.style.setProperty('--font-main', fontObj.family);
    }

    setState("isInitializing", false);
  },

  init: async () => {
    // Load from LocalStorage
    const stored = localStorage.getItem('yournal-theme');
    let initialMode: 'light' | 'dark' | 'system' = 'system';
    
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.mode) initialMode = parsed.mode;
        // Backward compatibility
        else if (parsed.isDark !== undefined) initialMode = parsed.isDark ? 'dark' : 'light';
        
        if (parsed.seedColor) setState("seedColor", parsed.seedColor);
        if (parsed.style) setState("style", parsed.style);
        if (parsed.fontFamily) setState("fontFamily", parsed.fontFamily);
      } catch (e) {
        console.error("Failed to parse theme settings", e);
      }
    }
    
    setState("mode", initialMode);
    
    // Determine initial dark state
    if (initialMode === 'system') {
        setState("isDark", mediaQuery.matches);
    } else {
        setState("isDark", initialMode === 'dark');
    }

    await themeStore.updateTheme();
  }
};

function saveSettings() {
  const settings = {
    mode: state.mode, 
    // isDark is not saved, explicitly derived from mode on load
    seedColor: state.seedColor,
    style: state.style,
    fontFamily: state.fontFamily,
  };
  localStorage.setItem('yournal-theme', JSON.stringify(settings));
}
