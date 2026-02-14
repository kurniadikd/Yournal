import { createStore } from "solid-js/store";
import { themeStore } from "../theme";

interface AppState {
  ui: {
    isPengaturanOpen: boolean;
    isPersonalisasiOpen: boolean;
    isColorPaletteOpen: boolean;
    isAiLogOpen: boolean;
    showVirtualKeyboard: boolean;
    hideNativeKeyboard: boolean;
  };
}

const [state, setState] = createStore<AppState>({
  ui: {
    isPengaturanOpen: false,
    isPersonalisasiOpen: false,
    isColorPaletteOpen: false,
    isAiLogOpen: false,
    showVirtualKeyboard: false,
    hideNativeKeyboard: false,
  },
});

// Actions
export const appStore = {
  state,
  theme: themeStore,
  
  // UI Actions
  openPengaturan: () => {
    console.log("Store: Opening Pengaturan");
    setState("ui", "isPengaturanOpen", true);
  },
  closePengaturan: () => {
    console.log("Store: Closing Pengaturan");
    setState("ui", "isPengaturanOpen", false);
  },
  
  openPersonalisasi: () => {
    console.log("Store: Opening Personalisasi");
    setState("ui", "isPersonalisasiOpen", true);
  },
  closePersonalisasi: () => {
    console.log("Store: Closing Personalisasi");
    setState("ui", "isPersonalisasiOpen", false);
  },

  toggleColorPalette: () => {
    setState("ui", "isColorPaletteOpen", (p) => {
      console.log("Store: Toggling Color Palette to", !p);
      return !p;
    });
  },
  toggleAiLog: () => setState("ui", "isAiLogOpen", (p) => !p),
  openAiLog: () => setState("ui", "isAiLogOpen", true),
  toggleVirtualKeyboard: () => setState("ui", "showVirtualKeyboard", (p) => !p),
  toggleHideNativeKeyboard: () => setState("ui", "hideNativeKeyboard", (p) => !p),

  // Navigation Logic
  goToPersonalisasi: () => {
    appStore.closePengaturan();
    // Use a tiny timeout to ensure smooth transition between portals if needed
    setTimeout(() => appStore.openPersonalisasi(), 50);
  }
};
