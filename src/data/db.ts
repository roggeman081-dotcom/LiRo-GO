import * as SQLite from "expo-sqlite";

const DB_NAME = "liro-go.db";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb() {
  if (!dbPromise) {
    dbPromise = openAndMigrate();
  }
  return dbPromise;
}

async function openAndMigrate() {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync("PRAGMA journal_mode = WAL;");
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      postal_code TEXT,
      city TEXT,
      save_as_contact INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY NOT NULL,
      customer_id TEXT NOT NULL REFERENCES customers(id),
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      work_type TEXT,
      description TEXT,
      planned_at TEXT,
      priority TEXT NOT NULL DEFAULT 'normal',
      status TEXT NOT NULL DEFAULT 'later',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS time_sessions (
      id TEXT PRIMARY KEY NOT NULL,
      date TEXT NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);
  return db;
}
