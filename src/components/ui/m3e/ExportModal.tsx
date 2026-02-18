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
}

const PAPER_SIZES = [
  { value: 'A4', label: 'A4', desc: '210 × 297 mm' },
  { value: 'Letter', label: 'Letter', desc: '216 × 279 mm' },
  { value: 'Legal', label: 'Legal', desc: '216 × 356 mm' },
  { value: 'F4', label: 'Folio (F4)', desc: '215 × 330 mm' },
] as const;

const MARGINS = [
  { value: 'normal', label: 'Normal', desc: '2.54 cm' },
  { value: 'narrow', label: 'Sempit', desc: '1.27 cm' },
  { value: 'wide', label: 'Lebar', desc: '5.08 cm' },
] as const;

const FONT_SIZES = [
  { value: 'small', label: 'Kecil', desc: '10pt' },
  { value: 'normal', label: 'Normal', desc: '12pt' },
  { value: 'large', label: 'Besar', desc: '14pt' },
] as const;

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

  const SectionLabel = (p: { text: string; icon: string }) => (
    <div class="flex items-center gap-2 mb-2">
      <span class="material-symbols-rounded text-[18px] text-[var(--color-primary)]">{p.icon}</span>
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
        flex flex-col items-start px-3 py-2 rounded-xl text-left transition-all duration-200 border
        ${p.selected
          ? 'bg-[var(--color-primary-container)] border-[var(--color-primary)] text-[var(--color-on-primary-container)]'
          : 'bg-[var(--color-surface-container)] border-transparent text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)]'}
      `}
    >
      <span class={`text-sm ${p.selected ? 'font-bold' : 'font-medium'}`}>{p.label}</span>
      <Show when={p.desc}>
        <span class="text-[11px] opacity-70 mt-0.5">{p.desc}</span>
      </Show>
    </button>
  );

  return (
    <Modal
      show={props.show}
      onClose={props.onClose}
      title="Ekspor Catatan"
      maxWidth="420px"
      actions={
        <div class="flex items-center justify-end gap-2 px-6 py-3">
          <Button variant="text" onClick={props.onClose}>Batal</Button>
          <Button variant="filled" onClick={handleExport}>
            <span class="material-symbols-rounded text-[18px]">print</span>
            Cetak / PDF
          </Button>
        </div>
      }
    >
      <div class="px-6 py-4 space-y-5">

        {/* Paper Size */}
        <div>
          <SectionLabel text="Ukuran Kertas" icon="description" />
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
          <SectionLabel text="Orientasi" icon="screen_rotation" />
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
          <SectionLabel text="Margin" icon="padding" />
          <div class="grid grid-cols-3 gap-2">
            {MARGINS.map(m => (
              <OptionChip
                label={m.label}
                desc={m.desc}
                selected={margin() === m.value}
                onClick={() => setMargin(m.value)}
              />
            ))}
          </div>
        </div>

        {/* Font Size */}
        <div>
          <SectionLabel text="Ukuran Font" icon="text_fields" />
          <div class="grid grid-cols-3 gap-2">
            {FONT_SIZES.map(fs => (
              <OptionChip
                label={fs.label}
                desc={fs.desc}
                selected={fontSize() === fs.value}
                onClick={() => setFontSize(fs.value)}
              />
            ))}
          </div>
        </div>

      </div>
    </Modal>
  );
}
