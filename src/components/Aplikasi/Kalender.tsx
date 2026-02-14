import { Component, createMemo, createSignal, For } from "solid-js";
import { Note } from "../../services/db";
import Card from "../ui/m3e/Card";
import IconButton from "../ui/m3e/IconButton";

interface KalenderProps {
  notes: Note[];
}

const Kalender: Component<KalenderProps> = (props) => {
  const [currentDate, setCurrentDate] = createSignal(new Date());

  const daysInMonth = createMemo(() => {
    const year = currentDate().getFullYear();
    const month = currentDate().getMonth();
    return new Date(year, month + 1, 0).getDate();
  });

  const firstDayOfMonth = createMemo(() => {
    const year = currentDate().getFullYear();
    const month = currentDate().getMonth();
    return new Date(year, month, 1).getDay();
  });

  const monthName = createMemo(() => {
    return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(currentDate());
  });

  const notesSet = createMemo(() => {
    const set = new Set<string>();
    props.notes.forEach(note => set.add(note.date));
    return set;
  });

  const handleDateClick = (day: number) => {
    const year = currentDate().getFullYear();
    const month = String(currentDate().getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateString = `${year}-${month}-${dayStr}`;

    const element = document.getElementById(`section-${dateString}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate().getFullYear(), currentDate().getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate().getFullYear(), currentDate().getMonth() + 1, 1));
  };

  return (
    <Card variant="filled" class="w-[280px] p-4 bg-[var(--color-surface-container-high)] !rounded-[28px] shadow-sm">
      <div class="flex items-center justify-between mb-4 px-1">
        <IconButton variant="standard" onClick={prevMonth} class="w-8 h-8">chevron_left</IconButton>
        <span class="text-sm font-bold text-[var(--color-on-surface)]">{monthName()}</span>
        <IconButton variant="standard" onClick={nextMonth} class="w-8 h-8">chevron_right</IconButton>
      </div>

      <div class="grid grid-cols-7 gap-1 text-center mb-2">
        <For each={['M', 'S', 'S', 'R', 'K', 'J', 'S']}>
          {(day) => <span class="text-xs text-[var(--color-on-surface-variant)] opacity-70">{day}</span>}
        </For>
      </div>

      <div class="grid grid-cols-7 gap-y-1 gap-x-1 place-items-center">
        {/* Empty cells for prev month */}
        <For each={Array(firstDayOfMonth())}>
          {() => <div class="w-8 h-8" />}
        </For>

        {/* Days */}
        <For each={Array.from({ length: daysInMonth() }, (_, i) => i + 1)}>
          {(day) => {
             const year = currentDate().getFullYear();
             const month = String(currentDate().getMonth() + 1).padStart(2, '0');
             const dayStr = String(day).padStart(2, '0');
             const dateString = `${year}-${month}-${dayStr}`;
             const hasNote = notesSet().has(dateString);
             const isToday = new Date().toDateString() === new Date(year, currentDate().getMonth(), day).toDateString();

             return (
              <button
                onClick={() => handleDateClick(day)}
                class={`
                  w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all relative
                  ${isToday 
                    ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]' 
                    : 'text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-highest)]'
                  }
                  ${!hasNote && !isToday ? 'opacity-70' : ''}
                `}
              >
                {day}
                {hasNote && !isToday && (
                  <div class="absolute bottom-1 w-1 h-1 rounded-full bg-[var(--color-tertiary)]" />
                )}
              </button>
             );
          }}
        </For>
      </div>
    </Card>
  );
};

export default Kalender;
