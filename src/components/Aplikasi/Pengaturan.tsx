import { Show } from "solid-js";
import { appStore } from "../../stores/appStore";
import Switch from "../ui/m3e/Switch";
import Button from "../ui/m3e/Button";
import Modal from "../ui/m3e/Modal";

const Pengaturan = () => {
  return (
    <Modal
      show={appStore.state.ui.isPengaturanOpen}
      onClose={() => appStore.closePengaturan()}
      title="Pengaturan"
      actions={
        <Button class="w-full" onClick={() => appStore.closePengaturan()}>
          Selesai
        </Button>
      }
    >
      <div class="space-y-6 pb-4">
        {/* Personalisasi Section */}
        <section>
          <div 
            class="flex items-center justify-between p-4 bg-[var(--color-surface-container-low)] rounded-2xl cursor-pointer hover:bg-[var(--color-surface-container-high)] transition-colors group"
            onClick={() => { appStore.closePengaturan(); setTimeout(() => appStore.openPersonalisasi(), 50); }}
          >
            <div class="flex items-center gap-4">
              <div class="w-10 h-10 rounded-full bg-[var(--color-primary-container)] flex items-center justify-center text-[var(--color-primary)]">
                <span class="material-symbols-rounded">palette</span>
              </div>
              <div class="flex flex-col">
                <span class="font-medium text-[var(--color-on-surface)]">Personalisasi</span>
                <span class="text-xs text-[var(--color-on-surface-variant)]">Tema, warna, dan font</span>
              </div>
            </div>
            <span class="material-symbols-rounded text-[var(--color-on-surface-variant)] group-hover:translate-x-1 transition-transform">chevron_right</span>
          </div>
        </section>

        <section>
          <div 
            class="flex items-center justify-between p-4 bg-[var(--color-surface-container-low)] rounded-2xl cursor-pointer hover:bg-[var(--color-surface-container-high)] transition-colors group"
            onClick={() => { appStore.closePengaturan(); setTimeout(() => appStore.toggleColorPalette(), 50); }}
          >
            <div class="flex items-center gap-4">
              <div class="w-10 h-10 rounded-full bg-[var(--color-tertiary-container)] flex items-center justify-center text-[var(--color-tertiary)]">
                <span class="material-symbols-rounded">colorize</span>
              </div>
              <div class="flex flex-col">
                <span class="font-medium text-[var(--color-on-surface)]">Palet Warna</span>
                <span class="text-xs text-[var(--color-on-surface-variant)]">Lihat variabel warna tema</span>
              </div>
            </div>
            <span class="material-symbols-rounded text-[var(--color-on-surface-variant)] group-hover:translate-x-1 transition-transform">chevron_right</span>
          </div>
        </section>
      </div>
    </Modal>
  );
};

export default Pengaturan;
