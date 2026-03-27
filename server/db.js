import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const db = new Database(join(__dirname, 'data.db'))

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS configurators (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    default_frame TEXT NOT NULL DEFAULT 'B3',
    default_lid TEXT NOT NULL DEFAULT 'Bio',
    default_panels INTEGER NOT NULL DEFAULT 1,
    accent_color TEXT NOT NULL DEFAULT '#1a1a1a',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    configurator_id TEXT NOT NULL REFERENCES configurators(id) ON DELETE CASCADE,
    frame_id TEXT NOT NULL,
    lid_id TEXT NOT NULL,
    show_panels INTEGER NOT NULL,
    price INTEGER NOT NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    customer_address TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    created_at TEXT DEFAULT (datetime('now'))
  );
`)

export default db
