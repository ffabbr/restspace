# restspace

An anonymous, minimal space for sharing thoughts. No usernames, no profiles — just words and time.

## Features

- **Anonymous passkey auth** — no email, no password, no personal info. Just a device-bound passkey.
- **Categories** — classify posts as thoughts, diary entries, or aspirations. Filter from the sidebar.
- **Per-post fonts** — each post carries its own font choice (sans, serif, mono).
- **Dark mode** — follows system preference automatically.
- **Real-time polling** — feed refreshes every 15 seconds.

## Stack

- Next.js 15 (App Router)
- Tailwind CSS
- SimpleWebAuthn (passkey registration + login)
- Postgres (production) / SQLite (local dev)
- JWT sessions via jose

## Local development

```bash
npm install
npm run dev
```

No database setup needed — SQLite is used automatically when `DATABASE_URL` is not set. A `local.db` file is created in the project root.

## Deploy to Vercel

1. Push to GitHub and import into Vercel.
2. Add a Postgres database (e.g. Supabase or Neon).
3. Set environment variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `JWT_SECRET` | Random secret string for session tokens |
| `RP_ID` | Your domain, e.g. `myapp.vercel.app` |
| `ORIGIN` | Full origin, e.g. `https://myapp.vercel.app` |

4. Run the database setup once:

```bash
DATABASE_URL="your-connection-string" npm run db:setup
```

## Project structure

```
app/
  layout.tsx          Root layout + theme provider
  page.tsx            Main page (sidebar, feed, input bar)
  api/
    thoughts/         GET (public) / POST (auth required)
    auth/             Passkey registration + login endpoints
components/
  ThoughtFeed.tsx     Filterable feed with animated transitions
  InputBar.tsx        Fixed bottom input with category + font pickers
  ThemeProvider.tsx    Dark/light theme via system preference
lib/
  db.ts              Database layer (SQLite local, Neon production)
  session.ts         JWT session management
```
