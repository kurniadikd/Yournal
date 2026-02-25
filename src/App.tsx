import { onMount } from "solid-js";
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
  onMount(() => {
    themeStore.init();
  });

  return (
    <main class="min-h-screen flex flex-col relative overflow-hidden bg-[var(--color-surface)]">
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
