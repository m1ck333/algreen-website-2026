-- Algreen site CMS (admin at /admin). Cloudflare D1.
-- Apply:  npx wrangler d1 migrations apply algreen-cms --remote
--
-- Content is stored as one JSON document per section in `kv` (drafts), plus the
-- last published snapshot under key 'published' (what the static build uses).

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    NOT NULL UNIQUE,
  display_name  TEXT,
  pw_hash       TEXT    NOT NULL,   -- base64 PBKDF2-SHA256 derived key
  pw_salt       TEXT    NOT NULL,   -- base64 random salt
  pw_iter       INTEGER NOT NULL,
  pw_changed_at INTEGER NOT NULL,   -- ms epoch; part of the session → changing it logs out other sessions
  created_at    INTEGER NOT NULL
);

-- Uploaded files (bytes live in R2 under `media/<id>`).
CREATE TABLE IF NOT EXISTS media (
  id         TEXT    PRIMARY KEY,
  kind       TEXT    NOT NULL CHECK (kind IN ('image', 'pdf')),
  name       TEXT    NOT NULL,
  mime       TEXT    NOT NULL,
  size       INTEGER NOT NULL,
  width      INTEGER,
  height     INTEGER,
  created_at INTEGER NOT NULL,
  created_by TEXT
);

-- Draft sections ('gallery', 'slots', 'docs', 'faq', 'texts', 'settings',
-- 'announcement'), the 'published' snapshot and 'publish_meta'.
CREATE TABLE IF NOT EXISTS kv (
  key        TEXT    PRIMARY KEY,
  value      TEXT    NOT NULL,
  updated_at INTEGER NOT NULL,
  updated_by TEXT
);

-- Failed-login counters for rate limiting (per IP and per username).
CREATE TABLE IF NOT EXISTS login_fail (
  key      TEXT    PRIMARY KEY,
  count    INTEGER NOT NULL,
  first_at INTEGER NOT NULL
);
