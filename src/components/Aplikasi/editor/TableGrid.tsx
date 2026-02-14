import { createSignal, For, Show } from "solid-js";
import Checkbox from "../../ui/m3e/Checkbox";

interface TableGridProps {
  onConfirm: (rows: number, cols: number, withHeader: boolean) => void;
}

export default function TableGrid(props: TableGridProps) {
  const [hoveredRow, setHoveredRow] = createSignal(0);
  const [hoveredCol, setHoveredCol] = createSignal(0);
  const [withHeader, setWithHeader] = createSignal(true);

  // Constants
  const MAX_ROWS = 10;
  const MAX_COLS = 10;

  // Grid generation
  const rows = Array.from({ length: MAX_ROWS }, (_, i) => i + 1);
  const cols = Array.from({ length: MAX_COLS }, (_, i) => i + 1);

  return (
    <div class="flex flex-col">
        <div class="mb-2 px-1">
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
                                        w-4 h-4 border rounded-[2px] cursor-pointer transition-colors duration-100
                                        ${row <= hoveredRow() && col <= hoveredCol() 
                                            ? 'bg-[var(--color-primary-container)] border-[var(--color-primary)]' 
                                            : 'bg-[var(--color-surface-container-high)] border-[var(--color-outline-variant)]'}
                                    `}
                                    onMouseOver={() => {
                                        setHoveredRow(row);
                                        setHoveredCol(col);
                                    }}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        props.onConfirm(hoveredRow(), hoveredCol(), withHeader());
                                    }}
                                />
                            )}
                        </For>
                    </div>
                )}
            </For>
        </div>
        
        <div class="text-center mt-2 text-xs font-medium text-[var(--color-on-surface-variant)]">
            {hoveredRow()} x {hoveredCol()}
        </div>
    </div>
  );
}
