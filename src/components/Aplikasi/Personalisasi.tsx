import { Show, For, createSignal, createEffect } from "solid-js";
import { appStore } from "../../stores/appStore";
import Button from "../ui/m3e/Button";
import Modal from "../ui/m3e/Modal";
import Slider from "../ui/m3e/Slider";
import Input from "../ui/m3e/Input";
import { themePresets, themeStyles, availableFonts } from "../../theme";
import SegmentedButton from "../ui/m3e/SegmentedButton";
import Dropdown from "../ui/m3e/Dropdown";

const Personalisasi = () => {
  const [isColorPickerOpen, setIsColorPickerOpen] = createSignal(false);
  const [tempHex, setTempHex] = createSignal('#AC0087');
  const [tempHue, setTempHue] = createSignal(0);

  createEffect(() => {
    if (appStore.state.ui.isPersonalisasiOpen) {
      setTempHex(appStore.theme.state.seedColor);
    }
  });

  const hslToHex = (h: number, s: number, l: number): string => {
    l /= 100;
    const a = (s * Math.min(l, 1 - l)) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
  };

  const updateColorFromSlider = (hue: number) => {
    setTempHue(hue);
    const hex = hslToHex(hue, 100, 50);
    setTempHex(hex);
    appStore.theme.setSeedColor(hex);
  };

  const handleHexInput = (val: string) => {
    if (!val.startsWith('#')) val = '#' + val;
    setTempHex(val);
    if (val.length === 7) appStore.theme.setSeedColor(val);
  };

  const closeAndBack = () => {
    appStore.closePersonalisasi();
    setTimeout(() => appStore.openPengaturan(), 50);
  };

  return (
    <>
      <Modal
        show={appStore.state.ui.isPersonalisasiOpen}
        onClose={() => appStore.closePersonalisasi()}
        title="Personalisasi"
        actions={
          <div class="flex gap-2 w-full mt-2">
            <Button variant="tonal" class="flex-1" onClick={closeAndBack}>
              Kembali
            </Button>
            <Button variant="filled" class="flex-1" onClick={() => appStore.closePersonalisasi()}>
              Selesai
            </Button>
          </div>
        }
      >
        <div class="space-y-4 pb-2">
          {/* Group: Mode & Style */}
          <div class="space-y-3">
             <section>
                <h3 class="text-[10px] font-bold mb-2 text-[var(--color-primary)] uppercase tracking-[0.2em] ml-1">Mode Tampilan</h3>
                <SegmentedButton 
                  class="w-full"
                  value={appStore.theme.state.mode === 'system' ? 'Sistem' : (appStore.theme.state.mode === 'dark' ? 'Gelap' : 'Terang')}
                  onChange={(val) => {
                      if (val === 'Sistem') appStore.theme.setMode('system');
                      else if (val === 'Gelap') appStore.theme.setMode('dark');
                      else appStore.theme.setMode('light');
                  }}
                  options={[
                    { value: 'Terang', label: 'Terang', icon: <span class="material-symbols-rounded text-sm">light_mode</span> },
                    { value: 'Gelap', label: 'Gelap', icon: <span class="material-symbols-rounded text-sm">dark_mode</span> },
                    { value: 'Sistem', label: 'Sistem', icon: <span class="material-symbols-rounded text-sm">settings_brightness</span> }
                  ]}
                />
             </section>

             <section>
                <h3 class="text-[10px] font-bold mb-2 text-[var(--color-primary)] uppercase tracking-[0.2em] ml-1">Gaya Warna</h3>
                <div class="grid grid-cols-2 gap-2">
                  <For each={themeStyles}>
                    {(style) => (
                      <button
                        onClick={() => appStore.theme.setStyle(style.id)}
                        class={`
                          relative h-10 rounded-[16px] text-sm font-medium transition-all duration-200 overflow-hidden
                          ${appStore.theme.state.style === style.id 
                            ? 'bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)]' 
                            : 'bg-[var(--color-surface-container-low)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)]'
                          }
                        `}
                      >
                         <div class="relative z-10 flex items-center justify-center gap-2">
                           <Show when={appStore.theme.state.style === style.id}>
                              <span class="material-symbols-rounded text-[18px]">check</span>
                           </Show>
                          {style.name}
                         </div>
                         
                         {/* State Layer for Interaction Feedback */}
                         <div class="absolute inset-0 bg-current opacity-0 hover:opacity-[0.08] active:opacity-[0.12] transition-opacity" />
                      </button>
                    )}
                  </For>
                </div>
             </section>
          </div>

          {/* Warna Dasar */}
          <section>
            <h3 class="text-[10px] font-bold mb-2 text-[var(--color-primary)] uppercase tracking-[0.2em] ml-1">Warna Dasar</h3>
            <div class="flex flex-wrap gap-2 px-1">
              <For each={themePresets}>
                {(preset) => (
                  <button 
                    onClick={() => appStore.theme.setSeedColor(preset.color)}
                    class={`w-9 h-9 rounded-full transition-all duration-200 relative flex items-center justify-center ${appStore.theme.state.seedColor.toLowerCase() === preset.color.toLowerCase() ? 'scale-110 ring-2 ring-[var(--color-primary)] ring-offset-2 ring-offset-[var(--color-surface-container-high)]' : 'hover:scale-105'}`}
                    style={{ "background-color": preset.color }}
                  >
                    <Show when={appStore.theme.state.seedColor.toLowerCase() === preset.color.toLowerCase()}>
                      <span class="material-symbols-rounded text-white text-lg icon-fill">check</span>
                    </Show>
                  </button>
                )}
              </For>
              <button 
                onClick={() => setIsColorPickerOpen(true)}
                class="w-9 h-9 rounded-full bg-conic-rainbow flex items-center justify-center hover:scale-105 transition-transform"
              >
                <span class="material-symbols-rounded text-white text-lg">colorize</span>
              </button>
            </div>
          </section>

          <section>
            <h3 class="text-[10px] font-bold mb-2 text-[var(--color-primary)] uppercase tracking-[0.2em] ml-1">Gaya Font</h3>
            <Dropdown 
              value={appStore.theme.state.fontFamily}
              onChange={(val) => appStore.theme.setFontFamily(val)}
              options={availableFonts.map(f => ({ value: f.name, label: f.name, family: f.family }))}
              placeholder="Pilih Font"
            />
          </section>
        </div>
      </Modal>

      {/* Color Picker Modal */}
      <Modal
        show={isColorPickerOpen()}
        onClose={() => setIsColorPickerOpen(false)}
        title="Pilih Warna"
        actions={
          <Button class="w-full" onClick={() => setIsColorPickerOpen(false)}>
            Terapkan
          </Button>
        }
      >
        <div class="space-y-6 py-4">
           <div class="flex justify-center">
             <div class="w-32 h-32 rounded-[2rem] flex items-center justify-center transition-colors duration-200" style={{ "background-color": tempHex() }}>
               <span class="material-symbols-rounded text-white text-5xl">palette</span>
             </div>
           </div>

           <div class="space-y-4">
             <div class="space-y-2">
               <div class="flex justify-between text-xs font-bold text-[var(--color-primary)] uppercase tracking-widest px-1">
                 <span>Hue</span>
                 <span>{tempHue()}°</span>
               </div>
                <Slider 
                  min={0} max={360} value={tempHue()} 
                  onChange={(val) => updateColorFromSlider(val)}
                  variant="thumb"
                  hideActiveTrack={true}
                  trackClass="hue-slider-bg"
                />
             </div>

             <div class="space-y-2">
               <Input 
                 label="Kode HEX"
                 value={tempHex().replace('#', '')} 
                 onInput={(e) => handleHexInput(e.currentTarget.value)}
                 maxlength={6} 
                 class="text-center"
               />
             </div>
           </div>
        </div>
      </Modal>
    </>
  );
};

export default Personalisasi;
