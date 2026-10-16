// Fills a throwaway ro-housing clone with made-up listings and saved
// apartments for the README screenshots. See shots.md.
//
//   node docs/images/demo-seed.mjs <clone-root> [api-base]
//
// Start the clone's API first (`cd api && npm run dev`): it creates the
// tables, and the saved apartments go in through POST /api/saved. Listings
// have no insert route, so they are written straight into the clone's
// data/ro-housing.db. Every title, price and note below is invented.

import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

const root = process.argv[2];
const api = process.argv[3] ?? 'http://127.0.0.1:3000';
if (!root) {
  console.error('usage: node docs/images/demo-seed.mjs <clone-root> [api-base]');
  process.exit(1);
}

const require = createRequire(join(resolve(root), 'api', 'package.json'));
const Database = require('better-sqlite3');
const db = new Database(join(resolve(root), 'data', 'ro-housing.db'));

const DAY = 86_400_000;
const now = Date.now();

const SEARCH_URLS = {
  storia: 'https://www.storia.ro/ro/rezultate/vanzare/apartament/timis/timisoara',
  imobiliare: 'https://www.imobiliare.ro/vanzare-apartamente/timisoara',
  foxfort: 'https://foxfort.ro/vanzare-apartamente/timisoara',
  apostu: 'https://www.apostuestate.ro/',
  primum: 'https://www.primum.ro/',
  district: 'https://districtestate.ro/proprietati/',
};

// [source, title, rooms, m², location, days since first seen, prices oldest → newest]
const LISTINGS = [
  ['storia', 'Apartament 2 camere, Soarelui, centrală proprie', 2, 52, 'Soarelui', 21, [92000, 92000, 89000]],
  ['imobiliare', 'Apartament 3 camere decomandat, Circumvalațiunii', 3, 68, 'Circumvalațiunii', 30, [124000, 121000, 121000, 118000]],
  ['foxfort', 'Apartament 3 camere, zona Iosefin, bloc nou', 3, 74, 'Iosefin', 12, [135000, 135000]],
  ['storia', 'Garsonieră renovată, Complexul Studențesc', 1, 32, 'Complexul Studențesc', 3, [54500]],
  ['foxfort', 'Apartament 2 camere, Fabric, etaj 2', 2, 49, 'Fabric', 17, [85000, 85000, 82000]],
  ['apostu', 'Apartament 2 camere, Freidorf, bloc 2025', 2, 50, 'Freidorf', 9, [104000, 102000]],
  ['primum', 'Apartament 2 camere, Calea Aradului, lift', 2, 50, 'Calea Aradului', 14, [108000, 108000, 108000]],
  ['district', 'Apartament 4 camere, Elisabetin, casă interbelică', 4, 112, 'Elisabetin', 26, [255000, 249000, 245000]],
  ['storia', 'Apartament 3 camere, Dâmbovița, renovat', 3, 64, 'Dâmbovița', 6, [112000, 109000]],
  ['imobiliare', 'Garsonieră, Lipovei, etaj 1', 1, 28, 'Lipovei', 1, [47000]],
  ['storia', 'Apartament 3 camere, Take Ionescu, două băi', 3, 80, 'Take Ionescu', 19, [165000, 162000, 159000]],
];

// imobiliare.ro shows as failed: on 2026-10-16 it answered every request
// with a bot check (docs/adapters.md), so a real refresh fails there too.
const enable = db.prepare(
  `UPDATE sources SET enabled = 1, search_url = ?, last_run_at = ?, last_run_ok = ? WHERE id = ?`,
);
for (const [id, url] of Object.entries(SEARCH_URLS)) {
  enable.run(url, now - 60_000, id === 'imobiliare' ? 0 : 1, id);
}

const insertListing = db.prepare(`
  INSERT INTO listings (source_id, source_uid, url, title, price_eur, rooms, sqm, location, first_seen, last_seen, raw_json)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}')
  ON CONFLICT(source_id, source_uid) DO NOTHING
  RETURNING id
`);
const insertPrice = db.prepare(
  `INSERT OR IGNORE INTO price_history (listing_id, observed_at, price_eur) VALUES (?, ?, ?)`,
);

LISTINGS.forEach(([source, title, rooms, sqm, location, age, prices], i) => {
  const uid = `demo-${i + 1}`;
  const firstSeen = now - age * DAY;
  const lastSeen = now - 60_000 - i * 1_000;
  const row = insertListing.get(
    source,
    uid,
    `https://example.com/${source}/${uid}`,
    title,
    prices[prices.length - 1],
    rooms,
    sqm,
    location,
    firstSeen,
    lastSeen,
  );
  if (!row) return;
  prices.forEach((p, k) => {
    const at = prices.length === 1 ? lastSeen : firstSeen + ((lastSeen - firstSeen) * k) / (prices.length - 1);
    insertPrice.run(row.id, Math.round(at), p);
  });
});

// Saved apartments, in the order they were "saved" (the newest last).
const SAVED = [
  {
    url: 'https://www.storia.ro/ro/oferta/exemplu-2-camere-soarelui',
    title: 'Apartament 2 camere, Soarelui, centrală proprie',
    priceEur: 89000, rooms: 2, sqm: 52, floor: 3, floorsTotal: 4, yearBuilt: 1984,
    location: 'Soarelui', partitioning: 'decomandat',
    notes: 'Seen on Saturday. Bright, the kitchen needs redoing.',
  },
  {
    url: 'https://foxfort.ro/vanzare-apartamente/timisoara/exemplu-iosefin',
    title: 'Apartament 3 camere, zona Iosefin, bloc nou',
    priceEur: 135000, rooms: 3, sqm: 74, floor: 2, floorsTotal: 6, yearBuilt: 2021,
    location: 'Iosefin', partitioning: 'semidecomandat',
    notes: 'The parking space costs 12.000 € on top.',
  },
  {
    url: 'https://www.apostuestate.ro/exemplu-2-camere-freidorf.html',
    title: 'Apartament 2 camere, Freidorf, bloc 2025',
    priceEur: 102000, rooms: 2, sqm: 50, floor: 3, floorsTotal: 3, yearBuilt: 2025,
    location: 'Freidorf', partitioning: 'semidecomandat',
    notes: 'New block. No bus stop close by yet.',
  },
  {
    url: 'https://districtestate.ro/proprietate/exemplu-elisabetin/',
    title: 'Apartament 4 camere, Elisabetin, casă interbelică',
    priceEur: 245000, rooms: 4, sqm: 112, floor: 0, floorsTotal: 2, yearBuilt: 1936,
    location: 'Elisabetin', partitioning: 'decomandat',
    notes: 'Ground floor with a garden. High ceilings.',
  },
  {
    url: 'https://www.primum.ro/exemplu-2-camere-calea-aradului.html',
    title: 'Apartament 2 camere, Calea Aradului, lift',
    priceEur: 108000, rooms: 2, sqm: 50, floor: 6, floorsTotal: 10, yearBuilt: 1980,
    location: 'Calea Aradului', partitioning: 'decomandat',
    notes: 'The agent says the price is negotiable.',
  },
];

for (const s of SAVED) {
  const res = await fetch(`${api}/api/saved`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl: null, ...s }),
  });
  if (res.status !== 201 && res.status !== 409) {
    throw new Error(`POST /api/saved → ${res.status}: ${await res.text()}`);
  }
}

console.log(`seeded ${LISTINGS.length} listings and ${SAVED.length} saved apartments`);
