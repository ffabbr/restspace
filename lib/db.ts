import postgres from "postgres";

function pickDbUrl(): { url: string | undefined; source: string } {
  const candidates: Array<[string, string | undefined]> = [
    // Manual override (useful when platform-managed vars are locked).
    ["DB_OVERRIDE_URL", process.env.DB_OVERRIDE_URL],
    // Platform-provided connection strings (usually poolers, e.g. port 6543).
    // These are often more reliable in serverless environments than direct connections.
    ["POSTGRES_URL", process.env.POSTGRES_URL],
    ["POSTGRES_PRISMA_URL", process.env.POSTGRES_PRISMA_URL],
    // Direct connection (usually port 5432). May fail DNS in some Vercel regions.
    ["POSTGRES_URL_NON_POOLING", process.env.POSTGRES_URL_NON_POOLING],
    // Fallback to generic DATABASE_URL (least specific).
    // Placed last so specific Supabase vars take precedence if DATABASE_URL is broken/stale.
    ["DATABASE_URL", process.env.DATABASE_URL],
  ];

  for (const [source, value] of candidates) {
    const trimmed = value?.trim();
    if (trimmed) return { url: trimmed, source };
  }
  return { url: undefined, source: "none" };
}

const { url: DB_URL, source: DB_URL_SOURCE } = pickDbUrl();
const USE_SQLITE = !DB_URL;

export function getDbDebugInfo(): string {
  if (!DB_URL) return "db=missing";
  try {
    const parsed = new URL(DB_URL);
    return `db_source=${DB_URL_SOURCE} db_host=${parsed.host} db_proto=${parsed.protocol}`;
  } catch {
    return `db_source=${DB_URL_SOURCE} db_url=unparseable`;
  }
}

// --- Types ---

export interface Thought {
  id: number;
  content: string;
  font: string;
  category: string;
  color: string;
  user_id: string | null;
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
        color TEXT NOT NULL DEFAULT 'default',
        user_id TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS challenges (
        id TEXT PRIMARY KEY,
        challenge TEXT NOT NULL,
        user_id TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);
    // Migrations
    const cols = _sqlite.pragma("table_info(thoughts)") as { name: string }[];
    if (!cols.some((c: { name: string }) => c.name === "color")) {
      _sqlite.exec("ALTER TABLE thoughts ADD COLUMN color TEXT NOT NULL DEFAULT 'default'");
    }
    if (!cols.some((c: { name: string }) => c.name === "user_id")) {
      _sqlite.exec("ALTER TABLE thoughts ADD COLUMN user_id TEXT");
    }
  }
  return _sqlite;
}

// --- Postgres (production) ---

type PostgresClient = ReturnType<typeof postgres>;
let _pg: PostgresClient | null = null;

function getPostgres() {
  if (_pg) return _pg;

  // `prepare:false` is important for PgBouncer / Supabase pooler.
  const sslNoVerify = process.env.PG_SSL_NO_VERIFY === "true";
  _pg = postgres(DB_URL!, {
    max: 3,
    prepare: false,
    ssl: sslNoVerify ? { rejectUnauthorized: false } : true,
    connect_timeout: 10,
    idle_timeout: 20,
  });

  return _pg;
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
  const sql = getPostgres();
  await sql`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, created_at TIMESTAMPTZ DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS authenticators (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), credential_id TEXT UNIQUE NOT NULL, credential_public_key TEXT NOT NULL, counter BIGINT NOT NULL DEFAULT 0, transports TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS thoughts (id SERIAL PRIMARY KEY, content TEXT NOT NULL, font TEXT NOT NULL DEFAULT 'sans-serif', category TEXT NOT NULL DEFAULT 'thought', color TEXT NOT NULL DEFAULT 'default', user_id TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`;
  await sql`ALTER TABLE thoughts ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT 'default'`;
  await sql`ALTER TABLE thoughts ADD COLUMN IF NOT EXISTS user_id TEXT`;
  await sql`CREATE TABLE IF NOT EXISTS challenges (id TEXT PRIMARY KEY, challenge TEXT NOT NULL, user_id TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`;
  _tablesReady = true;
}

// --- Exported functions ---

export async function getThoughts(limit = 100, offset = 0): Promise<Thought[]> {
  await ensureTables();
  if (USE_SQLITE) {
    const db = await getSqlite();
    return db.prepare("SELECT id, content, font, category, color, user_id, created_at || 'Z' as created_at FROM thoughts ORDER BY created_at DESC LIMIT ? OFFSET ?").all(limit, offset) as Thought[];
  }
  const sql = getPostgres();
  return (await sql`SELECT id, content, font, category, color, user_id, created_at FROM thoughts ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`) as Thought[];
}

export async function getThoughtsBefore(before: number, limit = 30): Promise<Thought[]> {
  await ensureTables();
  if (USE_SQLITE) {
    const db = await getSqlite();
    return db.prepare("SELECT id, content, font, category, color, user_id, created_at || 'Z' as created_at FROM thoughts WHERE id < ? ORDER BY created_at DESC LIMIT ?").all(before, limit) as Thought[];
  }
  const sql = getPostgres();
  return (await sql`SELECT id, content, font, category, color, user_id, created_at FROM thoughts WHERE id < ${before} ORDER BY created_at DESC LIMIT ${limit}`) as Thought[];
}

export async function getThoughtsLatest(limit = 30): Promise<Thought[]> {
  await ensureTables();
  if (USE_SQLITE) {
    const db = await getSqlite();
    return db.prepare("SELECT id, content, font, category, color, user_id, created_at || 'Z' as created_at FROM thoughts ORDER BY created_at DESC LIMIT ?").all(limit) as Thought[];
  }
  const sql = getPostgres();
  return (await sql`SELECT id, content, font, category, color, user_id, created_at FROM thoughts ORDER BY created_at DESC LIMIT ${limit}`) as Thought[];
}

export async function createThought(content: string, font: string, category: string, color: string, userId: string): Promise<Thought> {
  await ensureTables();
  if (USE_SQLITE) {
    const db = await getSqlite();
    const stmt = db.prepare("INSERT INTO thoughts (content, font, category, color, user_id) VALUES (?, ?, ?, ?, ?) RETURNING id, content, font, category, color, user_id, created_at || 'Z' as created_at");
    return stmt.get(content, font, category, color, userId) as Thought;
  }
  const sql = getPostgres();
  const rows = await sql`INSERT INTO thoughts (content, font, category, color, user_id) VALUES (${content}, ${font}, ${category}, ${color}, ${userId}) RETURNING id, content, font, category, color, user_id, created_at`;
  return rows[0] as Thought;
}

export async function updateThought(id: number, content: string, userId: string): Promise<Thought | null> {
  await ensureTables();
  if (USE_SQLITE) {
    const db = await getSqlite();
    const stmt = db.prepare("UPDATE thoughts SET content = ? WHERE id = ? AND user_id = ? RETURNING id, content, font, category, color, user_id, created_at || 'Z' as created_at");
    return (stmt.get(content, id, userId) as Thought) || null;
  }
  const sql = getPostgres();
  const rows = await sql`UPDATE thoughts SET content = ${content} WHERE id = ${id} AND user_id = ${userId} RETURNING id, content, font, category, color, user_id, created_at`;
  return (rows[0] as Thought) || null;
}

export async function createUser(id: string) {
  await ensureTables();
  if (USE_SQLITE) {
    const db = await getSqlite();
    db.prepare("INSERT OR IGNORE INTO users (id) VALUES (?)").run(id);
    return;
  }
  const sql = getPostgres();
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
  const sql = getPostgres();
  await sql`INSERT INTO authenticators (id, user_id, credential_id, credential_public_key, counter, transports) VALUES (${id}, ${userId}, ${credentialId}, ${publicKey}, ${counter}, ${transports})`;
}

export async function getAuthenticatorsByUserId(userId: string): Promise<AuthenticatorRow[]> {
  await ensureTables();
  if (USE_SQLITE) {
    const db = await getSqlite();
    return db.prepare("SELECT * FROM authenticators WHERE user_id = ?").all(userId) as AuthenticatorRow[];
  }
  const sql = getPostgres();
  return (await sql`SELECT * FROM authenticators WHERE user_id = ${userId}`) as AuthenticatorRow[];
}

export async function getAuthenticatorByCredentialId(credentialId: string): Promise<AuthenticatorRow | null> {
  await ensureTables();
  if (USE_SQLITE) {
    const db = await getSqlite();
    return (db.prepare("SELECT * FROM authenticators WHERE credential_id = ?").get(credentialId) as AuthenticatorRow) || null;
  }
  const sql = getPostgres();
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
  const sql = getPostgres();
  await sql`UPDATE authenticators SET counter = ${counter} WHERE credential_id = ${credentialId}`;
}

export async function saveChallenge(sessionId: string, challenge: string, userId?: string) {
  await ensureTables();
  if (USE_SQLITE) {
    const db = await getSqlite();
    db.prepare("INSERT OR REPLACE INTO challenges (id, challenge, user_id) VALUES (?, ?, ?)").run(sessionId, challenge, userId ?? null);
    return;
  }
  const sql = getPostgres();
  await sql`INSERT INTO challenges (id, challenge, user_id) VALUES (${sessionId}, ${challenge}, ${userId ?? null}) ON CONFLICT (id) DO UPDATE SET challenge = ${challenge}, user_id = ${userId ?? null}`;
}

export async function getChallenge(sessionId: string): Promise<ChallengeRow | null> {
  await ensureTables();
  if (USE_SQLITE) {
    const db = await getSqlite();
    return (db.prepare("SELECT * FROM challenges WHERE id = ?").get(sessionId) as ChallengeRow) || null;
  }
  const sql = getPostgres();
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
  const sql = getPostgres();
  await sql`DELETE FROM challenges WHERE id = ${sessionId}`;
}
