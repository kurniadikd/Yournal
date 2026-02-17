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
import { getNotes, saveNote, Note } from "./services/db";

function App() {
  const [time, setTime] = createSignal(new Date());
  const [isEditorOpen, setIsEditorOpen] = createSignal(false);
  const [notes, setNotes] = createSignal<Note[]>([]);
  const [selectedNote, setSelectedNote] = createSignal<Note | null>(null);
  const [isLoading, setIsLoading] = createSignal(true);

  const fetchNotes = async () => {
    setIsLoading(true);
    try {
      const data = await getNotes();
      setNotes(data);
    } catch (err) {
      console.error("Failed to load notes:", err);
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

  const handleSaveNote = async (data: { title: string; content: string; mood: string; date: Date; location?: string; weather?: string }) => {
    const currentNote = selectedNote();
    
    const noteToSave: Note = {
      id: currentNote ? currentNote.id : crypto.randomUUID(),
      title: data.title || "Tanpa Judul",
      content: data.content,
      mood: data.mood,
      date: data.date.toISOString().split('T')[0],
      time: data.date.toTimeString().split(' ')[0],
      location: data.location,
      weather: data.weather,
      created_at: currentNote ? currentNote.created_at : new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    await saveNote(noteToSave);
    await fetchNotes(); // Refresh list
    setIsEditorOpen(false);
    setSelectedNote(null);
  };

  const handleOpenNote = (note: Note) => {
    setSelectedNote(note);
    setIsEditorOpen(true);
  };

  const handleCreateNew = () => {
    setSelectedNote(null);
    setIsEditorOpen(true);
  };

  return (
    <main class="min-h-screen flex flex-col relative overflow-hidden bg-[var(--color-surface)]">
      <Header />
      
      {/* Relocated Clock (Top-Left, NOT in header) */}
      <div class="fixed top-18 md:top-20 left-4 md:left-8 z-30 pointer-events-none">
        <div class="flex flex-col">
          <span class="text-xl font-bold text-[var(--color-primary)] mb-1">
            {formatDate(time())}
          </span>
          <span class="text-3xl md:text-5xl font-light text-[var(--color-on-surface)] leading-none tracking-tighter">
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
          size="large"
          class="shadow-xl shadow-black/20"
        />
      </div>

      <Editor 
        show={isEditorOpen()} 
        onClose={() => setIsEditorOpen(false)} 
        onSave={handleSaveNote}
        initialTitle={selectedNote()?.title}
        initialContent={selectedNote()?.content}
        initialMood={selectedNote()?.mood}
        initialDate={selectedNote() ? new Date(`${selectedNote()?.date}T${selectedNote()?.time}`) : undefined}
        initialLocation={selectedNote()?.location}
        initialWeather={selectedNote()?.weather}
      />

      <Pengaturan />
      <Personalisasi />
      <PaletWarna />
    </main>
  );
}

export default App;
