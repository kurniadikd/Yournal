import Database from '@tauri-apps/plugin-sql';

export interface Note {
  id: string;
  title: string;
  content: string;
  mood: string;
  date: string;
  time: string;
  location?: string; // JSON string { name, lat, lng }
  weather?: string; // JSON string { temp: number, code: number, desc: string }
  tags?: string; // JSON string ["tag1", "tag2"]
  created_at?: string;
  updated_at?: string;
}

let dbPromise: Promise<Database> | null = null;

export const initDB = async () => {
  if (dbPromise) return dbPromise;

  dbPromise = (async () => {
    try {
      console.log("Database: Initializing...");
      
      // Small delay to ensure backend migrations are done
      await new Promise(r => setTimeout(r, 100));
      
      const instance = await Database.load("sqlite:yournal.db");
      
      // Verify table exists
      const tables = await instance.select<{name: string}[]>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='notes'"
      );
      
      if (tables.length === 0) {
        console.warn("Database: 'notes' table not found! Migrations might still be running.");
      } else {
        // Failsafe: Ensure tags column exists
        try {
          await instance.execute("ALTER TABLE notes ADD COLUMN tags TEXT");
          console.log("Database: tags column added via failsafe");
        } catch (e) {
          // Silently skip if column already exists
        }
      }
      
      console.log("Database: Ready");
      return instance;
    } catch (err) {
      console.error("Database: Failed to initialize", err);
      dbPromise = null;
      throw err;
    }
  })();

  return dbPromise;
};

export const getNotes = async (): Promise<Note[]> => {
  try {
    const db = await initDB();
    const notes = await db.select<Note[]>("SELECT * FROM notes ORDER BY created_at DESC");
    console.log(`Database: getNotes() success, found ${notes.length} notes`);
    return notes;
  } catch (err) {
    console.error("Database: getNotes() failed", err);
    throw err;
  }
};

export const saveNote = async (note: Note) => {
  const db = await initDB();
  const now = new Date().toISOString();
  
  // Check if exists
  const exists = await db.select<Note[]>("SELECT id FROM notes WHERE id = $1", [note.id]);
  
  if (exists.length > 0) {
    await db.execute(
      "UPDATE notes SET title = $1, content = $2, mood = $3, date = $4, time = $5, location = $6, weather = $7, tags = $8, updated_at = $9 WHERE id = $10",
      [note.title, note.content, note.mood, note.date, note.time, note.location || null, note.weather || null, note.tags || null, now, note.id]
    );
  } else {
    await db.execute(
      "INSERT INTO notes (id, title, content, mood, date, time, location, weather, tags, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
      [note.id, note.title, note.content, note.mood, note.date, note.time, note.location || null, note.weather || null, note.tags || null, now, now]
    );
  }
};

export const deleteNote = async (id: string) => {
    const db = await initDB();
    await db.execute("DELETE FROM notes WHERE id = $1", [id]);
};
