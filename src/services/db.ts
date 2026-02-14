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
  created_at?: string;
  updated_at?: string;
}

let db: Database | null = null;

export const initDB = async () => {
  if (!db) {
    db = await Database.load("sqlite:yournal.db");
  }
  return db;
};

export const getNotes = async (): Promise<Note[]> => {
  const db = await initDB();
  return await db.select("SELECT * FROM notes ORDER BY created_at DESC");
};

export const saveNote = async (note: Note) => {
  const db = await initDB();
  const now = new Date().toISOString();
  
  // Check if exists
  const exists = await db.select<Note[]>("SELECT id FROM notes WHERE id = $1", [note.id]);
  
  if (exists.length > 0) {
    await db.execute(
      "UPDATE notes SET title = $1, content = $2, mood = $3, date = $4, time = $5, location = $6, weather = $7, updated_at = $8 WHERE id = $9",
      [note.title, note.content, note.mood, note.date, note.time, note.location || null, note.weather || null, now, note.id]
    );
  } else {
    await db.execute(
      "INSERT INTO notes (id, title, content, mood, date, time, location, weather, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
      [note.id, note.title, note.content, note.mood, note.date, note.time, note.location || null, note.weather || null, now, now]
    );
  }
};

export const deleteNote = async (id: string) => {
    const db = await initDB();
    await db.execute("DELETE FROM notes WHERE id = $1", [id]);
};
