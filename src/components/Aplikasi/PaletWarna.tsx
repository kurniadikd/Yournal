import { createSignal, onMount, onCleanup, For, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { appStore } from "../../stores/appStore";
import Card from "../ui/m3e/Card";
import IconButton from "../ui/m3e/IconButton";

const PaletWarna = () => {
  const [isDragging, setIsDragging] = createSignal(false);
  const [pos, setPos] = createSignal({ x: window.innerWidth - 220, y: 80 });
  const [dragOffset, setDragOffset] = createSignal({ x: 0, y: 0 });

  const handleMouseDown = (e: MouseEvent) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - pos().x,
      y: e.clientY - pos().y
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging()) return;
    
    let newX = e.clientX - dragOffset().x;
    let newY = e.clientY - dragOffset().y;
    
    const padding = 10;
    const width = 192;
    newX = Math.max(padding, Math.min(newX, window.innerWidth - width - padding));
    newY = Math.max(padding, Math.min(newY, window.innerHeight - 100));

    setPos({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  onMount(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  });

  onCleanup(() => {
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  });

  const colorVariableNames = [
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

  const getContrastColor = (hex: string) => {
    if (!hex) return '#000000';
    try {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128) ? '#000000' : '#FFFFFF';
    } catch(e) { return '#000000'; }
  };

  const copyToClipboard = (text: string) => {
    const cssVar = `--color-${text.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    navigator.clipboard.writeText(cssVar);
  };

  return (
    <Portal mount={document.body}>
      <Show when={appStore.state.ui.isColorPaletteOpen}>
        <div
          style={{
            position: "fixed",
            left: `${pos().x}px`,
            top: `${pos().y}px`,
            "z-index": 9999,
            "user-select": "none"
          }}
        >
          <Card variant="filled" class="w-48 !p-0 overflow-hidden flex flex-col bg-[var(--color-surface-container-high)]">
            {/* Drag Handle */}
            <div
              onMouseDown={handleMouseDown}
              class="h-6 flex items-center justify-center cursor-move hover:bg-[var(--color-surface-container-highest)] transition-colors group"
            >
              <div class="w-8 h-1 rounded-full bg-[var(--color-on-surface-variant)] group-hover:bg-[var(--color-on-surface)] transition-colors" />
            </div>

            {/* Header */}
            <div class="px-3 pb-2 flex items-center justify-between">
              <h3 class="text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Palet Warna</h3>
              <IconButton 
                variant="standard"
                class="scale-75"
                onClick={() => appStore.toggleColorPalette()}
              >
                close
              </IconButton>
            </div>

            {/* Color List */}
            <div class="flex-1 max-h-[60vh] overflow-y-auto px-2 pb-3 custom-scrollbar space-y-2">
              <div class="grid grid-cols-2 gap-1 sticky top-0 bg-[var(--color-surface-container-high)] py-1 z-10 mb-2">
                <div class="flex justify-center">
                    <span class="material-symbols-rounded text-xs">light_mode</span>
                </div>
                <div class="flex justify-center">
                    <span class="material-symbols-rounded text-xs">dark_mode</span>
                </div>
              </div>

              <For each={colorVariableNames}>
                {(name) => {
                  const varName = `--color-${name.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
                  // Make these functions to ensure reactivity
                  const lightHex = () => appStore.theme.state.generatedPalettes.light?.[varName] || '#ffffff';
                  const darkHex = () => appStore.theme.state.generatedPalettes.dark?.[varName] || '#000000';
                  
                  return (
                    <div>
                      <div class="text-[8px] font-medium text-[var(--color-on-surface-variant)] truncate mb-0.5" title={varName}>
                        {name}
                      </div>
                      <div class="grid grid-cols-2 gap-1">
                        <button
                          onClick={() => copyToClipboard(name)}
                          class="h-6 rounded-md flex items-end justify-end p-0.5 transition-transform hover:scale-105 active:scale-100"
                          style={{ "background-color": lightHex(), color: getContrastColor(lightHex()) }}
                        >
                          <span class="text-[7px] font-mono leading-none">{lightHex()}</span>
                        </button>
                        <button
                          onClick={() => copyToClipboard(name)}
                          class="h-6 rounded-md flex items-end justify-end p-0.5 transition-transform hover:scale-105 active:scale-100"
                          style={{ "background-color": darkHex(), color: getContrastColor(darkHex()) }}
                        >
                          <span class="text-[7px] font-mono leading-none">{darkHex()}</span>
                        </button>
                      </div>
                    </div>
                  );
                }}
              </For>
            </div>
          </Card>
        </div>
      </Show>
    </Portal>
  );
};

export default PaletWarna;
