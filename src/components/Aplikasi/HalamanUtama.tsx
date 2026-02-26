import { Component, createSignal, onMount, onCleanup } from "solid-js";
import { formatDate, formatTime } from "../../utils/date";
import FAB from "../ui/m3e/FAB";
import Editor from "./Editor";
import DaftarCatatan from "./DaftarCatatan";
import Kalender from "./Kalender";
import CatatanBaru from "./CatatanBaru";
import PetaDunia from "./PetaDunia";
import ConfirmationModal from "../ui/m3e/ConfirmationModal";
import { getNotes, saveNote, deleteNote, Note } from "../../services/db";

const HalamanUtama: Component = () => {
  const [time, setTime] = createSignal(new Date());
  const [isEditorOpen, setIsEditorOpen] = createSignal(false);
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = createSignal(false);
  const [notes, setNotes] = createSignal<Note[]>([]);
  const [selectedNote, setSelectedNote] = createSignal<Note | null>(null);
  const [templateContent, setTemplateContent] = createSignal("");
  const [templateTitle, setTemplateTitle] = createSignal("");
  const [showDeleteConfirm, setShowDeleteConfirm] = createSignal(false);
  const [isLoading, setIsLoading] = createSignal(true);

  const fetchNotes = async () => {
    let attempts = 0;
    const maxAttempts = 3;

    const performFetch = async () => {
      setIsLoading(true);
      try {
        console.log(`App: Fetching notes (attempt ${attempts + 1})...`);
        const data = await getNotes();
        
        if (data.length > 0) {
          console.log(`App: fetchNotes success, found ${data.length} notes`);
          setNotes(data);
          setIsLoading(false);
          return true;
        } else {
          console.log("App: fetchNotes returned 0 notes.");
          return false;
        }
      } catch (err) {
        console.error("App: fetchNotes failed:", err);
        return false;
      }
    };

    const success = await performFetch();
    setIsLoading(false);
    
    if (!success && attempts < maxAttempts) {
       // Only retry on actual errors, not on 0 notes
    }
  };

  onMount(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    fetchNotes();
    onCleanup(() => clearInterval(timer));
  });

  const handleSaveNote = async (data: { title: string; content: string; mood: string; date: Date; location?: string; weather?: string; tags?: string[] }) => {
    const currentNote = selectedNote();
    
    const noteToSave: Note = {
      id: currentNote ? currentNote.id : crypto.randomUUID(),
      title: data.title || "Tanpa Judul",
      content: data.content,
      mood: data.mood,
      date: `${data.date.getFullYear()}-${String(data.date.getMonth() + 1).padStart(2, '0')}-${String(data.date.getDate()).padStart(2, '0')}`,
      time: data.date.toTimeString().split(' ')[0],
      location: data.location,
      weather: data.weather,
      tags: data.tags ? JSON.stringify(data.tags) : undefined,
      created_at: currentNote ? currentNote.created_at : new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    await saveNote(noteToSave);
    await fetchNotes();
    setIsEditorOpen(false);
    setSelectedNote(null);
  };

  const handleDeleteNote = () => {
    if (!selectedNote()) return;
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!selectedNote()) return;
    await deleteNote(selectedNote()!.id);
    await fetchNotes();
    setIsEditorOpen(false);
    setSelectedNote(null);
  };

  const handleOpenNote = (note: Note) => {
    setSelectedNote(note);
    setIsEditorOpen(true);
  };

  const handleCreateNew = () => {
    setIsTemplatePickerOpen(true);
  };

  const handleTemplateSelect = (data: { content: string; title: string }) => {
    setIsTemplatePickerOpen(false);
    setSelectedNote(null);
    setTemplateContent(data.content);
    setTemplateTitle(data.title);
    setIsEditorOpen(true);
  };

  return (
    <>
      <div class="flex-1 flex flex-col items-center pt-16 md:pt-0 overflow-y-auto w-full mx-auto md:fixed md:top-24 md:right-8 md:w-1/2 md:h-[calc(100vh-120px)] md:items-end md:justify-start md:z-30 scrollbar-hide">
        {/* Clock (scrollable on mobile, fixed on desktop) */}
        <div class="w-full flex justify-start md:fixed md:top-20 md:left-8 md:z-30 md:pointer-events-none p-4 pb-0 md:p-0">
          <div class="flex flex-col">
            <span class="text-xl text-[var(--color-secondary)] mb-1">
              {formatDate(time())}
            </span>
            <span class="text-3xl md:text-5xl  text-[var(--color-on-surface)] leading-none tracking-tighter">
              {formatTime(time())}
            </span>
          </div>
        </div>

        <div class="w-full p-4 md:p-0">
          <DaftarCatatan 
            notes={notes()} 
            isLoading={isLoading()}
            onOpenNote={handleOpenNote}
            onRefresh={fetchNotes}
          />
        </div>
      </div>

      {/* Calendar (Bottom-Left) */}
      <div class="hidden md:block fixed bottom-10 left-8 z-30">
        <Kalender notes={notes()} />
      </div>

      {/* World Map Heatmap */}
      <div class="hidden md:block fixed top-[200px] bottom-[360px] left-8 w-[280px] z-10">
        <PetaDunia notes={notes()} />
      </div>

      {/* Floating Action Button */}
      <div class="fixed right-6 z-40" style="bottom: calc(1.5rem + env(safe-area-inset-bottom, 0px))">
        <FAB 
          icon="add" 
          onClick={handleCreateNew} 
          variant="tertiary"
          size="large"
          class="shadow-xl shadow-black/20"
        />
      </div>

      <CatatanBaru
        show={isTemplatePickerOpen()}
        onClose={() => setIsTemplatePickerOpen(false)}
        onSelect={handleTemplateSelect}
      />

      <Editor 
        show={isEditorOpen()} 
        onClose={() => setIsEditorOpen(false)} 
        onSave={handleSaveNote}
        onDelete={selectedNote() ? handleDeleteNote : undefined}
        initialTitle={selectedNote()?.title ?? templateTitle()}
        initialContent={selectedNote()?.content ?? templateContent()}
        initialMood={selectedNote()?.mood}
        initialDate={(() => {
          const sn = selectedNote();
          if (!sn) return undefined;
          try {
            return new Date(`${sn.date}T${sn.time}`);
          } catch (e) { return undefined; }
        })()}
        initialLocation={selectedNote()?.location}
        initialWeather={selectedNote()?.weather}
        initialTags={(() => {
          const sn = selectedNote();
          if (!sn?.tags) return undefined;
          try {
            return JSON.parse(sn.tags);
          } catch (e) { return undefined; }
        })()}
      />

      <ConfirmationModal
        show={showDeleteConfirm()}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Hapus Catatan?"
        message="Tindakan ini tidak dapat dibatalkan. Apakah Anda yakin ingin menghapus catatan ini secara permanen?"
        confirmLabel="Hapus"
        variant="danger"
        icon="delete"
      />
    </>
  );
};

export default HalamanUtama;
