CREATE TABLE IF NOT EXISTS sources (
  id           TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  search_url   TEXT,
  enabled      INTEGER NOT NULL DEFAULT 0,
  last_run_at  INTEGER,
  last_run_ok  INTEGER
);

CREATE TABLE IF NOT EXISTS listings (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id    TEXT NOT NULL REFERENCES sources(id),
  source_uid   TEXT NOT NULL,
  url          TEXT NOT NULL,
  title        TEXT,
  price_eur    INTEGER,
  rooms        INTEGER,
  sqm          REAL,
  location     TEXT,
  first_seen   INTEGER NOT NULL,
  last_seen    INTEGER NOT NULL,
  raw_json     TEXT,
  UNIQUE (source_id, source_uid)
);

CREATE TABLE IF NOT EXISTS price_history (
  listing_id   INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  observed_at  INTEGER NOT NULL,
  price_eur    INTEGER,
  PRIMARY KEY (listing_id, observed_at)
);

CREATE INDEX IF NOT EXISTS listings_source ON listings(source_id);
CREATE INDEX IF NOT EXISTS listings_last_seen ON listings(last_seen);

-- Apartments the user saved by pasting a listing link. Separate from
-- `listings`: these values were confirmed or typed by the user, and a Refresh
-- must never overwrite them. `raw_json` keeps what the page said at fetch time.
CREATE TABLE IF NOT EXISTS saved (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  url          TEXT NOT NULL UNIQUE,
  site         TEXT NOT NULL,
  title        TEXT,
  price_eur    INTEGER,
  rooms        INTEGER,
  sqm          REAL,
  floor        INTEGER,
  floors_total INTEGER,
  year_built   INTEGER,
  location     TEXT,
  partitioning TEXT,
  image_url    TEXT,
  notes        TEXT,
  raw_json     TEXT,
  fetched_at   INTEGER,
  saved_at     INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);
