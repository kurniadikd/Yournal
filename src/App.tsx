import { onMount, onCleanup } from "solid-js";
import { getCurrentWindow } from "@tauri-apps/api/window";
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
    const unlisten = await getCurrentWindow().onBackButtonClicked((_event) => {
      console.log("App: System back button clicked");
      const handled = appStore.handleBack();
      if (handled) {
        // Prevent default (closing the app)
        // In Tauri v2, if handled, we don't need to do anything specific here 
        // as the event listener itself intercepts it if we don't call exit.
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
