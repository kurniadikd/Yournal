import { onMount, onCleanup } from "solid-js";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { appStore } from "./stores/appStore";
import "./App.css";
import { themeStore } from "./theme";
import Header from "./components/Header";
import Pengaturan from "./components/Aplikasi/Pengaturan";
import Personalisasi from "./components/Aplikasi/Personalisasi";
import PaletWarna from "./components/Aplikasi/PaletWarna";
import BackupSettings from "./components/Aplikasi/BackupSettings";
import HalamanUtama from "./components/Aplikasi/HalamanUtama";

function App() {
  onMount(async () => {
    themeStore.init();

    // Handle Android System Back Button and Window Close Requests
    const unlistenPromise = getCurrentWindow().onCloseRequested((event) => {
      console.log("App: Close requested (System back button clicked)");
      if (appStore.handleBack()) {
        event.preventDefault();
      }
    });

    onCleanup(() => {
      unlistenPromise.then(u => u());
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
