-- Reference copy of the database schema. You do NOT need to run this:
-- the site creates these tables automatically the first time it's used.
CREATE TABLE IF NOT EXISTS applications (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT,
  status          TEXT NOT NULL DEFAULT 'new',   -- new | contacted | approved | waitlist | declined
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
);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications (status, created_at);
CREATE TABLE IF NOT EXISTS rate_events (kind TEXT NOT NULL, key TEXT NOT NULL, ts INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_rate_events ON rate_events (kind, key, ts);
