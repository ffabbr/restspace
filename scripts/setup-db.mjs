import postgres from "postgres";

async function setup() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const sslNoVerify = process.env.PG_SSL_NO_VERIFY === "true";
  const sql = postgres(process.env.DATABASE_URL, {
    max: 1,
    prepare: false,
    ssl: sslNoVerify ? { rejectUnauthorized: false } : true,
    connect_timeout: 10,
  });

  console.log("Creating tables...");

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS authenticators (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      credential_id TEXT UNIQUE NOT NULL,
      credential_public_key TEXT NOT NULL,
      counter BIGINT NOT NULL DEFAULT 0,
      transports TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS thoughts (
      id SERIAL PRIMARY KEY,
      content TEXT NOT NULL,
      font TEXT NOT NULL DEFAULT 'sans-serif',
      category TEXT NOT NULL DEFAULT 'thought',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS challenges (
      id TEXT PRIMARY KEY,
      challenge TEXT NOT NULL,
      user_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  console.log("Tables created successfully!");

  await sql.end({ timeout: 5 });
}

setup().catch(console.error);
