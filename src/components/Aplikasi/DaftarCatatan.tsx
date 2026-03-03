import { Component, For, Show, createSignal, createMemo, onMount } from 'solid-js';
import { Note } from '../../services/db';
import ItemCatatan from './ItemCatatan';
import LoadingSpinner from '../ui/m3e/LoadingSpinner';
import { createWindowVirtualizer } from '@tanstack/solid-virtual';

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

type ListItem = 
  | { type: 'header', id: string, label: string, count: number }
  | { type: 'note', note: Note, groupId: string };

const DaftarCatatan: Component<DaftarCatatanProps> = (props) => {
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

  // 1. First sort and group notes mathematically
  const flatItems = createMemo(() => {
    const groupsMap = new Map<string, { label: string, notes: Note[] }>();
    
    // Sort notes by date descending
    const sortedNotes = [...props.notes].sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateB.getTime() - dateA.getTime();
    });

    sortedNotes.forEach(note => {
      const label = getGroupLabel(note.date);
      if (groupsMap.has(note.date)) {
        groupsMap.get(note.date)!.notes.push(note);
      } else {
        groupsMap.set(note.date, { label, notes: [note] });
      }
    });

    // 2. Flatten into a single array for virtualization
    const items: ListItem[] = [];
    for (const [id, group] of groupsMap.entries()) {
      items.push({ type: 'header', id, label: group.label, count: group.notes.length });
      
      // If group is NOT collapsed, push its notes
      if (!collapsedGroups().has(id)) {
        group.notes.forEach(note => {
          items.push({ type: 'note', note, groupId: id });
        });
      }
    }
    return items;
  });

  // Setup window-based virtualizer
  const virtualizer = createWindowVirtualizer({
    count: flatItems().length,
    estimateSize: (index) => {
      const item = flatItems()[index];
      // Estimate header height vs note height (notes with images might be taller, but dynamic measurement adjusts this)
      return item.type === 'header' ? 60 : 180;
    },
    overscan: 5,
  });

  return (
    <div class="w-full flex flex-col pb-24">
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

      <Show when={!props.isLoading && flatItems().length > 0}>
        <div 
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          <For each={virtualizer.getVirtualItems()}>
            {(virtualItem) => {
              const item = flatItems()[virtualItem.index];
              return (
                <div
                  data-index={virtualItem.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  {/* Outer container with padding logic to replace previous flex gaps */}
                  <div class={`${item.type === 'header' ? 'pt-6 pb-3' : 'pb-3'}`}>
                    <Show 
                      when={item.type === 'header'} 
                      fallback={
                        <ItemCatatan 
                          note={(item as Extract<ListItem, { type: 'note' }>).note} 
                          onClick={() => props.onOpenNote((item as Extract<ListItem, { type: 'note' }>).note)} 
                        />
                      }
                    >
                      <div 
                        class="flex items-center justify-between cursor-pointer group/label w-full px-2 pr-4 pt-2"
                        onClick={() => toggleGroup((item as any).id)}
                      >
                        <h3 class="text-xl text-[var(--color-secondary)] group-hover/label:text-[var(--color-secondary)] transition-colors">
                          {(item as any).label}
                        </h3>
                        
                        <div class="flex items-center justify-center gap-2 px-3.5 pr-3 py-1.5 rounded-full bg-[var(--color-secondary)] transition-transform active:scale-95 min-w-[56px]">
                          <span class="text-[13px] font-medium leading-none text-[var(--color-on-secondary)]">
                            {(item as any).count}
                          </span>
                          <span 
                            class={`material-symbols-rounded text-[13px] leading-none text-[var(--color-on-secondary)] transition-transform duration-300 ${collapsedGroups().has((item as any).id) ? 'rotate-180' : 'rotate-0'}`}
                          >
                            expand_less
                          </span>
                        </div>
                      </div>
                    </Show>
                  </div>
                </div>
              );
            }}
          </For>
        </div>
      </Show>
    </div>
  );
};

export default DaftarCatatan;
