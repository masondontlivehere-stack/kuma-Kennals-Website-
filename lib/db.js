// D1 access. The schema is created automatically on first use,
// so a fresh database needs no manual setup.
import { ConfigError } from './http.js';

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS applications (
     id              INTEGER PRIMARY KEY AUTOINCREMENT,
     created_at      TEXT NOT NULL,
     updated_at      TEXT,
     status          TEXT NOT NULL DEFAULT 'new',
     name            TEXT NOT NULL,
     email           TEXT NOT NULL,
     phone           TEXT NOT NULL,
     city            TEXT NOT NULL,
     state           TEXT NOT NULL,
     home            TEXT NOT NULL,
     timeline        TEXT NOT NULL,
     timeline_custom TEXT,
     sex             TEXT,
     experience      TEXT,
     message         TEXT NOT NULL,
     notes           TEXT NOT NULL DEFAULT '',
     notified_at     TEXT,
     notify_error    TEXT,
     ip_hash         TEXT
   )`,
  `CREATE INDEX IF NOT EXISTS idx_applications_status ON applications (status, created_at)`,
  `CREATE TABLE IF NOT EXISTS rate_events (
     kind TEXT NOT NULL,
     key  TEXT NOT NULL,
     ts   INTEGER NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS idx_rate_events ON rate_events (kind, key, ts)`,
];

let ready = null;

export async function getDB(env) {
  if (!env.DB) throw new ConfigError('The D1 database binding "DB" is missing.');
  if (!ready) {
    ready = env.DB.batch(SCHEMA.map((sql) => env.DB.prepare(sql))).catch((err) => {
      ready = null;
      throw err;
    });
  }
  await ready;
  return env.DB;
}

export const STATUSES = ['new', 'contacted', 'approved', 'waitlist', 'declined'];

// Columns the dashboard may see (never the IP hash).
export const PUBLIC_COLUMNS =
  'id, created_at, updated_at, status, name, email, phone, city, state, home, timeline, ' +
  'timeline_custom, sex, experience, message, notes, notified_at, notify_error';

export function reference(id) {
  return 'KK-' + String(id).padStart(4, '0');
}
