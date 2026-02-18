import { Component, For, Show } from 'solid-js';
import { Note } from '../../services/db';
import ItemCatatan from './ItemCatatan';
import LoadingSpinner from '../ui/m3e/LoadingSpinner';

interface DaftarCatatanProps {
  notes: Note[];
  onOpenNote: (note: Note) => void;
  isLoading: boolean;
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
  return (
    <div class="w-full flex flex-col gap-6 pb-24">
      <Show when={props.notes.length === 0 && !props.isLoading}>
        <div class="flex flex-col items-center justify-center py-20 opacity-50">
            <span class="material-symbols-rounded text-6xl mb-4">edit_note</span>
            <p class="text-lg">Belum ada catatan.</p>
        </div>
      </Show>

      <Show when={props.isLoading}>
        <div class="flex flex-col items-center justify-center py-20">
          <LoadingSpinner size="large" />
          <p class="mt-4 text-[var(--color-on-surface-variant)] text-sm">Memuat catatan...</p>
        </div>
      </Show>

      <For each={groupNotes(props.notes)}>
        {(group) => (
          <div class="flex flex-col gap-3" id={`section-${group.id}`}>
            <h3 class="text-xl text-[var(--color-secondary)] ml-2">
              {group.label}
            </h3>
            <div class="flex flex-col gap-3">
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
        )}
      </For>
    </div>
  );
};

export default DaftarCatatan;
