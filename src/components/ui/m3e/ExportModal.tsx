import { createSignal, Show } from "solid-js";
import Modal from "./Modal";
import Button from "./Button";

export interface ExportSettings {
  paperSize: 'A4' | 'Letter' | 'Legal' | 'F4';
  orientation: 'portrait' | 'landscape';
  margin: 'normal' | 'narrow' | 'wide';
  fontSize: 'small' | 'normal' | 'large';
}

interface ExportModalProps {
  show: boolean;
  onClose: () => void;
  onExport: (settings: ExportSettings) => void;
  title: string;
  content: string;
  dateStr: string;
  timeStr: string;
}

const PAPER_SIZES = [
  { value: 'A4', label: 'A4', desc: '210 × 297 mm', aspect: 210/297 },
  { value: 'Letter', label: 'Letter', desc: '216 × 279 mm', aspect: 216/279 },
  { value: 'Legal', label: 'Legal', desc: '216 × 356 mm', aspect: 216/356 },
  { value: 'F4', label: 'Folio (F4)', desc: '215 × 330 mm', aspect: 215/330 },
] as const;

const MARGIN_VALS = {
  normal: '12%',
  narrow: '6%',
  wide: '20%'
};

const FONT_VALS = {
  small: '0.8rem',
  normal: '1rem',
  large: '1.2rem'
};

export default function ExportModal(props: ExportModalProps) {
  const [paperSize, setPaperSize] = createSignal<ExportSettings['paperSize']>('A4');
  const [orientation, setOrientation] = createSignal<ExportSettings['orientation']>('portrait');
  const [margin, setMargin] = createSignal<ExportSettings['margin']>('normal');
  const [fontSize, setFontSize] = createSignal<ExportSettings['fontSize']>('normal');

  const handleExport = () => {
    props.onExport({
      paperSize: paperSize(),
      orientation: orientation(),
      margin: margin(),
      fontSize: fontSize(),
    });
  };

  const SectionLabel = (p: { text: string }) => (
    <div class="flex items-center gap-2 mb-2">
      <span class="text-sm font-semibold text-[var(--color-on-surface)]">{p.text}</span>
    </div>
  );

  const OptionChip = (p: { 
    label: string; 
    desc?: string; 
    selected: boolean; 
    onClick: () => void 
  }) => (
    <button
      type="button"
      onClick={p.onClick}
      class={`
        flex flex-col items-start px-3 py-1.5 rounded-xl text-left transition-all duration-200 border
        ${p.selected
          ? 'bg-[var(--color-primary-container)] border-[var(--color-primary)] text-[var(--color-on-primary-container)]'
          : 'bg-[var(--color-surface-container)] border-transparent text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)]'}
      `}
    >
      <span class={`text-sm ${p.selected ? 'font-bold' : 'font-medium'}`}>{p.label}</span>
      <Show when={p.desc}>
        <span class="text-[10px] opacity-70 mt-0">{p.desc}</span>
      </Show>
    </button>
  );

  const getAspect = () => {
    const base = PAPER_SIZES.find(ps => ps.value === paperSize())?.aspect || 0.7;
    return orientation() === 'portrait' ? base : 1 / base;
  };

  return (
    <Modal
      show={props.show}
      onClose={props.onClose}
      title="Ekspor Catatan"
      maxWidth="860px"
      actions={
        <div class="flex items-center justify-end gap-2 px-6 py-3 border-t border-[var(--color-outline-variant)]/10">
          <Button variant="text" onClick={props.onClose}>Batal</Button>
          <Button variant="filled" onClick={handleExport}>
            <span class="material-symbols-rounded text-[18px]">print</span>
            Cetak / PDF
          </Button>
        </div>
      }
    >
      <div class="flex h-[580px] overflow-hidden">
        
        {/* Left: Settings */}
        <div class="w-[320px] p-6 space-y-4 overflow-y-auto no-scrollbar border-r border-[var(--color-outline-variant)]/10 bg-[var(--color-surface-container-low)]/30">
          
          {/* Paper Size */}
          <div>
            <SectionLabel text="Ukuran Kertas" />
            <div class="grid grid-cols-2 gap-2">
              {PAPER_SIZES.map(ps => (
                <OptionChip
                  label={ps.label}
                  desc={ps.desc}
                  selected={paperSize() === ps.value}
                  onClick={() => setPaperSize(ps.value)}
                />
              ))}
            </div>
          </div>

          {/* Orientation */}
          <div>
            <SectionLabel text="Orientasi" />
            <div class="grid grid-cols-2 gap-2">
              <OptionChip
                label="Potret"
                desc="Vertikal"
                selected={orientation() === 'portrait'}
                onClick={() => setOrientation('portrait')}
              />
              <OptionChip
                label="Lanskap"
                desc="Horizontal"
                selected={orientation() === 'landscape'}
                onClick={() => setOrientation('landscape')}
              />
            </div>
          </div>

          {/* Margins */}
          <div>
            <SectionLabel text="Margin" />
            <div class="grid grid-cols-3 gap-2">
              {(Object.keys(MARGIN_VALS) as Array<keyof typeof MARGIN_VALS>).map(m => (
                <OptionChip
                  label={m.charAt(0).toUpperCase() + m.slice(1)}
                  selected={margin() === m}
                  onClick={() => setMargin(m)}
                />
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div>
            <SectionLabel text="Ukuran Font" />
            <div class="grid grid-cols-3 gap-2">
              {(Object.keys(FONT_VALS) as Array<keyof typeof FONT_VALS>).map(fs => (
                <OptionChip
                  label={fs.charAt(0).toUpperCase() + fs.slice(1)}
                  selected={fontSize() === fs}
                  onClick={() => setFontSize(fs)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right: Live Preview */}
        <div class="flex-1 bg-black/5 flex items-center justify-center p-8 overflow-hidden relative">
          <div class="absolute top-4 left-4 text-[10px] font-bold text-[var(--color-on-surface-variant)] opacity-40 uppercase tracking-widest">
            Pratinjau Halaman
          </div>
          
          {/* The Paper Component */}
          <div 
            class="bg-white shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] overflow-hidden flex flex-col origin-center"
            style={{
              width: orientation() === 'portrait' ? 'auto' : '100%',
              height: orientation() === 'portrait' ? '100%' : 'auto',
              'aspect-ratio': getAspect(),
              padding: MARGIN_VALS[margin()],
              'font-size': FONT_VALS[fontSize()],
            }}
          >
            <div class="flex flex-col h-full w-full overflow-hidden text-[#1a1a1a]">
              <div class="mb-4 border-b-2 border-gray-100 pb-3">
                <h1 class="text-[2em] font-bold leading-tight mb-1">
                  {props.title || 'Judul Catatan'}
                </h1>
                <div class="text-[0.75em] text-gray-500 font-medium">
                  {props.dateStr} &bull; {props.timeStr}
                </div>
              </div>
              <div 
                class="flex-1 text-[0.85em] leading-[1.6] opacity-90 prose prose-sm prose-p:my-1 prose-headings:my-2 prose-img:rounded-lg"
                innerHTML={props.content || '<p class="opacity-30 italic">Konten kosong...</p>'}
              />
            </div>
          </div>
        </div>

      </div>
    </Modal>
  );
}
