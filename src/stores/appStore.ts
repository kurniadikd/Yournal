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
    isBackupSettingsOpen: boolean;
    backHandlers: (() => boolean)[];
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
    isBackupSettingsOpen: false,
    backHandlers: [],
  },
});

// --- Robust Android Back Button via history.pushState / popstate ---
// Each pushBackHandler adds a fake history entry. The Android back button
// triggers `popstate`, which we intercept to run the handler instead of
// exiting the app.
let _popstateListenerActive = false;

function _onPopState(_event: PopStateEvent) {
  const handlers = state.ui.backHandlers;
  if (handlers.length > 0) {
    const lastHandler = handlers[handlers.length - 1];
    // Remove handler from our stack (the history entry is already consumed)
    setState("ui", "backHandlers", (prev) => prev.slice(0, -1));
    lastHandler();
  }
  // If no handlers left, the browser will naturally go back (which may exit app — correct behavior)
}

function _ensurePopstateListener() {
  if (!_popstateListenerActive) {
    window.addEventListener('popstate', _onPopState);
    _popstateListenerActive = true;
  }
}

// Actions
export const appStore = {
  state,
  theme: themeStore,
  
  // UI Actions
  openPengaturan: () => {
    setState("ui", "isPengaturanOpen", true);
  },
  closePengaturan: () => {
    setState("ui", "isPengaturanOpen", false);
  },
  
  openPersonalisasi: () => {
    setState("ui", "isPersonalisasiOpen", true);
  },
  closePersonalisasi: () => {
    setState("ui", "isPersonalisasiOpen", false);
  },

  openBackupSettings: () => {
    setState("ui", "isBackupSettingsOpen", true);
  },
  closeBackupSettings: () => {
    setState("ui", "isBackupSettingsOpen", false);
  },

  toggleColorPalette: () => {
    setState("ui", "isColorPaletteOpen", (p) => !p);
  },
  toggleAiLog: () => setState("ui", "isAiLogOpen", (p) => !p),
  openAiLog: () => setState("ui", "isAiLogOpen", true),
  toggleVirtualKeyboard: () => setState("ui", "showVirtualKeyboard", (p) => !p),
  toggleHideNativeKeyboard: () => setState("ui", "hideNativeKeyboard", (p) => !p),

  // Navigation Logic
  goToPersonalisasi: () => {
    appStore.closePengaturan();
    setTimeout(() => appStore.openPersonalisasi(), 50);
  },

  // Back Button Logic (history-based)
  pushBackHandler: (handler: () => boolean) => {
    _ensurePopstateListener();
    setState("ui", "backHandlers", (prev) => [...prev, handler]);
    // Push a fake history entry so the Android back button triggers popstate
    // instead of exiting the app
    history.pushState({ backHandler: true }, '');
  },
  popBackHandler: (handler: () => boolean) => {
    const handlers = state.ui.backHandlers;
    const idx = handlers.lastIndexOf(handler);
    if (idx !== -1) {
      setState("ui", "backHandlers", (prev) => prev.filter((_, i) => i !== idx));
      // Silently go back to consume the matching history entry without triggering popstate
      // We temporarily remove the listener to avoid a recursive call
      window.removeEventListener('popstate', _onPopState);
      history.back();
      // Re-add listener on next tick after the back() settles
      setTimeout(() => {
        window.addEventListener('popstate', _onPopState);
      }, 0);
    }
  },
  handleBack: () => {
    const handlers = state.ui.backHandlers;
    if (handlers.length > 0) {
      const lastHandler = handlers[handlers.length - 1];
      setState("ui", "backHandlers", (prev) => prev.slice(0, -1));
      return lastHandler();
    }
    return false;
  }
};

