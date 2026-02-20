import { Component, createSignal, createEffect, For, Show } from "solid-js";
import katex from "katex";
import Modal from "./Modal";
import Button from "./Button";
import SegmentedButton from "./SegmentedButton";

interface MathModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: (latex: string, type: 'inline' | 'block') => void;
  initialValue?: string;
  initialType?: 'inline' | 'block';
  isEdit?: boolean;
}

const MATH_TEMPLATES = [
  // dasar & aljabar
  { label: 'pecahan', value: '\\frac{a}{b}' },
  { label: 'akar kuadrat', value: '\\sqrt{x}' },
  { label: 'akar n', value: '\\sqrt[n]{x}' },
  { label: 'pangkat', value: 'x^{n}' },
  { label: 'indeks (sub)', value: 'x_{i}' },
  { label: 'logaritma', value: '\\log_{b}(x)' },
  { label: 'rumus abc', value: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' },
  
  // trigonometri
  { label: 'identitas trigonometri', value: '\\sin^2(\\theta) + \\cos^2(\\theta) = 1' },
  { label: 'sinus (jumlah sudut)', value: '\\sin(a \\pm b) = \\sin a \\cos b \\pm \\cos a \\sin b' },
  
  // kalkulus
  { label: 'turunan dasar', value: '\\frac{d}{dx}(x^n) = nx^{n-1}' },
  { label: 'integral', value: '\\int_{a}^{b} f(x) \\, dx' },
  { label: 'sigma (jumlah)', value: '\\sum_{i=1}^{n} a_i' },
  { label: 'limit', value: '\\lim_{x \\to a} f(x)' },
  { label: 'deret taylor', value: 'f(x) = \\sum_{n=0}^{\\infty} \\frac{f^{(n)}(a)}{n!}(x-a)^n' },
  { label: 'limit turunan', value: 'f\'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}' },
  
  // aljabar linear
  { label: 'matriks 2x2', value: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
  { label: 'matriks 3x3', value: '\\begin{pmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{pmatrix}' },
  { label: 'determinan 2x2', value: '\\det(A) = \\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix} = ad - bc' },
  { label: 'vektor', value: '\\vec{v}' },
  
  // transformasi
  { label: 'transformasi fourier', value: 'F(\\omega) = \\int_{-\\infty}^{\\infty} f(t) e^{-i\\omega t} \\, dt' },
  { label: 'transformasi laplace', value: 'L\\{f(t)\\} = \\int_{0}^{\\infty} f(t) e^{-st} \\, dt' },
  
  // fisika
  { label: 'hukum newton ii', value: '\\vec{F} = m\\vec{a}' },
  { label: 'persamaan schrödinger', value: 'i\\hbar \\frac{\\partial}{\\partial t} \\Psi(\\mathbf{r}, t) = \\hat{H} \\Psi(\\mathbf{r}, t)' },
  { label: 'gaya gravitasi', value: 'F = G \\frac{m_1 m_2}{r^2}' },
  { label: 'relativitas (massa-energi)', value: 'E = mc^2' },
  { label: 'hukum gauss (maxwell)', value: '\\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\epsilon_0}' },
  
  // statistik & probabilitas
  { label: 'distribusi normal (gauss)', value: 'f(x) = \\frac{1}{\\sigma\\sqrt{2\\pi}} e^{-\\frac{1}{2}(\\frac{x-\\mu}{\\sigma})^2}' },
  
  // geometri
  { label: 'identitas euler', value: 'e^{i\\pi} + 1 = 0' },
  { label: 'teorema pythagoras', value: 'a^2 + b^2 = c^2' },
  { label: 'keliling lingkaran', value: 'K = 2\\pi r' },
  { label: 'luas lingkaran', value: 'L = \\pi r^2' },
];

const MathModal: Component<MathModalProps> = (props) => {
  const [latex, setLatex] = createSignal("");
  const [mathType, setMathType] = createSignal<'inline' | 'block'>("block");
  const [templateModalOpen, setTemplateModalOpen] = createSignal(false);

  createEffect(() => {
    if (props.show) {
      setLatex(props.initialValue || "");
      setMathType(props.initialType || "block");
    }
  });

  const renderPreview = (code: string, displayMode = true) => {
    try {
      return katex.renderToString(code || "\\text{ketik sesuatu...}", {
        displayMode: displayMode,
        throwOnError: false,
      });
    } catch (err) {
      return `<span class="text-error">error: invalid latex</span>`;
    }
  };

  const handleTemplateSelect = (val: string) => {
    setLatex(val);
    setTemplateModalOpen(false);
  };

  return (
    <>
      <Modal 
        show={props.show} 
        onClose={props.onClose} 
        title={props.isEdit ? "edit rumus" : "sisipkan rumus"}
        actions={
          <>
            <Button 
              variant="tonal" 
              onClick={() => setTemplateModalOpen(true)} 
              class="h-[40px] rounded-2xl px-5 mr-auto"
            >
              <span class="material-symbols-rounded mr-2 text-[20px]">grid_view</span>
              galeri templat
            </Button>
            <Button variant="text" onClick={props.onClose}>batal</Button>
            <Button variant="filled" onClick={() => props.onConfirm(latex(), mathType())}>
              {props.isEdit ? "simpan perubahan" : "sisipkan"}
            </Button>
          </>
        }
      >
        <div class="flex flex-col gap-5 py-2">
          {/* Settings Row */}
          <div class="flex items-center justify-between gap-4">
            <div class="flex flex-col gap-2 flex-grow">
              <label class="text-xs font-semibold text-[var(--color-on-surface-variant)] ml-1">peletakan</label>
              <SegmentedButton
                options={[
                  { value: 'inline', label: 'inline' },
                  { value: 'block', label: 'block' }
                ]}
                value={mathType()}
                onChange={(val: any) => setMathType(val)}
                class="w-full"
              />
            </div>
          </div>

          {/* Editor Area */}
          <div class="flex flex-col gap-2">
            <label class="text-xs font-semibold text-[var(--color-on-surface-variant)] ml-1">sumber latex</label>
            <textarea
              class="w-full h-32 p-4 rounded-3xl bg-[var(--color-surface-container)] text-[var(--color-on-surface)] border-2 border-transparent focus:border-[var(--color-primary)] focus:bg-[var(--color-surface-container-high)] outline-none font-mono text-[13px] resize-none transition-all shadow-inner"
              value={latex()}
              onInput={(e) => setLatex(e.currentTarget.value)}
              placeholder="contoh: E = mc^2 atau \frac{a}{b}"
              autofocus
            />
          </div>

          {/* Preview Area */}
          <Show when={latex().trim().length > 0}>
            <div class="flex flex-col gap-2">
              <label class="text-xs font-semibold text-[var(--color-on-surface-variant)] ml-1">preview</label>
              <div 
                class="w-full min-h-[100px] p-6 rounded-3xl bg-[var(--color-surface-container-low)] border-2 border-[var(--color-outline-variant)]/30 flex items-center justify-center overflow-auto shadow-sm"
                innerHTML={renderPreview(latex(), mathType() === 'block')}
              />
            </div>
          </Show>
        </div>
      </Modal>

      {/* Internal Modal: Template Gallery */}
      <Modal 
        show={templateModalOpen()} 
        onClose={() => setTemplateModalOpen(false)} 
        title="galeri templat rumus"
        actions={
          <Button variant="text" onClick={() => setTemplateModalOpen(false)}>tutup</Button>
        }
      >
        <div class="max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar py-2">
          <div class="grid grid-cols-2 gap-4">
            <For each={MATH_TEMPLATES}>
              {(template) => (
                <button 
                  class="flex flex-col items-start gap-3 p-4 rounded-3xl bg-[var(--color-surface-container-low)] border-2 border-transparent hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-container-high)] transition-all text-left group shadow-sm"
                  onClick={() => handleTemplateSelect(template.value)}
                >
                  <span class="text-[11px] font-bold text-[var(--color-on-surface-variant)] group-hover:text-[var(--color-primary)] tracking-tight px-2 py-0.5 rounded-full bg-[var(--color-surface-container)] w-fit">{template.label}</span>
                  <span 
                    class="w-full flex items-center justify-center min-h-[40px]"
                    innerHTML={renderPreview(template.value, false)}
                  />
                </button>
              )}
            </For>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default MathModal;
