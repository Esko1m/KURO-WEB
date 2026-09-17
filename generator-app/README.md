# KURO Account Generator

React app that generates and manages accounts the way `scripts/mkuser.mjs` does,
backed by a Supabase `koen_users` table.

## Features

- **Generator** — pick a username/password (or randomize), optional expiry date,
  password is SHA-256 hashed with the salt `koen-ios-2026-7` and the account is
  persisted to Supabase (`ACCOUNT CREATED`).
- **Dashboard** — view all users (username, HWID lock state, expiry, created, last
  login), reveal password hashes, search by username, and delete users with an
  inline confirmation.

## Setup

1. `npm install`
2. `npm run dev`
3. Open the **Dashboard** tab and enter your Supabase URL and key (service-role
   or anon). They are stored only in your browser's localStorage — never commit
   a real key to this repo.
4. Recommended: run supabase.sql once in the Supabase SQL editor.

## supabase.sql

Adds the expiry column used by the generator's "Expires" option and the
dashboard's expiry badges:

```sql
ALTER TABLE koen_users ADD COLUMN IF NOT EXISTS expires_at timestamptz;
CREATE INDEX IF NOT EXISTS koen_users_expires_at_idx ON koen_users (expires_at);
```

The dashboard shows a "one-time setup needed" banner with this SQL whenever the
column is missing.

## Scripts

- `npm run dev` — dev server
- `npm run build` — production build
- `npm run lint` — oxlint