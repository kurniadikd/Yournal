import { createSignal, Show, Index, createEffect, createMemo } from "solid-js";
import Modal from "./Modal";
import Button from "./Button";
import IconButton from "./IconButton";

/**
 * Detect if the user's system locale uses 24-hour time format.
 * Uses `undefined` locale to let the runtime pick the system default,
 * then checks resolvedOptions for hour12. Falls back to formatting check.
 */
function systemUses24Hour(): boolean {
  try {
    const resolved = new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions();
    if (typeof resolved.hour12 === 'boolean') return !resolved.hour12;
    // Fallback: format 13:00 and check for AM/PM markers
    const formatted = new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).format(new Date(2000, 0, 1, 13));
    return !/AM|PM|am|pm/i.test(formatted);
  } catch {
    return false;
  }
}

interface TimePickerProps {
  show: boolean;
  onClose: () => void;
  hour?: number; // 0-23
  minute?: number; // 0-59
  onSelect: (hour: number, minute: number) => void;
  title?: string;
  use24Hour?: boolean; // undefined = auto-detect from system
}

export default function TimePicker(props: TimePickerProps) {
  const is24h = createMemo(() => props.use24Hour ?? systemUses24Hour());

  const [hour24, setHour24] = createSignal(props.hour ?? new Date().getHours());
  const [minute, setMinute] = createSignal(props.minute ?? 0);
  const [isAm, setIsAm] = createSignal(true);
  const [mode, setMode] = createSignal<'dial' | 'input'>('dial');
  const [activeCell, setActiveCell] = createSignal<'hour' | 'minute'>('hour');

  // Sync signals when picker opens
  createEffect(() => {
    if (props.show) {
      const h = props.hour ?? new Date().getHours();
      const m = props.minute ?? 0;
      setHour24(h);
      setMinute(m);
      setIsAm(h < 12);
      setActiveCell('hour');
      setMode('dial');
    }
  });

  const displayHour = () => {
    if (is24h()) return hour24().toString().padStart(2, '0');
    let h = hour24() % 12;
    if (h === 0) h = 12;
    return h.toString().padStart(2, '0');
  };

  const displayMinute = () => minute().toString().padStart(2, '0');

  const dialHourValue = () => {
    if (is24h()) return hour24();
    const h = hour24() % 12;
    return h === 0 ? 12 : h;
  };

  const handleSelect = () => {
    props.onSelect(hour24(), minute());
    props.onClose();
  };

  const setTimeFromDial = (val: number) => {
    if (activeCell() === 'hour') {
      if (is24h()) {
        setHour24(val);
      } else {
        let h = val % 12;
        if (!isAm()) h += 12;
        setHour24(h);
      }
      setActiveCell('minute');
    } else {
      setMinute(val);
    }
  };

  const toggleAm = () => {
    setIsAm(true);
    if (hour24() >= 12) setHour24(hour24() - 12);
  };

  const togglePm = () => {
    setIsAm(false);
    if (hour24() < 12) setHour24(hour24() + 12);
  };

  const handleHourInput = (e: Event) => {
    const target = e.target as HTMLInputElement;
    let val = parseInt(target.value, 10);
    if (isNaN(val)) return;
    if (is24h()) {
      val = Math.max(0, Math.min(23, val));
      setHour24(val);
    } else {
      val = Math.max(1, Math.min(12, val));
      let h = val % 12;
      if (!isAm()) h += 12;
      setHour24(h);
    }
  };

  const handleMinuteInput = (e: Event) => {
    const target = e.target as HTMLInputElement;
    let val = parseInt(target.value, 10);
    if (isNaN(val)) return;
    setMinute(Math.max(0, Math.min(59, val)));
  };

  return (
    <Modal
      show={props.show}
      onClose={props.onClose}
      title={props.title || "Pilih Waktu"}
      maxWidth="360px"
      actions={
        <div class="flex gap-2 w-full pt-2">
          <Button variant="tonal" class="flex-1 !rounded-full py-3" onClick={props.onClose}>Batal</Button>
          <Button variant="filled" class="flex-1 !rounded-full py-3" onClick={handleSelect}>Selesai</Button>
        </div>
      }
    >
      <div class="flex flex-col items-center py-1 space-y-4" style={{ "max-width": "320px", margin: "0 auto" }}>


        {/* Time Display */}
        <div class="flex items-center gap-2">
          {/* Hour */}
          <Show when={mode() === 'dial'} fallback={
            <input
              type="number"
              min={is24h() ? 0 : 1}
              max={is24h() ? 23 : 12}
              value={is24h() ? hour24() : (hour24() % 12 || 12)}
              onInput={handleHourInput}
              onFocus={() => setActiveCell('hour')}
              class={`
                w-24 h-20 rounded-[12px] text-center text-5xl font-light transition-all duration-300 border-none outline-none
                [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none
                ${activeCell() === 'hour'
                  ? 'bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] scale-105'
                  : 'bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface)]'}
              `}
            />
          }>
            <button
              onClick={() => setActiveCell('hour')}
              class={`
                w-24 h-20 rounded-[12px] flex items-center justify-center text-5xl font-light transition-all duration-300
                ${activeCell() === 'hour'
                  ? 'bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] scale-105'
                  : 'bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface)]'}
              `}
            >
              {displayHour()}
            </button>
          </Show>

          <span class="text-5xl font-light text-[var(--color-on-surface)]">:</span>

          {/* Minute */}
          <Show when={mode() === 'dial'} fallback={
            <input
              type="number"
              min={0}
              max={59}
              value={minute()}
              onInput={handleMinuteInput}
              onFocus={() => setActiveCell('minute')}
              class={`
                w-24 h-20 rounded-[12px] text-center text-5xl font-light transition-all duration-300 border-none outline-none
                [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none
                ${activeCell() === 'minute'
                  ? 'bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] scale-105'
                  : 'bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface)]'}
              `}
            />
          }>
            <button
              onClick={() => setActiveCell('minute')}
              class={`
                w-24 h-20 rounded-[12px] flex items-center justify-center text-5xl font-light transition-all duration-300
                ${activeCell() === 'minute'
                  ? 'bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] scale-105'
                  : 'bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface)]'}
              `}
            >
              {displayMinute()}
            </button>
          </Show>

          {/* AM/PM Toggle — 12h only */}
          <Show when={!is24h()}>
            <div class="flex flex-col bg-[var(--color-surface-container-high)] rounded-xl overflow-hidden ml-2 h-20 box-border">
              <button
                onClick={toggleAm}
                class={`flex-1 px-4 text-xs font-bold transition-colors ${isAm() ? 'bg-[var(--color-tertiary-container)] text-[var(--color-on-tertiary-container)]' : 'text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)]'}`}
              >
                AM
              </button>
              <div class="h-[1px] bg-[var(--color-outline-variant)] opacity-20" />
              <button
                onClick={togglePm}
                class={`flex-1 px-4 text-xs font-bold transition-colors ${!isAm() ? 'bg-[var(--color-tertiary-container)] text-[var(--color-on-tertiary-container)]' : 'text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)]'}`}
              >
                PM
              </button>
            </div>
          </Show>
        </div>

        {/* Dial */}
        <Show when={mode() === 'dial'}>
          <TimeDial
            type={activeCell()}
            value={activeCell() === 'hour' ? dialHourValue() : minute()}
            onSelect={setTimeFromDial}
            is24h={is24h()}
          />
        </Show>

        {/* Input Mode Hint */}
        <Show when={mode() === 'input'}>
          <div class="flex items-center justify-center h-64 text-[var(--color-on-surface-variant)] text-sm">
            Ketik jam dan menit di atas
          </div>
        </Show>

        {/* Mode Toggle */}
        <div class="w-full flex justify-start">
          <IconButton
            variant="standard"
            onClick={() => { setMode(mode() === 'dial' ? 'input' : 'dial'); }}
          >
            {mode() === 'dial' ? "keyboard" : "schedule"}
          </IconButton>
        </div>
      </div>
    </Modal>
  );
}

// ──────────────────────────────────────────────
// Clock Dial with drag/click for granular values
// Based on Material Components Android:
//   ClockHandView.java, ClockFaceView.java, RadialViewGroup.java
// ──────────────────────────────────────────────

// M3 layout constants (px)
const DIAL_SIZE = 256;           // w-64
const SELECTOR_SIZE = 40;       // w-10 (label/selector diameter)
const SELECTOR_R = SELECTOR_SIZE / 2;
const HAND_PADDING = 4;
// M3: circleRadius = size/2 - selectorRadius - clockHandPadding
const OUTER_R = DIAL_SIZE / 2 - SELECTOR_R - HAND_PADDING;   // 108
const INNER_R = Math.round(OUTER_R * 0.66);                   // ~71 (M3 LEVEL_RADIUS_RATIO)

function TimeDial(props: { type: 'hour' | 'minute', value: number, onSelect: (v: number) => void, is24h?: boolean }) {
  let dialRef: HTMLDivElement | undefined;

  // M3: degrees = atan2(dY, dX) * 180/PI + 90
  const getAngleFromPoint = (clientX: number, clientY: number): number => {
    if (!dialRef) return 0;
    const rect = dialRef.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let degrees = Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI) + 90;
    if (degrees < 0) degrees += 360;
    return degrees;
  };

  const getDistFromCenter = (clientX: number, clientY: number): number => {
    if (!dialRef) return 0;
    const rect = dialRef.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return Math.sqrt((clientX - cx) ** 2 + (clientY - cy) ** 2);
  };

  const getValueFromPointer = (clientX: number, clientY: number): number => {
    const angle = getAngleFromPoint(clientX, clientY);

    if (props.type === 'minute') {
      return Math.round(angle / 6) % 60;
    }

    let h = Math.round(angle / 30) % 12;

    if (props.is24h) {
      const dist = getDistFromCenter(clientX, clientY);
      // M3: threshold = level2Radius + buffer(12dp)
      const threshold = INNER_R + 12;
      if (dist <= threshold) {
        return h === 0 ? 0 : h + 12;
      }
      return h === 0 ? 12 : h;
    }

    return h === 0 ? 12 : h;
  };

  // --- Pointer events ---
  const handlePointerDown = (e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    const point = 'touches' in e ? e.touches[0] : e;
    props.onSelect(getValueFromPointer(point.clientX, point.clientY));

    const handleMove = (ev: MouseEvent | TouchEvent) => {
      ev.preventDefault();
      const p = 'touches' in ev ? (ev as TouchEvent).touches[0] : (ev as MouseEvent);
      props.onSelect(getValueFromPointer(p.clientX, p.clientY));
    };

    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleUp);
  };

  // --- Data ---
  const outerLabels = () => {
    if (props.type === 'minute') return [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
    return [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  };

  const innerLabels = () => {
    if (props.type !== 'hour' || !props.is24h) return [];
    return [0, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
  };

  const isInnerRing = () => {
    if (props.type !== 'hour' || !props.is24h) return false;
    return props.value === 0 || props.value >= 13;
  };

  // Rotation in degrees (0 = 12 o'clock)
  const rotation = () => {
    if (props.type === 'minute') return props.value * 6;
    return (props.value % 12) * 30;
  };

  const currentR = () => {
    if (props.type === 'hour' && props.is24h && isInnerRing()) return INNER_R;
    return OUTER_R;
  };

  const isOnLabel = () => {
    if (props.type === 'minute') return props.value % 5 === 0;
    return true;
  };

  // M3: angDeg = rotation - 90; x = r * cos(angRad); y = r * sin(angRad);
  const labelPos = (index: number, radius: number) => {
    const angDeg = (index * 30) - 90;
    const rad = angDeg * Math.PI / 180;
    return { x: radius * Math.cos(rad), y: radius * Math.sin(rad) };
  };

  return (
    <div
      ref={dialRef}
      onMouseDown={handlePointerDown}
      onTouchStart={handlePointerDown}
      class="relative w-64 h-64 rounded-full bg-[var(--color-surface-container-highest)] select-none cursor-pointer touch-none"
    >
      {/* Hand — M3 draws line from center to tip, then circle at tip */}
      {(() => {
        const angDeg = rotation() - 90;
        const rad = angDeg * Math.PI / 180;
        const r = currentR();
        const tipX = DIAL_SIZE / 2 + r * Math.cos(rad);
        const tipY = DIAL_SIZE / 2 + r * Math.sin(rad);

        return (
          <div class="absolute inset-0 pointer-events-none">
            {/* Line from center to selector */}
            <svg class="absolute inset-0 w-full h-full" viewBox={`0 0 ${DIAL_SIZE} ${DIAL_SIZE}`}>
              <line
                x1={DIAL_SIZE / 2} y1={DIAL_SIZE / 2}
                x2={tipX} y2={tipY}
                stroke="var(--color-primary)" stroke-width="2"
              />
              {/* Center dot */}
              <circle cx={DIAL_SIZE / 2} cy={DIAL_SIZE / 2} r="4" fill="var(--color-primary)" />
            </svg>

            {/* Selector circle at tip */}
            <div
              class="absolute rounded-full bg-[var(--color-primary)] flex items-center justify-center"
              style={{
                width: `${SELECTOR_SIZE}px`,
                height: `${SELECTOR_SIZE}px`,
                left: `${tipX - SELECTOR_R}px`,
                top: `${tipY - SELECTOR_R}px`,
              }}
            >
              <Show when={props.type === 'minute' && !isOnLabel()}>
                <span class="text-[11px] font-bold text-[var(--color-on-primary)]">
                  {props.value.toString().padStart(2, '0')}
                </span>
              </Show>
            </div>
          </div>
        );
      })()}

      {/* Outer Labels — use Index (tracks by index slot, not value) */}
      <Index each={outerLabels()}>
        {(num, i) => {
          const { x, y } = labelPos(i, OUTER_R);
          const isSelected = () => props.value === num();

          return (
            <div
              class={`
                absolute w-10 h-10 rounded-full flex items-center justify-center text-sm pointer-events-none z-20
                ${isSelected()
                  ? 'text-[var(--color-on-primary)] font-bold'
                  : 'text-[var(--color-on-surface)] font-light'}
              `}
              style={{
                left: '50%',
                top: '50%',
                transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
              }}
            >
              {num() === 0 && props.type === 'minute' ? '00' : num()}
            </div>
          );
        }}
      </Index>

      {/* Inner Labels (24h hours) */}
      <Show when={props.is24h && props.type === 'hour'}>
        <Index each={innerLabels()}>
          {(num, i) => {
            const { x, y } = labelPos(i, INNER_R);
            const isSelected = () => props.value === num();

            return (
              <div
                class={`
                  absolute w-8 h-8 rounded-full flex items-center justify-center text-xs pointer-events-none z-20
                  ${isSelected()
                    ? 'text-[var(--color-on-primary)] font-bold'
                    : 'text-[var(--color-on-surface-variant)] font-light'}
                `}
                style={{
                  left: '50%',
                  top: '50%',
                  transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                }}
              >
                {num() === 0 ? '00' : num()}
              </div>
            );
          }}
        </Index>
      </Show>
    </div>
  );
}
