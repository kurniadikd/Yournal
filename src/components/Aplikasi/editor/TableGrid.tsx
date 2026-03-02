import { createSignal, For } from "solid-js";
import Checkbox from "../../ui/m3e/Checkbox";

interface TableGridProps {
  onConfirm: (rows: number, cols: number, withHeader: boolean) => void;
}

export default function TableGrid(props: TableGridProps) {
  const [selectedRow, setSelectedRow] = createSignal(1);
  const [selectedCol, setSelectedCol] = createSignal(1);
  const [withHeader, setWithHeader] = createSignal(true);

  // Constants
  const MAX_ROWS = 10;
  const MAX_COLS = 10;

  // Grid generation
  const rows = Array.from({ length: MAX_ROWS }, (_, i) => i + 1);
  const cols = Array.from({ length: MAX_COLS }, (_, i) => i + 1);

  return (
    <div class="flex flex-col" onMouseDown={(e) => e.stopPropagation()}>
        <div class="mb-2 px-1" onClick={(e) => e.stopPropagation()}>
            <Checkbox 
                checked={withHeader()} 
                onChange={setWithHeader} 
                label="With Header Row" 
            />
        </div>
        
        <div class="flex flex-col gap-1">
            <For each={rows}>
                {(row) => (
                    <div class="flex gap-1">
                        <For each={cols}>
                            {(col) => (
                                <div 
                                    class={`
                                        w-5 h-5 border rounded-[4px] cursor-pointer transition-all duration-200
                                        ${row <= selectedRow() && col <= selectedCol() 
                                            ? 'bg-[var(--color-primary)] border-[var(--color-primary)] shadow-sm' 
                                            : 'bg-[var(--color-surface-container-high)] border-[var(--color-outline-variant)] hover:border-[var(--color-primary)]'}
                                    `}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setSelectedRow(row);
                                        setSelectedCol(col);
                                    }}
                                />
                            )}
                        </For>
                    </div>
                )}
            </For>
        </div>
        
        <div class="text-center my-3 text-sm font-bold text-[var(--color-primary)] bg-[var(--color-primary-container)] py-1 rounded-lg">
            {selectedRow()} Kolom x {selectedCol()} Baris
        </div>

        <button
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                props.onConfirm(selectedRow(), selectedCol(), withHeader());
            }}
            class="w-full mt-1 bg-[var(--color-primary)] text-[var(--color-on-primary)] py-2.5 rounded-xl font-bold text-sm shadow-md active:scale-[0.98] transition-all flex items-center justify-center"
        >
            Sisipkan
        </button>
    </div>
  );
}
