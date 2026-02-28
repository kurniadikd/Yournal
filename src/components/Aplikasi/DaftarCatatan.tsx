import { Component, For, Show, createSignal } from 'solid-js';
import { Note } from '../../services/db';
import ItemCatatan from './ItemCatatan';
import LoadingSpinner from '../ui/m3e/LoadingSpinner';

interface DaftarCatatanProps {
  notes: Note[];
  onOpenNote: (note: Note) => void;
  isLoading: boolean;
  onRefresh?: () => void;
}

const getGroupLabel = (dateString: string) => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (isNaN(date.getTime())) {
    return "Tanggal tidak valid";
  }

  if (date.toDateString() === today.toDateString()) {
    return "Hari ini";
  } else if (date.toDateString() === yesterday.toDateString()) {
    return "Kemarin";
  } else {
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  }
};

const groupNotes = (notes: Note[]) => {
  const groups: { id: string; label: string; notes: Note[] }[] = [];
  
  // Sort notes by date descending
  const sortedNotes = [...notes].sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.time}`);
    const dateB = new Date(`${b.date}T${b.time}`);
    return dateB.getTime() - dateA.getTime();
  });

  sortedNotes.forEach(note => {
    const label = getGroupLabel(note.date);
    const existingGroup = groups.find(g => g.label === label);
    if (existingGroup) {
      existingGroup.notes.push(note);
    } else {
      groups.push({ id: note.date, label, notes: [note] });
    }
  });
  
  return groups;
};

const DaftarCatatan: Component<DaftarCatatanProps> = (props) => {
  // Store IDs (dates) of collapsed groups
  const [collapsedGroups, setCollapsedGroups] = createSignal<Set<string>>(new Set());

  const toggleGroup = (id: string) => {
    const newSet = new Set(collapsedGroups());
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setCollapsedGroups(newSet);
  };

  return (
    <div class="w-full flex flex-col gap-6 pb-24">
      <Show when={props.notes.length === 0 && !props.isLoading}>
        <div class="flex flex-col items-center justify-center py-20 opacity-80 animate-in fade-in zoom-in duration-500">
            <div class="w-20 h-20 rounded-full bg-[var(--color-surface-container-high)] flex items-center justify-center mb-6">
                <span class="material-symbols-rounded text-4xl text-[var(--color-primary)]">edit_note</span>
            </div>
            <p class="text-xl font-medium text-[var(--color-on-surface)] mb-2">Belum ada catatan.</p>
            <p class="text-[var(--color-on-surface-variant)] text-center max-w-[280px] mb-8 leading-relaxed">
                Tulis pikiranmu hari ini atau coba segarkan jika catatanmu belum muncul.
            </p>
            
            <button 
              onClick={() => props.onRefresh?.()}
              class="flex items-center gap-2 px-6 h-12 rounded-full border border-[var(--color-outline)] text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-all active:scale-95"
            >
                <span class="material-symbols-rounded text-xl">refresh</span>
                <span class="font-medium">Segarkan</span>
            </button>
        </div>
      </Show>

      <Show when={props.isLoading}>
        <div class="flex flex-col items-center justify-center py-20">
          <LoadingSpinner size="large" />
          <p class="mt-4 text-[var(--color-on-surface-variant)] text-sm">Memuat catatan...</p>
        </div>
      </Show>

      <Show when={!props.isLoading}>
        <For each={groupNotes(props.notes)}>
          {(group) => {
            const isCollapsed = () => collapsedGroups().has(group.id);
            
            return (
              <div class="flex flex-col gap-3" id={`section-${group.id}`}>
                <div 
                  class="flex items-center justify-between cursor-pointer group/label w-full px-2 pr-4"
                  onClick={() => toggleGroup(group.id)}
                >
                  <h3 class="text-xl text-[var(--color-secondary)] group-hover/label:text-[var(--color-secondary)] transition-colors">
                    {group.label}
                  </h3>
                  
                  <div class="flex items-center justify-center gap-2 px-3.5 pr-3 py-1.5 rounded-full bg-[var(--color-secondary)] transition-all active:scale-95 min-w-[56px]">
                    <span class="text-[13px] font-medium leading-none text-[var(--color-on-secondary)]">
                      {group.notes.length}
                    </span>
                    <span 
                      class={`material-symbols-rounded text-[13px] leading-none text-[var(--color-on-secondary)] transition-all duration-300 ${isCollapsed() ? 'rotate-180' : 'rotate-0'}`}
                    >
                      expand_less
                    </span>
                  </div>
                </div>
                
                <div 
                  class={`flex flex-col gap-3 transition-all duration-300 origin-top overflow-hidden ${isCollapsed() ? 'max-h-0 opacity-0 scale-y-95 pointer-events-none' : 'max-h-[5000px] opacity-100 scale-y-100'}`}
                >
                  <For each={group.notes}>
                    {(note) => (
                      <ItemCatatan 
                        note={note} 
                        onClick={() => props.onOpenNote(note)} 
                      />
                    )}
                  </For>
                </div>
              </div>
            );
          }}
        </For>
      </Show>
    </div>
  );
};

export default DaftarCatatan;
