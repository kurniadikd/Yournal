import { createSignal, createEffect, Show } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { openUrl } from "@tauri-apps/plugin-opener";
import TopAppBar from "../ui/m3e/TopAppBar";
import Card from "../ui/m3e/Card";
import Button from "../ui/m3e/Button";
import Input from "../ui/m3e/Input";
import Snackbar from "../ui/m3e/Snackbar";

export default function BackupSettings(props: { onClose: () => void }) {
  const [clientId, setClientId] = createSignal(localStorage.getItem('gdrive_client_id') || '');
  const [clientSecret, setClientSecret] = createSignal(localStorage.getItem('gdrive_client_secret') || '');
  
  const [isConnected, setIsConnected] = createSignal(!!localStorage.getItem('gdrive_access_token'));
  const [isAuthenticating, setIsAuthenticating] = createSignal(false);
  const [isBackingUp, setIsBackingUp] = createSignal(false);
  const [lastBackup, setLastBackup] = createSignal(localStorage.getItem('gdrive_last_backup') || 'Belum pernah');
  
  const [snackbarMsg, setSnackbarMsg] = createSignal("");

  createEffect(() => {
    localStorage.setItem('gdrive_client_id', clientId());
  });

  createEffect(() => {
    localStorage.setItem('gdrive_client_secret', clientSecret());
  });

  // Listen for the OAuth callback code from Rust
  createEffect(() => {
    const unlisten = listen<string>("oauth-code-received", async (event) => {
      console.log("Received OAuth code:", event.payload);
      try {
        const authState: any = await invoke("exchange_google_token", {
          clientId: clientId(),
          clientSecret: clientSecret(),
          code: event.payload
        });
        
        if (authState.access_token) {
          localStorage.setItem('gdrive_access_token', authState.access_token);
          if (authState.refresh_token) {
            localStorage.setItem('gdrive_refresh_token', authState.refresh_token);
          }
          setIsConnected(true);
          setSnackbarMsg("Berhasil terhubung ke Google Drive!");
        }
      } catch (e) {
        console.error("Token exchange failed:", e);
        setSnackbarMsg(`Gagal autentikasi: ${e}`);
      } finally {
        setIsAuthenticating(false);
      }
    });

    return () => {
      unlisten.then(f => f());
    };
  });

  const handleConnect = async () => {
    if (!clientId() || !clientSecret()) {
      setSnackbarMsg("Harap isi Client ID dan Client Secret terlebih dahulu.");
      return;
    }

    setIsAuthenticating(true);
    try {
      const url: string = await invoke("connect_google_drive", { clientId: clientId() });
      // Buka browser bawaan untuk login Google
      await openUrl(url);
      setSnackbarMsg("Silakan selesaikan login di browser Anda.");
    } catch (e) {
      console.error(e);
      setSnackbarMsg(`Error: ${e}`);
      setIsAuthenticating(false);
    }
  };

  const handleDisconnect = () => {
    localStorage.removeItem('gdrive_access_token');
    localStorage.removeItem('gdrive_refresh_token');
    setIsConnected(false);
    setSnackbarMsg("Terputus dari Google Drive.");
  };

  const handleBackupNow = async () => {
    const token = localStorage.getItem('gdrive_access_token');
    if (!token) {
      setSnackbarMsg("Tidak ada akses token. Silakan hubungkan ulang.");
      setIsConnected(false);
      return;
    }

    setIsBackingUp(true);
    setSnackbarMsg("Sedang mengunggah ke Google Drive...");
    
    try {
      const fileId: string = await invoke("upload_database_to_drive", { accessToken: token });
      const now = new Date().toLocaleString('id-ID');
      setLastBackup(now);
      localStorage.setItem('gdrive_last_backup', now);
      setSnackbarMsg(`Backup berhasil disinkronkan! (ID: ${fileId})`);
    } catch (e) {
      console.error("Backup failed", e);
      setSnackbarMsg(`Gagal mencadangkan: ${e}`);
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <div class="fixed inset-0 z-50 bg-surface flex flex-col text-on-surface animate-in fade-in slide-in-from-bottom-4 duration-300">
      <TopAppBar
        title="Pencadangan Cloud"
        onBack={props.onClose}
        variant="center-aligned"
      />
      
      <div 
        class="flex-1 overflow-y-auto p-4 pb-8 flex flex-col gap-4 max-w-2xl mx-auto w-full"
        style={{ "padding-bottom": "env(safe-area-inset-bottom, 2rem)" }}
      >
        
        <Card variant="elevated" class="p-4 flex flex-col gap-4">
          <div class="flex items-center gap-3">
            <span class="material-symbols-rounded text-3xl text-primary">cloud_sync</span>
            <div>
              <h3 class="text-title-medium font-medium">Google Drive Sync</h3>
              <p class="text-body-medium text-on-surface-variant">
                Cadangkan data jurnal dan catatan Anda secara privat ke akun Google Drive Anda.
              </p>
            </div>
          </div>

          <Show when={!isConnected()}>
            <div class="bg-surface-variant/30 p-3 rounded-lg text-body-small text-on-surface-variant mt-2 border border-outline-variant">
              Anda memerlukan Google API Client ID & Secret untuk menghubungkan aplikasi Desktop ke Google Drive secara aman.
            </div>
            <Input 
              label="Google Client ID" 
              value={clientId()} 
              onInput={setClientId} 
            />
            <Input 
              label="Google Client Secret" 
              value={clientSecret()} 
              onInput={setClientSecret} 
              type="password"
            />
            <div class="flex justify-end mt-2">
              <Button 
                variant="filled" 
                onClick={handleConnect} 
                disabled={isAuthenticating()}
                loading={isAuthenticating()}
              >
                Hubungkan dengan Google
              </Button>
            </div>
          </Show>

          <Show when={isConnected()}>
            <div class="bg-primary-container text-on-primary-container p-4 rounded-xl flex items-center gap-3">
              <span class="material-symbols-rounded text-primary">check_circle</span>
              <div class="flex-1">
                <span class="font-medium text-label-large">Terhubung ke Google Drive</span>
                <p class="text-body-small opacity-80">Siap untuk melakukan pencadangan otomatis/manual.</p>
              </div>
              <Button variant="text" onClick={handleDisconnect}>
                Putuskan
              </Button>
            </div>
            
            <div class="flex flex-col gap-2 mt-2">
              <div class="flex justify-between items-center text-body-medium">
                <span class="text-on-surface-variant">Pencadangan Terakhir:</span>
                <span class="font-medium">{lastBackup()}</span>
              </div>
              
              <Button 
                variant="filled" 
                onClick={handleBackupNow} 
                disabled={isBackingUp()}
                loading={isBackingUp()}
                class="w-full mt-4"
                icon="backup"
              >
                Cadangkan Sekarang
              </Button>
            </div>
          </Show>
        </Card>

      </div>

      <Snackbar 
        message={snackbarMsg()} 
        isOpen={!!snackbarMsg()} 
        onClose={() => { setSnackbarMsg(""); }} 
      />
    </div>
  );
}
