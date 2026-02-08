import { neon } from "@neondatabase/serverless";

const DB_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const USE_SQLITE = !DB_URL;

// --- Types ---

export interface Thought {
  id: number;
  content: string;
  font: string;
  category: string;
  created_at: string;
}

export interface ChallengeRow {
  id: string;
  challenge: string;
  user_id: string | null;
  created_at: string;
}

export interface AuthenticatorRow {
  id: string;
  user_id: string;
  credential_id: string;
  credential_public_key: string;
  counter: number;
  transports: string | null;
  created_at: string;
}

// --- SQLite (local dev) ---

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _sqlite: any = null;

async function getSqlite() {
  if (!_sqlite) {
    const Database = (await import("better-sqlite3")).default;
    const path = await import("path");
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
  return neon(DB_URL!);
}

// --- Table init ---

let _tablesReady = false;

export async function ensureTables() {
  if (_tablesReady) return;
  if (USE_SQLITE) {
    await getSqlite();
    _tablesReady = true;
    return;
  }
  const sql = getNeon();
  await sql`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, created_at TIMESTAMPTZ DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS authenticators (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), credential_id TEXT UNIQUE NOT NULL, credential_public_key TEXT NOT NULL, counter BIGINT NOT NULL DEFAULT 0, transports TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS thoughts (id SERIAL PRIMARY KEY, content TEXT NOT NULL, font TEXT NOT NULL DEFAULT 'sans-serif', category TEXT NOT NULL DEFAULT 'thought', created_at TIMESTAMPTZ DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS challenges (id TEXT PRIMARY KEY, challenge TEXT NOT NULL, user_id TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`;
  _tablesReady = true;
}

// --- Exported functions ---

export async function getThoughts(limit = 100, offset = 0): Promise<Thought[]> {
  await ensureTables();
  if (USE_SQLITE) {
    const db = await getSqlite();
    return db.prepare("SELECT id, content, font, category, created_at || 'Z' as created_at FROM thoughts ORDER BY created_at DESC LIMIT ? OFFSET ?").all(limit, offset) as Thought[];
  }
  const sql = getNeon();
  return (await sql`SELECT id, content, font, category, created_at FROM thoughts ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`) as Thought[];
}

export async function createThought(content: string, font: string, category: string): Promise<Thought> {
  await ensureTables();
  if (USE_SQLITE) {
    const db = await getSqlite();
    const stmt = db.prepare("INSERT INTO thoughts (content, font, category) VALUES (?, ?, ?) RETURNING id, content, font, category, created_at || 'Z' as created_at");
    return stmt.get(content, font, category) as Thought;
  }
  const sql = getNeon();
  const rows = await sql`INSERT INTO thoughts (content, font, category) VALUES (${content}, ${font}, ${category}) RETURNING id, content, font, category, created_at`;
  return rows[0] as Thought;
}

export async function createUser(id: string) {
  await ensureTables();
  if (USE_SQLITE) {
    const db = await getSqlite();
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
  await ensureTables();
  if (USE_SQLITE) {
    const db = await getSqlite();
    db.prepare("INSERT INTO authenticators (id, user_id, credential_id, credential_public_key, counter, transports) VALUES (?, ?, ?, ?, ?, ?)").run(id, userId, credentialId, publicKey, counter, transports);
    return;
  }
  const sql = getNeon();
  await sql`INSERT INTO authenticators (id, user_id, credential_id, credential_public_key, counter, transports) VALUES (${id}, ${userId}, ${credentialId}, ${publicKey}, ${counter}, ${transports})`;
}

export async function getAuthenticatorsByUserId(userId: string): Promise<AuthenticatorRow[]> {
  await ensureTables();
  if (USE_SQLITE) {
    const db = await getSqlite();
    return db.prepare("SELECT * FROM authenticators WHERE user_id = ?").all(userId) as AuthenticatorRow[];
  }
  const sql = getNeon();
  return (await sql`SELECT * FROM authenticators WHERE user_id = ${userId}`) as AuthenticatorRow[];
}

export async function getAuthenticatorByCredentialId(credentialId: string): Promise<AuthenticatorRow | null> {
  await ensureTables();
  if (USE_SQLITE) {
    const db = await getSqlite();
    return (db.prepare("SELECT * FROM authenticators WHERE credential_id = ?").get(credentialId) as AuthenticatorRow) || null;
  }
  const sql = getNeon();
  const rows = await sql`SELECT * FROM authenticators WHERE credential_id = ${credentialId}`;
  return (rows[0] as AuthenticatorRow) || null;
}

export async function updateAuthenticatorCounter(credentialId: string, counter: number) {
  await ensureTables();
  if (USE_SQLITE) {
    const db = await getSqlite();
    db.prepare("UPDATE authenticators SET counter = ? WHERE credential_id = ?").run(counter, credentialId);
    return;
  }
  const sql = getNeon();
  await sql`UPDATE authenticators SET counter = ${counter} WHERE credential_id = ${credentialId}`;
}

export async function saveChallenge(sessionId: string, challenge: string, userId?: string) {
  await ensureTables();
  if (USE_SQLITE) {
    const db = await getSqlite();
    db.prepare("INSERT OR REPLACE INTO challenges (id, challenge, user_id) VALUES (?, ?, ?)").run(sessionId, challenge, userId ?? null);
    return;
  }
  const sql = getNeon();
  await sql`INSERT INTO challenges (id, challenge, user_id) VALUES (${sessionId}, ${challenge}, ${userId ?? null}) ON CONFLICT (id) DO UPDATE SET challenge = ${challenge}, user_id = ${userId ?? null}`;
}

export async function getChallenge(sessionId: string): Promise<ChallengeRow | null> {
  await ensureTables();
  if (USE_SQLITE) {
    const db = await getSqlite();
    return (db.prepare("SELECT * FROM challenges WHERE id = ?").get(sessionId) as ChallengeRow) || null;
  }
  const sql = getNeon();
  const rows = await sql`SELECT * FROM challenges WHERE id = ${sessionId}`;
  return (rows[0] as ChallengeRow) || null;
}

export async function deleteChallenge(sessionId: string) {
  await ensureTables();
  if (USE_SQLITE) {
    const db = await getSqlite();
    db.prepare("DELETE FROM challenges WHERE id = ?").run(sessionId);
    return;
  }
  const sql = getNeon();
  await sql`DELETE FROM challenges WHERE id = ${sessionId}`;
}
