import { createSignal, Show, For, createMemo } from "solid-js";
import Modal from "./Modal";
import Button from "./Button";
import IconButton from "./IconButton";

interface TimePickerProps {
  show: boolean;
  onClose: () => void;
  hour?: number; // 0-23
  minute?: number; // 0-59
  onSelect: (hour: number, minute: number) => void;
  title?: string;
  use24Hour?: boolean;
}

/**
 * M3 Expressive Time Picker - Ported from Alpha Source
 */
export default function TimePicker(props: TimePickerProps) {
  const [hour, setHour] = createSignal(props.hour ?? 12);
  const [minute, setMinute] = createSignal(props.minute ?? 0);
  const [isAm, setIsAm] = createSignal(hour() < 12);
  const [mode, setMode] = createSignal<'dial' | 'input'>('dial');
  const [activeCell, setActiveCell] = createSignal<'hour' | 'minute'>('hour');

  const displayHour = () => {
    if (props.use24Hour) return hour().toString().padStart(2, '0');
    let h = hour() % 12;
    if (h === 0) h = 12;
    return h.toString().padStart(2, '0');
  };

  const displayMinute = () => minute().toString().padStart(2, '0');

  const handleSelect = () => {
    props.onSelect(hour(), minute());
    props.onClose();
  };

  const setTimeValue = (val: number) => {
    if (activeCell() === 'hour') {
      if (props.use24Hour) {
        setHour(val);
      } else {
        let h = val % 12;
        if (!isAm()) h += 12;
        setHour(h);
      }
      setActiveCell('minute');
    } else {
      setMinute(val);
    }
  };

  return (
    <Modal
      show={props.show}
      onClose={props.onClose}
      title={props.title || "Pilih Waktu"}
      actions={
        <div class="flex gap-2 w-full pt-4">
          <Button variant="tonal" class="flex-1 !rounded-full py-6" onClick={props.onClose}>Batal</Button>
          <Button variant="filled" class="flex-1 !rounded-full py-6" onClick={handleSelect}>Selesai</Button>
        </div>
      }
    >
      <div class="flex flex-col items-center py-2 space-y-8">
        {/* Supporting Text */}
        <div class="w-full text-start">
          <p class="text-[var(--color-on-surface-variant)] text-[10px] font-bold uppercase tracking-[0.2em] mb-2 px-2">
            PILIH WAKTU
          </p>
        </div>

        {/* Time Display Display */}
        <div class="flex items-center gap-2">
          {/* Hour Chip */}
          <button
            onClick={() => setActiveCell('hour')}
            class={`
              w-24 h-20 rounded-[12px] flex items-center justify-center text-5xl font-light transition-colors relative transition-all duration-300
              ${activeCell() === 'hour' 
                ? 'bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] scale-105' 
                : 'bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface)]'}
            `}
          >
            {displayHour()}
          </button>
          
          <span class="text-5xl font-light text-[var(--color-on-surface)] animate-pulse">:</span>

          {/* Minute Chip */}
          <button
            onClick={() => setActiveCell('minute')}
            class={`
              w-24 h-20 rounded-[12px] flex items-center justify-center text-5xl font-light transition-colors relative transition-all duration-300
              ${activeCell() === 'minute' 
                ? 'bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] scale-105' 
                : 'bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface)]'}
            `}
          >
            {displayMinute()}
          </button>

          {/* AM/PM Toggle */}
          <Show when={!props.use24Hour}>
            <div class="flex flex-col bg-[var(--color-surface-container-high)] rounded-xl overflow-hidden ml-2 h-20 box-border">
              <button 
                onClick={() => { setIsAm(true); if (hour() >= 12) setHour(hour() - 12); }}
                class={`flex-1 px-4 text-xs font-bold transition-colors ${isAm() ? 'bg-[var(--color-tertiary-container)] text-[var(--color-on-tertiary-container)]' : 'text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)]'}`}
              >
                AM
              </button>
              <div class="h-[1px] bg-[var(--color-outline-variant)] opacity-20" />
              <button 
                onClick={() => { setIsAm(false); if (hour() < 12) setHour(hour() + 12); }}
                class={`flex-1 px-4 text-xs font-bold transition-colors ${!isAm() ? 'bg-[var(--color-tertiary-container)] text-[var(--color-on-tertiary-container)]' : 'text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)]'}`}
              >
                PM
              </button>
            </div>
          </Show>
        </div>

        {/* Dynamic Mode Content */}
        <Show when={mode() === 'dial'}>
           <TimeDial 
              type={activeCell()} 
              value={activeCell() === 'hour' ? (props.use24Hour ? hour() : (hour() % 12 || 12)) : minute()}
              onSelect={setTimeValue}
              is24h={props.use24Hour}
           />
        </Show>

        {/* Keyboard Toggle Icon */}
        <div class="w-full flex justify-start pt-2">
          <IconButton 
            variant="standard"
            icon={mode() === 'dial' ? "keyboard" : "schedule"} 
            onClick={() => setMode(mode() === 'dial' ? 'input' : 'dial')}
          />
        </div>
      </div>
    </Modal>
  );
}

/**
 * Clock Dial Sub-component
 */
function TimeDial(props: { type: 'hour' | 'minute', value: number, onSelect: (v: number) => void, is24h?: boolean }) {
  const rotation = () => {
    let val = props.value;
    if (props.type === 'hour' && val === 12 && !props.is24h) val = 0;
    return val * (360 / (props.type === 'hour' ? 12 : 60));
  };

  const handRotation = createMemo(() => rotation());

  return (
    <div class="relative w-64 h-64 rounded-full bg-[var(--color-surface-container-highest)] flex items-center justify-center">
      {/* Clock Hand */}
      <div 
        class="absolute w-0.5 bg-[var(--color-primary)] origin-bottom transition-transform duration-500 cubic-bezier(0.175, 0.885, 0.32, 1.275) pointer-events-none"
        style={{ 
          height: '100px', 
          bottom: '50%', 
          transform: `rotate(${handRotation()}deg)` 
        }}
      >
        <div class="absolute -top-4 -left-[15px] w-8 h-8 rounded-full bg-[var(--color-primary)] opacity-40 animate-pulse" />
        <div class="absolute -top-4 -left-[15px] w-8 h-8 rounded-full bg-[var(--color-primary)]" />
      </div>
      <div class="absolute w-2 h-2 rounded-full bg-[var(--color-primary)] z-10" />

      {/* Dial Numbers */}
      <For each={props.type === 'hour' ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]}>
        {(num, i) => {
          const angle = (i() * 30) - 90;
          const x = 100 * Math.cos(angle * Math.PI / 180);
          const y = 100 * Math.sin(angle * Math.PI / 180);
          
          return (
            <button
              onClick={() => props.onSelect(num)}
              class={`
                absolute w-10 h-10 rounded-full flex items-center justify-center text-sm font-light transition-all duration-300
                ${props.value === num ? 'text-[var(--color-on-primary)] font-bold' : 'text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container)]'}
              `}
              style={{ transform: `translate(${x}px, ${y}px)` }}
            >
              {num === 0 && props.type === 'minute' ? '00' : num}
            </button>
          );
        }}
      </For>
    </div>
  );
}
