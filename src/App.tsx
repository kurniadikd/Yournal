import { onMount, onCleanup } from "solid-js";
import { onBackButtonClicked } from "@tauri-apps/api/window";
import "./App.css";
import { themeStore } from "./theme";
import Header from "./components/Header";
import Pengaturan from "./components/Aplikasi/Pengaturan";
import Personalisasi from "./components/Aplikasi/Personalisasi";
import PaletWarna from "./components/Aplikasi/PaletWarna";
import BackupSettings from "./components/Aplikasi/BackupSettings";
import HalamanUtama from "./components/Aplikasi/HalamanUtama";
import { appStore } from "./stores/appStore";

function App() {
  onMount(async () => {
    themeStore.init();

    // Handle Android System Back Button
    const unlisten = await onBackButtonClicked((event) => {
      console.log("App: System back button clicked");
      const handled = appStore.handleBack();
      if (handled) {
        // Prevent default (closing the app)
        // In Tauri v2, if we don't call anything to allow it, we might need to block it.
        // Actually, the event itself might need to be inhibited if possible.
      }
    });

    onCleanup(() => {
      unlisten();
    });
  });

  return (
    <main class="app-container bg-[var(--color-surface)]">
      <Header />
      
      <HalamanUtama />

      <Pengaturan />
      <Personalisasi />
      <PaletWarna />
      
      {appStore.state.ui.isBackupSettingsOpen && (
        <BackupSettings onClose={() => appStore.closeBackupSettings()} />
      )}
    </main>
  );
}

export default App;
