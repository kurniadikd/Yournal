import { createSignal, For, createMemo, createEffect } from "solid-js";
import Modal from "./Modal";
import Button from "./Button";
import IconButton from "./IconButton";

interface DatePickerProps {
  show: boolean;
  onClose: () => void;
  value?: Date;
  onSelect: (date: Date) => void;
  title?: string;
}

export default function DatePicker(props: DatePickerProps) {
  // --- STATE ---
  const [viewDate, setViewDate] = createSignal(new Date()); // Tanggal yang sedang dilihat (untuk navigasi bulan/tahun)
  const [selectedDate, setSelectedDate] = createSignal(new Date()); // Tanggal yang dipilih user
  const [mode, setMode] = createSignal<'day' | 'year'>('day'); // Mode tampilan

  // Ref untuk scroll otomatis tahun
  let yearListRef: HTMLDivElement | undefined;

  // --- EFFECT: Sinkronisasi saat dibuka ---
  createEffect(() => {
    if (props.show) {
      const target = props.value ? new Date(props.value) : new Date();
      setSelectedDate(target);
      setViewDate(target);
      setMode('day'); // Selalu reset ke mode hari saat dibuka
    }
  });

  // --- EFFECT: Auto scroll ke tahun aktif ---
  createEffect(() => {
    if (mode() === 'year' && yearListRef) {
      const currentYear = viewDate().getFullYear();
      // Cari elemen tahun dan scroll ke sana
      const el = yearListRef.querySelector(`[data-year="${currentYear}"]`);
      el?.scrollIntoView({ block: "center" });
    }
  });

  // --- LOGIC ---
  const changeMonth = (offset: number) => {
    const next = new Date(viewDate());
    next.setMonth(next.getMonth() + offset);
    setViewDate(next);
  };

  const selectYear = (year: number) => {
    const next = new Date(viewDate());
    next.setFullYear(year);
    setViewDate(next);
    setMode('day'); // Kembali ke kalender setelah pilih tahun
  };

  // Helper Checkers
  const isSameDate = (d1: Date, d2: Date) => 
    d1.getDate() === d2.getDate() && 
    d1.getMonth() === d2.getMonth() && 
    d1.getFullYear() === d2.getFullYear();

  const isToday = (d: Date) => isSameDate(d, new Date());

  // --- DATA GENERATORS ---
  const daysHeader = ["M", "S", "S", "R", "K", "J", "S"]; // Minggu - Sabtu

  const calendarDays = createMemo(() => {
    const year = viewDate().getFullYear();
    const month = viewDate().getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // 0 = Minggu, 1 = Senin...
    const startDay = firstDay.getDay(); 
    
    // Kita butuh padding dari bulan sebelumnya
    const days = [];
    
    // Padding awal (hari dari bulan lalu)
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      days.push({
        day: prevMonthLastDay - i,
        isCurrentMonth: false,
        fullDate: new Date(year, month - 1, prevMonthLastDay - i)
      });
    }

    // Hari bulan ini
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        fullDate: new Date(year, month, i)
      });
    }

    // Padding akhir (hari bulan depan) agar genap 42 kotak (6 baris)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        fullDate: new Date(year, month + 1, i)
      });
    }

    return days;
  });

  const yearsList = createMemo(() => {
    const current = new Date().getFullYear();
    const list = [];
    for (let i = current - 100; i <= current + 10; i++) list.push(i);
    return list;
  });

  // Formatters
  const fmtMonthYear = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' });
  const fmtFull = new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <Modal
      show={props.show}
      onClose={props.onClose}
      title="Pilih Tanggal"
      actions={
        <div class="flex justify-end gap-2 w-full pt-2">
          <Button variant="tonal" onClick={props.onClose}>Batal</Button>
          <Button variant="filled" onClick={() => { props.onSelect(selectedDate()); props.onClose(); }}>Oke</Button>
        </div>
      }
    >
      <div class="w-full flex flex-col" style={{ "min-height": "380px" }}>
        
        {/* --- HEADER STATIC (Judul Tanggal) --- */}
        <div class="mb-4 px-2">
          <h1 class="text-3xl font-bold text-[var(--color-on-surface)]">
            {fmtFull.format(selectedDate())}
          </h1>
        </div>

        {/* --- NAVIGATION BAR (Month/Year Picker + Arrows) --- */}
        <div class="flex items-center justify-between mb-2 px-1">
          {/* Tombol Dropdown Bulan & Tahun */}
          <button 
            onClick={() => setMode(mode() === 'day' ? 'year' : 'day')}
            class="flex items-center gap-1 text-sm font-bold text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-highest)] py-1 px-2 rounded-md transition-colors"
          >
            {fmtMonthYear.format(viewDate())}
            <span class={`material-symbols-rounded text-lg transition-transform ${mode() === 'year' ? 'rotate-180' : ''}`}>
              arrow_drop_down
            </span>
          </button>

          {/* Panah Navigasi (Hanya muncul di mode Day agar tidak bingung) */}
          <div class={`flex gap-1 ${mode() === 'year' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <IconButton variant="standard" onClick={() => changeMonth(-1)}>chevron_left</IconButton>
            <IconButton variant="standard" onClick={() => changeMonth(1)}>chevron_right</IconButton>
          </div>
        </div>

        {/* --- CONTENT AREA (Relative Parent) --- */}
        <div class="relative flex-1 w-full overflow-hidden">
          
          {/* LAYER 1: CALENDAR GRID */}
          <div 
            class={`absolute inset-0 flex flex-col transition-opacity duration-300 ${mode() === 'year' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          >
            {/* Nama Hari */}
            <div class="grid grid-cols-7 mb-2 text-center">
              <For each={daysHeader}>
                {(d) => <span class="text-xs font-medium text-[var(--color-on-surface-variant)]">{d}</span>}
              </For>
            </div>

            {/* Grid Tanggal */}
            <div class="grid grid-cols-7 gap-y-1">
              <For each={calendarDays()}>
                {(item) => {
                  const isSelected = () => isSameDate(item.fullDate, selectedDate());
                  const isCurrentDay = () => isToday(item.fullDate);

                  return (
                    <div class="flex justify-center items-center aspect-square">
                      <button
                        onClick={() => {
                          setSelectedDate(item.fullDate);
                          if (!item.isCurrentMonth) setViewDate(new Date(item.fullDate));
                        }}
                        class={`
                          w-9 h-9 rounded-full flex items-center justify-center text-sm relative transition-all
                          ${!item.isCurrentMonth ? 'text-[var(--color-on-surface-variant)] opacity-40' : 'text-[var(--color-on-surface)]'}
                          ${isSelected() 
                            ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] font-bold' 
                            : 'hover:bg-[var(--color-surface-container-highest)]'}
                          ${isCurrentDay() && !isSelected() ? 'text-[var(--color-primary)] font-bold' : ''}
                        `}
                      >
                        {item.day}
                      </button>
                    </div>
                  );
                }}
              </For>
            </div>
          </div>

          {/* LAYER 2: YEAR PICKER (Overlay) */}
          <div 
            ref={yearListRef}
            class={`
              absolute inset-0 bg-[var(--color-surface)] grid grid-cols-4 gap-3 overflow-y-auto content-start p-2
              transition-all duration-300 transform
              ${mode() === 'year' ? 'translate-y-0 opacity-100 z-10' : 'translate-y-10 opacity-0 z-[-1] pointer-events-none'}
            `}
          >
            <For each={yearsList()}>
              {(year) => (
                <button
                  data-year={year}
                  onClick={() => selectYear(year)}
                  class={`
                    py-2 px-4 rounded-full text-sm transition-colors
                    ${year === viewDate().getFullYear() 
                      ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] font-bold' 
                      : 'hover:bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface)]'}
                  `}
                >
                  {year}
                </button>
              )}
            </For>
          </div>

        </div>
      </div>
    </Modal>
  );
}