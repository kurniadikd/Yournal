import { createSignal, onMount, onCleanup } from "solid-js";
import "./App.css";
import { themeStore } from "./theme";
import Header from "./components/Header";
import Pengaturan from "./components/Aplikasi/Pengaturan";
import Personalisasi from "./components/Aplikasi/Personalisasi";
import PaletWarna from "./components/Aplikasi/PaletWarna";
import { formatDate, formatTime } from "./utils/date";
import FAB from "./components/ui/m3e/FAB";
import Editor from "./components/Aplikasi/Editor.tsx";
import DaftarCatatan from "./components/Aplikasi/DaftarCatatan";
import Kalender from "./components/Aplikasi/Kalender";
import CatatanBaru from "./components/Aplikasi/CatatanBaru";
import ConfirmationModal from "./components/ui/m3e/ConfirmationModal";
import { getNotes, saveNote, deleteNote, Note } from "./services/db";

function App() {
  const [time, setTime] = createSignal(new Date());
  const [isEditorOpen, setIsEditorOpen] = createSignal(false);
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = createSignal(false);
  const [notes, setNotes] = createSignal<Note[]>([]);
  const [selectedNote, setSelectedNote] = createSignal<Note | null>(null);
  const [templateContent, setTemplateContent] = createSignal("");
  const [templateTitle, setTemplateTitle] = createSignal("");
  const [showDeleteConfirm, setShowDeleteConfirm] = createSignal(false);
  const [isLoading, setIsLoading] = createSignal(true);

  const fetchNotes = async (isRetry = false) => {
    setIsLoading(true);
    try {
      const data = await getNotes();
      console.log(`App: fetchNotes success, ${data.length} notes`);
      setNotes(data);
      
      // If empty and not a retry, try one more time after a short delay
      if (data.length === 0 && !isRetry) {
        setTimeout(() => fetchNotes(true), 1500);
      }
    } catch (err) {
      console.error("App: fetchNotes failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  onMount(() => {
    themeStore.init();
    const timer = setInterval(() => setTime(new Date()), 1000);
    fetchNotes(); // Load notes on start
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
    await fetchNotes(); // Refresh list
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
    await fetchNotes(); // Refresh list
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
    <main class="min-h-screen flex flex-col relative overflow-hidden bg-[var(--color-surface)]">
      <Header />
      
      {/* Relocated Clock (Top-Left, NOT in header) */}
      <div class="fixed top-18 md:top-20 left-4 md:left-8 z-30 pointer-events-none">
        <div class="flex flex-col">
          <span class="text-xl font-medium text-[var(--color-secondary)] mb-1">
            {formatDate(time())}
          </span>
          <span class="text-3xl md:text-5xl font-medium text-[var(--color-on-surface)] leading-none tracking-tighter">
            {formatTime(time())}
          </span>
        </div>
      </div>

      {/* Calendar (Bottom-Left) */}
      <div class="hidden md:block fixed bottom-10 left-8 z-30">
        <Kalender notes={notes()} />
      </div>



      <div class="flex-1 flex flex-col items-center p-4 pt-40 md:pt-0 overflow-y-auto w-full mx-auto md:fixed md:top-24 md:right-8 md:w-1/2 md:h-[calc(100vh-120px)] md:items-end md:justify-start md:z-30">
        <DaftarCatatan 
          notes={notes()} 
          isLoading={isLoading()}
          onOpenNote={handleOpenNote} 
        />
      </div>

      {/* Floating Action Button */}
      <div class="fixed bottom-6 right-6 z-40">
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
        initialDate={selectedNote() ? new Date(`${selectedNote()?.date}T${selectedNote()?.time}`) : undefined}
        initialLocation={selectedNote()?.location}
        initialWeather={selectedNote()?.weather}
        initialTags={(() => {
          try {
            return selectedNote()?.tags ? JSON.parse(selectedNote()?.tags!) : undefined;
          } catch (e) { return undefined; }
        })()}
      />

      <Pengaturan />
      <Personalisasi />
      <PaletWarna />
      
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
    </main>
  );
}

export default App;
