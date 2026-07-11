import sqlite3 from 'sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from './index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

let db = null;

export function initDb() {
  if (db) return db;

  const { Database } = sqlite3;
  db = new Database(config.DATABASE_PATH, (err) => {
    if (err) {
      console.error('[DB] Failed to open database:', err.message);
      process.exit(1);
    }
    console.log('[DB] Connected to SQLite:', config.DATABASE_PATH);
  });

  // WAL mode + foreign keys
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA synchronous = NORMAL;');
  db.exec('PRAGMA foreign_keys = ON;');

  // Run schema
  const schemaPath = join(__dirname, '..', 'db', 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');
  db.exec(schema, (err) => {
    if (err) console.error('[DB] Schema error:', err.message);
    else console.log('[DB] Schema applied.');
  });

  return db;
}

export function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
}

/**
 * Promisified db.get
 */
export function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

/**
 * Promisified db.all
 */
export function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

/**
 * Promisified db.run — resolves with { lastID, changes }
 */
export function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

/**
 * Run multiple statements in a serialized transaction
 */
export function dbTransaction(fn) {
  return new Promise((resolve, reject) => {
    const database = getDb();
    database.serialize(() => {
      database.run('BEGIN TRANSACTION');
      try {
        const result = fn(database);
        database.run('COMMIT', (err) => {
          if (err) reject(err);
          else resolve(result);
        });
      } catch (err) {
        database.run('ROLLBACK');
        reject(err);
      }
    });
  });
}
