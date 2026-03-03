import { Component, For, Show, createSignal, createMemo, createEffect, onMount, onCleanup } from 'solid-js';
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

type ListGroup = { id: string, label: string, notes: Note[] };

/** Inline Collapsible: max-height + opacity (GPU-friendly, measured) */
function CollapsibleGroup(props: { open: boolean; children: any }) {
  let el: HTMLDivElement | undefined;
  let isFirstRun = true;

  // Initialize max-height based on initial open state
  const [maxH, setMaxH] = createSignal<string>(props.open ? "none" : "0px");

  createEffect(() => {
    const open = props.open;
    if (!el) return;

    // Skip animation on first render — just set the correct state
    if (isFirstRun) {
      isFirstRun = false;
      return;
    }

    if (open) {
      // Expanding: measure scrollHeight, animate to it, then release to 'none'
      const h = el.scrollHeight;
      setMaxH(`${h}px`);
      const onEnd = (e: TransitionEvent) => {
        if (e.propertyName !== "max-height") return;
        if (el) el.style.maxHeight = "none";
        el?.removeEventListener("transitionend", onEnd);
      };
      el.addEventListener("transitionend", onEnd);
    } else {
      // Collapsing: snapshot current height, force layout, then animate to 0
      const curH = el.scrollHeight;
      // Remove 'none' and set explicit height first
      el.style.maxHeight = `${curH}px`;
      // Force layout reflow so browser sees the explicit height before animating
      void el.offsetHeight;
      setMaxH("0px");
    }
  });

  return (
    <div
      ref={el}
      style={{
        overflow: "hidden",
        transition: "max-height 300ms cubic-bezier(.16,1,.3,1), opacity 200ms ease",
        "max-height": maxH(),
        opacity: props.open ? 1 : 0,
        "will-change": "max-height, opacity",
      }}
    >
      {props.children}
    </div>
  );
}

const DaftarCatatan: Component<DaftarCatatanProps> = (props) => {
  const [collapsedGroups, setCollapsedGroups] = createSignal<Set<string>>(new Set());
  const [visibleLimit, setVisibleLimit] = createSignal(10);
  let sentinelRef: HTMLDivElement | undefined;

  const toggleGroup = (id: string) => {
    const newSet = new Set(collapsedGroups());
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setCollapsedGroups(newSet);
  };

  // Sort and group notes
  const groupedItems = createMemo(() => {
    const groupsMap = new Map<string, { label: string, notes: Note[] }>();
    
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

    const list: ListGroup[] = [];
    for (const [id, group] of groupsMap.entries()) {
      list.push({ id, label: group.label, notes: group.notes });
    }
    return list;
  });

  // Memoize the visible slice to avoid creating a new array on every access
  const visibleGroups = createMemo(() => groupedItems().slice(0, visibleLimit()));

  // Infinite Scroll logic
  onMount(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        if (visibleLimit() < groupedItems().length) {
          setVisibleLimit(prev => prev + 10);
        }
      }
    }, {
      root: null,
      rootMargin: '200px',
      threshold: 0.1
    });

    if (sentinelRef) {
      observer.observe(sentinelRef);
    }

    onCleanup(() => observer.disconnect());
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

      <Show when={!props.isLoading && groupedItems().length > 0}>
        <div class="w-full flex flex-col gap-0 relative">
          <For each={visibleGroups()}>
            {(group) => {
              const isCollapsed = () => collapsedGroups().has(group.id);
              
              return (
                <div class="w-full flex flex-col mb-2">
                  <div class="pt-6 pb-3">
                    <div 
                      class="flex items-center justify-between cursor-pointer group/label w-full px-2"
                      onClick={() => toggleGroup(group.id)}
                    >
                      <h3 class="text-lg font-medium text-[var(--color-on-surface-variant)] group-hover/label:text-[var(--color-primary)] transition-colors">
                        {group.label}
                      </h3>
                      
                      <div class="flex items-center justify-center gap-2 px-3 py-1 rounded-full bg-[var(--color-surface-container-highest)] transition-transform active:scale-95 min-w-[56px]">
                        <span class="text-[12px] font-bold leading-none text-[var(--color-on-surface-variant)]">
                          {group.notes.length}
                        </span>
                        <span 
                          class={`material-symbols-rounded text-[16px] leading-none text-[var(--color-on-surface-variant)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${isCollapsed() ? 'rotate-180' : 'rotate-0'}`}
                          style={{ "will-change": "transform" }}
                        >
                          expand_less
                        </span>
                      </div>
                    </div>
                  </div>

                  <CollapsibleGroup open={!isCollapsed()}>
                    <div class="min-h-0 overflow-hidden flex flex-col gap-3 px-1">
                      <For each={group.notes}>
                        {(note) => (
                          <div class="w-full pb-1">
                            <ItemCatatan 
                              note={note} 
                              onClick={() => props.onOpenNote(note)} 
                            />
                          </div>
                        )}
                      </For>
                    </div>
                  </CollapsibleGroup>
                </div>
              );
            }}
          </For>

          {/* Sentinel for Infinite Scroll */}
          <div ref={sentinelRef} class="h-10 w-full flex items-center justify-center pointer-events-none opacity-50">
            <Show when={visibleLimit() < groupedItems().length}>
              <LoadingSpinner size="small" />
            </Show>
          </div>
        </div>
      </Show>

    </div>
  );
};

export default DaftarCatatan;
