import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', '..', '..', 'bot.db');
const SCHEMA_PATH = join(__dirname, '..', '..', '..', 'db', 'schema.sql');

let db = null;

export function initDb() {
  if (db) return db;

  const { Database } = sqlite3;
  db = new Database(DB_PATH, (err) => {
    if (err) {
      console.error('[DB/Server] Failed to open:', err.message);
      process.exit(1);
    }
    console.log('[DB/Server] Connected to shared bot.db');
  });

  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA synchronous = NORMAL;');
  db.exec('PRAGMA foreign_keys = ON;');

  // Apply schema if tables don't exist yet (idempotent CREATE TABLE IF NOT EXISTS)
  try {
    const schema = readFileSync(SCHEMA_PATH, 'utf-8');
    db.exec(schema, (err) => {
      if (err) console.error('[DB/Server] Schema error:', err.message);
    });
  } catch (e) {
    console.warn('[DB/Server] Could not read schema.sql:', e.message);
  }

  return db;
}

export function getDb() {
  if (!db) throw new Error('DB not initialized. Call initDb() first.');
  return db;
}

export function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

export function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

export function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().run(sql, params, function (err) {
      err ? reject(err) : resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}
