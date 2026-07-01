import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite'

let db: SQLiteDatabase | null = null
let dbPromise: Promise<SQLiteDatabase> | null = null

export async function getDb(): Promise<SQLiteDatabase> {
  if (db) return db
  if (dbPromise) return dbPromise
  dbPromise = (async () => {
    try {
      db = await openDatabaseAsync('altianly.db')
      await migrate()
      return db
    } catch (e) {
      console.error('Database open failed:', e)
      throw e
    }
  })()
  return dbPromise
}

export function esc(val: string | number): string {
  if (typeof val === 'number') return String(val)
  return "'" + val.replace(/'/g, "''") + "'"
}

async function migrate(): Promise<void> {
  if (!db) return
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('yesno','number','time','select')),
      target REAL,
      unit TEXT,
      options TEXT,
      created_at INTEGER NOT NULL,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS habit_entries (
      id TEXT PRIMARY KEY,
      habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      value TEXT NOT NULL,
      skipped INTEGER DEFAULT 0,
      notes TEXT,
      created_at INTEGER NOT NULL,
      UNIQUE(habit_id, date)
    );

    CREATE TABLE IF NOT EXISTS meals (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('breakfast','lunch','dinner','snack')),
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS meal_entries (
      id TEXT PRIMARY KEY,
      meal_id TEXT NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
      food_id TEXT NOT NULL,
      food_name TEXT NOT NULL,
      food_brand TEXT,
      serving_size REAL NOT NULL,
      serving_unit TEXT NOT NULL,
      servings REAL NOT NULL,
      calories REAL NOT NULL,
      protein REAL NOT NULL,
      carbs REAL NOT NULL,
      fat REAL NOT NULL,
      fiber REAL DEFAULT 0,
      sugar REAL DEFAULT 0,
      sodium REAL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
  `)
}
