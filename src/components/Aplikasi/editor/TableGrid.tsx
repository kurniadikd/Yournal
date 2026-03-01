import { createSignal, For } from "solid-js";
import Checkbox from "../../ui/m3e/Checkbox";
import Button from "../../ui/m3e/Button";

interface TableGridProps {
  onConfirm: (rows: number, cols: number, withHeader: boolean) => void;
}

export default function TableGrid(props: TableGridProps) {
  const [selectedRow, setSelectedRow] = createSignal(2);
  const [selectedCol, setSelectedCol] = createSignal(2);
  const [withHeader, setWithHeader] = createSignal(true);

  // Constants
  const MAX_ROWS = 10;
  const MAX_COLS = 10;

  // Grid generation
  const rows = Array.from({ length: MAX_ROWS }, (_, i) => i + 1);
  const cols = Array.from({ length: MAX_COLS }, (_, i) => i + 1);

  return (
    <div class="flex flex-col w-full min-w-[200px]">
        <div class="mb-3 px-1">
            <Checkbox 
                checked={withHeader()} 
                onChange={setWithHeader} 
                label="Baris Header" 
            />
        </div>
        
        <div class="flex flex-col gap-1.5 p-1 bg-[var(--color-surface-container-low)] rounded-xl border border-[var(--color-outline-variant)]/30">
            <For each={rows}>
                {(row) => (
                    <div class="flex gap-1.5 justify-center">
                        <For each={cols}>
                            {(col) => (
                                <div 
                                    class={`
                                        w-5 h-5 border rounded-[3px] cursor-pointer transition-all duration-200
                                        ${row <= selectedRow() && col <= selectedCol() 
                                            ? 'bg-[var(--color-primary)] border-[var(--color-primary)] shadow-sm' 
                                            : 'bg-[var(--color-surface-container-highest)] border-[var(--color-outline-variant)] hover:border-[var(--color-outline)]'}
                                    `}
                                    onClick={() => {
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
        
        <div class="flex flex-col gap-2 mt-4">
            <div class="text-center text-sm font-bold text-[var(--color-primary)] bg-[var(--color-primary-container)] py-1 rounded-lg">
                Ukuran: {selectedRow()} x {selectedCol()}
            </div>
            
            <Button 
                variant="filled" 
                class="w-full !rounded-xl"
                onClick={() => props.onConfirm(selectedRow(), selectedCol(), withHeader())}
            >
                Sisipkan Tabel
            </Button>
        </div>
    </div>
  );
}
