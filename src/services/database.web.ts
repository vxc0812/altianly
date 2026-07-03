export function esc(val: string | number): string {
  if (typeof val === 'number') return String(val)
  return "'" + val.replace(/'/g, "''") + "'"
}

// Web has no SQLite — nutrition uses AsyncStorage, habits return no data.
// This mock prevents expo-sqlite WASM from being bundled (breaks web build).
const MOCK_DB = {
  execAsync: async () => {},
  execSync: () => {},
  runAsync: async () => ({ changes: 0 }),
  runSync: () => ({ changes: 0 }),
  getAllAsync: async () => [],
  getAllSync: () => [],
  getFirstAsync: async () => null,
  getFirstSync: () => null,
  prepareAsync: async () => ({
    executeAsync: async () => ({ getAllAsync: async () => [] }),
    finalizeAsync: async () => {},
  }),
  withTransactionAsync: async (fn: () => Promise<void>) => { await fn() },
}

let db: any = null

export async function getDb(): Promise<any> {
  if (db) return db
  db = MOCK_DB
  return db
}
