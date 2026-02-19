import { Component, createSignal, createEffect, For, Show, onCleanup, untrack, batch } from "solid-js";
import katex from "katex";
import Modal from "./Modal";
import Button from "./Button";
import { extractVariables, evaluateLatex, formatResult, getInteractiveLatex } from "../../../utils/latexEvaluator";

interface MathSimulationModalProps {
  show: boolean;
  onClose: () => void;
  latex: string;
}

const MathSimulationModal: Component<MathSimulationModalProps> = (props) => {
  const [variables, setVariables] = createSignal<string[]>([]);
  const [values, setValues] = createSignal<Record<string, string>>({});
  const [result, setResult] = createSignal<string | null>(null);
  const [resultError, setResultError] = createSignal<string | null>(null);
  const [hasCalculated, setHasCalculated] = createSignal(false);
  const [activeVar, setActiveVar] = createSignal<string | null>(null);
  
  let previewRef: HTMLDivElement | undefined;
  let activeInputRef: HTMLInputElement | undefined;

  // Re-parse variables when LaTeX changes or modal opens
  createEffect(() => {
    if (props.show && props.latex) {
      batch(() => {
        const vars = extractVariables(props.latex);
        setVariables(vars);
        
        // Initialize empty values if not set
        // Use untrack to prevent infinite loop since we are reading and writing values()
        const currentVals = untrack(values);
        const nextVals: Record<string, string> = { ...currentVals };
        let changed = false;
        
        vars.forEach(v => { 
          if (nextVals[v] === undefined) {
            nextVals[v] = ''; 
            changed = true;
          }
        });
        
        if (changed) {
          setValues(nextVals);
        }
        
        // Check if all variables are filled to pre-calculate
        const allFilled = vars.length > 0 && vars.every(v => nextVals[v] !== '');
        if (allFilled) {
          doEvaluate();
        } else {
          setResult(null);
          setResultError(null);
          setHasCalculated(false);
        }
      });
    }
  });

  // Attach event listeners to the interactive preview
  createEffect(() => {
    if (previewRef && props.show) {
      const handleClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const varElement = target.closest('.math-var-pld');
        if (varElement) {
          const varClass = Array.from(varElement.classList).find(c => c.startsWith('var-'));
          if (varClass) {
            const varName = varClass.replace('var-', '');
            // Find the original variable name (might have backslashes)
            const originalVar = variables().find(v => v.replace(/\\/g, '').replace(/[\{\}]/g, '') === varName);
            if (originalVar) {
              setActiveVar(originalVar);
              setTimeout(() => activeInputRef?.focus(), 50);
            }
          }
        }
      };

      previewRef.addEventListener('click', handleClick);
      onCleanup(() => previewRef?.removeEventListener('click', handleClick));
    }
  });

  const handleValueChange = (varName: string, val: string) => {
    setValues(prev => ({ ...prev, [varName]: val }));
    
    // Auto-evaluate if enough variables are filled
    const vList = variables();
    const allFilled = vList.length > 0 && vList.every(v => {
      const vVal = v === varName ? val : values()[v];
      return vVal !== '' && !isNaN(Number(vVal));
    });

    if (allFilled) {
      doEvaluate(varName, val);
    }
  };

  const doEvaluate = (changedVar?: string, changedVal?: string) => {
    const numericValues: Record<string, number> = {};
    const currentValues = values();
    
    const vList = variables();
    for (const v of vList) {
      const strVal = (changedVar === v && changedVal !== undefined) ? changedVal : currentValues[v];
      if (strVal === '' || isNaN(Number(strVal))) {
        setResultError('Harap isi semua variabel');
        setResult(null);
        return;
      }
      numericValues[v] = Number(strVal);
    }

    const { result: res, error } = evaluateLatex(props.latex, numericValues);
    setHasCalculated(true);
    if (error) {
      setResultError(error);
      setResult(null);
    } else if (res !== null) {
      setResult(formatResult(res));
      setResultError(null);
    }
  };

  const handleCalculate = () => {
    doEvaluate();
  };

  const renderPreview = () => {
    try {
      const interactiveLatex = getInteractiveLatex(props.latex, variables());
      return katex.renderToString(interactiveLatex || "\\text{tanpa rumus}", {
        displayMode: true,
        throwOnError: false,
        trust: true, // Required for htmlClass
        strict: false, // Required for htmlClass in some versions/configs
      });
    } catch (e) {
      console.error("KaTeX error:", e);
      return `<span class="text-error">error rendering</span>`;
    }
  };

  const displayVarName = (v: string) => {
    if (v.startsWith('\\') || v.includes('_')) {
      try {
        return katex.renderToString(v, { 
          throwOnError: false,
          strict: false
        });
      } catch {
        return v;
      }
    }
    return null;
  };

  return (
    <Modal
      show={props.show}
      onClose={props.onClose}
      title="simulasi rumus"
      maxWidth="520px"
      actions={
        <div class="flex justify-between w-full items-center">
          <div class="text-[11px] text-[var(--color-on-surface-variant)] opacity-60">
            {variables().length > 0 ? `${variables().length} variabel terdeteksi` : 'tidak ada variabel'}
          </div>
          <div class="flex gap-2">
            <Button variant="text" onClick={props.onClose}>tutup</Button>
            <Show when={variables().length > 0}>
              <Button variant="filled" onClick={handleCalculate}>
                <span class="material-symbols-rounded mr-1.5 text-[18px]">calculate</span>
                hitung
              </Button>
            </Show>
          </div>
        </div>
      }
    >
      <div class="flex flex-col gap-6 py-2">
        {/* Formula Preview with Interactivity */}
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <label class="text-[11px] font-bold text-[var(--color-secondary)] tracking-tight ml-1 px-2 py-0.5 rounded-full bg-[var(--color-secondary-container)]/30 w-fit">rumus</label>
            <span class="text-[10px] text-[var(--color-on-surface-variant)] opacity-50 italic">klik variabel di rumus untuk mengedit</span>
          </div>
          <div 
            ref={previewRef}
            class="w-full min-h-[100px] p-6 rounded-[28px] bg-[var(--color-surface-container-low)] border-2 border-[var(--color-outline-variant)]/20 flex items-center justify-center overflow-auto shadow-sm transition-all"
            innerHTML={renderPreview()}
          />
        </div>

        {/* Dynamic Variable Input */}
        <div class="flex flex-col gap-3 min-h-[120px]">
          <label class="text-[11px] font-bold text-[var(--color-secondary)] tracking-tight ml-1 px-2 py-0.5 rounded-full bg-[var(--color-secondary-container)]/30 w-fit">masukkan nilai</label>
          
          <Show 
            when={variables().length > 0} 
            fallback={
              <div class="text-center py-4 text-[var(--color-on-surface-variant)] opacity-40">
                <p class="text-xs">Rumus ini tidak memiliki variabel yang bisa diinput.</p>
              </div>
            }
          >
            <div class="grid grid-cols-2 gap-4">
              <For each={variables()}>
                {(varName) => {
                  const rendered = displayVarName(varName);
                  const isActive = () => activeVar() === varName;
                  
                  return (
                    <div 
                      class={`flex flex-col gap-1.5 p-3 rounded-2xl transition-all border-2 ${
                        isActive() 
                          ? 'bg-[var(--color-secondary-container)]/20 border-[var(--color-secondary)]' 
                          : 'bg-[var(--color-surface-container)] border-transparent'
                      }`}
                    >
                      <div class="flex items-center gap-2 ml-1">
                        <div class="h-5 flex items-center">
                          {rendered ? (
                            <span class="text-sm font-medium" innerHTML={rendered} />
                          ) : (
                            <span class="text-sm font-mono font-bold">{varName}</span>
                          )}
                        </div>
                        <span class="text-xs text-[var(--color-on-surface-variant)] opacity-40">:</span>
                      </div>
                      <input
                        ref={el => { if (isActive()) activeInputRef = el; }}
                        type="number"
                        step="any"
                        class="w-full bg-transparent border-none text-[var(--color-on-surface)] outline-none font-mono text-lg"
                        placeholder="0"
                        value={values()[varName] || ''}
                        onInput={(e) => handleValueChange(varName, e.currentTarget.value)}
                        onFocus={() => setActiveVar(varName)}
                        onKeyDown={(e) => { 
                          if (e.key === 'Enter') handleCalculate();
                          if (e.key === 'Escape') setActiveVar(null);
                        }}
                      />
                    </div>
                  );
                }}
              </For>
            </div>
          </Show>
        </div>

        {/* Result Display */}
        <div class="mt-2">
          <Show when={hasCalculated() || resultError()}>
            <div class="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <label class="text-[11px] font-bold text-[var(--color-tertiary)] tracking-tight ml-1 px-2 py-0.5 rounded-full bg-[var(--color-tertiary-container)]/30 w-fit">hasil</label>
              <Show 
                when={!resultError()} 
                fallback={
                  <div class="w-full p-4 rounded-[24px] bg-[var(--color-error-container)]/10 border border-[var(--color-error)]/30 flex items-center gap-3">
                    <span class="material-symbols-rounded text-[var(--color-error)]">info</span>
                    <p class="text-xs text-[var(--color-on-error-container)]">{resultError()}</p>
                  </div>
                }
              >
                <div class="w-full p-6 rounded-[28px] bg-[var(--color-tertiary)] text-[var(--color-on-tertiary)] shadow-lg flex flex-col items-center justify-center gap-1">
                  <span class="text-xs font-medium opacity-80 tracking-widest">Result</span>
                  <span class="text-4xl font-bold font-mono tracking-tighter">
                    {result()}
                  </span>
                </div>
              </Show>
            </div>
          </Show>
        </div>
      </div>
    </Modal>
  );
};

export default MathSimulationModal;
