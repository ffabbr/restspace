import { neon } from "@neondatabase/serverless";
import Database from "better-sqlite3";
import path from "path";

const USE_SQLITE = !process.env.DATABASE_URL;

// --- SQLite (local dev) ---

let _sqlite: Database.Database | null = null;

function getSqlite(): Database.Database {
  if (!_sqlite) {
    const dbPath = path.join(process.cwd(), "local.db");
    _sqlite = new Database(dbPath);
    _sqlite.pragma("journal_mode = WAL");
    _sqlite.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS authenticators (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        credential_id TEXT UNIQUE NOT NULL,
        credential_public_key TEXT NOT NULL,
        counter INTEGER NOT NULL DEFAULT 0,
        transports TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS thoughts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        font TEXT NOT NULL DEFAULT 'sans-serif',
        category TEXT NOT NULL DEFAULT 'thought',
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS challenges (
        id TEXT PRIMARY KEY,
        challenge TEXT NOT NULL,
        user_id TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);
  }
  return _sqlite;
}

// --- Neon (production) ---

function getNeon() {
  return neon(process.env.DATABASE_URL!);
}

// --- Exported functions ---

export async function ensureTables() {
  if (USE_SQLITE) {
    getSqlite(); // tables created on init
    return;
  }
  const sql = getNeon();
  await sql`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, created_at TIMESTAMPTZ DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS authenticators (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), credential_id TEXT UNIQUE NOT NULL, credential_public_key TEXT NOT NULL, counter BIGINT NOT NULL DEFAULT 0, transports TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS thoughts (id SERIAL PRIMARY KEY, content TEXT NOT NULL, font TEXT NOT NULL DEFAULT 'sans-serif', category TEXT NOT NULL DEFAULT 'thought', created_at TIMESTAMPTZ DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS challenges (id TEXT PRIMARY KEY, challenge TEXT NOT NULL, user_id TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`;
}

export async function getThoughts(limit = 100, offset = 0) {
  if (USE_SQLITE) {
    const db = getSqlite();
    return db.prepare("SELECT id, content, font, category, created_at || 'Z' as created_at FROM thoughts ORDER BY created_at DESC LIMIT ? OFFSET ?").all(limit, offset);
  }
  const sql = getNeon();
  return await sql`SELECT id, content, font, category, created_at FROM thoughts ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
}

export async function createThought(content: string, font: string, category: string) {
  if (USE_SQLITE) {
    const db = getSqlite();
    const stmt = db.prepare("INSERT INTO thoughts (content, font, category) VALUES (?, ?, ?) RETURNING id, content, font, category, created_at || 'Z' as created_at");
    return stmt.get(content, font, category);
  }
  const sql = getNeon();
  const rows = await sql`INSERT INTO thoughts (content, font, category) VALUES (${content}, ${font}, ${category}) RETURNING id, content, font, category, created_at`;
  return rows[0];
}

export async function createUser(id: string) {
  if (USE_SQLITE) {
    const db = getSqlite();
    db.prepare("INSERT OR IGNORE INTO users (id) VALUES (?)").run(id);
    return;
  }
  const sql = getNeon();
  await sql`INSERT INTO users (id) VALUES (${id}) ON CONFLICT DO NOTHING`;
}

export async function saveAuthenticator(
  id: string,
  userId: string,
  credentialId: string,
  publicKey: string,
  counter: number,
  transports: string | null
) {
  if (USE_SQLITE) {
    const db = getSqlite();
    db.prepare("INSERT INTO authenticators (id, user_id, credential_id, credential_public_key, counter, transports) VALUES (?, ?, ?, ?, ?, ?)").run(id, userId, credentialId, publicKey, counter, transports);
    return;
  }
  const sql = getNeon();
  await sql`INSERT INTO authenticators (id, user_id, credential_id, credential_public_key, counter, transports) VALUES (${id}, ${userId}, ${credentialId}, ${publicKey}, ${counter}, ${transports})`;
}

export async function getAuthenticatorsByUserId(userId: string) {
  if (USE_SQLITE) {
    const db = getSqlite();
    return db.prepare("SELECT * FROM authenticators WHERE user_id = ?").all(userId);
  }
  const sql = getNeon();
  return await sql`SELECT * FROM authenticators WHERE user_id = ${userId}`;
}

export async function getAuthenticatorByCredentialId(credentialId: string) {
  if (USE_SQLITE) {
    const db = getSqlite();
    return db.prepare("SELECT * FROM authenticators WHERE credential_id = ?").get(credentialId) || null;
  }
  const sql = getNeon();
  const rows = await sql`SELECT * FROM authenticators WHERE credential_id = ${credentialId}`;
  return rows[0] || null;
}

export async function updateAuthenticatorCounter(credentialId: string, counter: number) {
  if (USE_SQLITE) {
    const db = getSqlite();
    db.prepare("UPDATE authenticators SET counter = ? WHERE credential_id = ?").run(counter, credentialId);
    return;
  }
  const sql = getNeon();
  await sql`UPDATE authenticators SET counter = ${counter} WHERE credential_id = ${credentialId}`;
}

export async function saveChallenge(sessionId: string, challenge: string, userId?: string) {
  if (USE_SQLITE) {
    const db = getSqlite();
    db.prepare("INSERT OR REPLACE INTO challenges (id, challenge, user_id) VALUES (?, ?, ?)").run(sessionId, challenge, userId ?? null);
    return;
  }
  const sql = getNeon();
  await sql`INSERT INTO challenges (id, challenge, user_id) VALUES (${sessionId}, ${challenge}, ${userId ?? null}) ON CONFLICT (id) DO UPDATE SET challenge = ${challenge}, user_id = ${userId ?? null}`;
}

export async function getChallenge(sessionId: string) {
  if (USE_SQLITE) {
    const db = getSqlite();
    return db.prepare("SELECT * FROM challenges WHERE id = ?").get(sessionId) || null;
  }
  const sql = getNeon();
  const rows = await sql`SELECT * FROM challenges WHERE id = ${sessionId}`;
  return rows[0] || null;
}

export async function deleteChallenge(sessionId: string) {
  if (USE_SQLITE) {
    const db = getSqlite();
    db.prepare("DELETE FROM challenges WHERE id = ?").run(sessionId);
    return;
  }
  const sql = getNeon();
  await sql`DELETE FROM challenges WHERE id = ${sessionId}`;
}
