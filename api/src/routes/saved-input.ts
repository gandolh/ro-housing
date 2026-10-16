import { PARTITIONINGS, type Partitioning } from '../details/extract.ts';
import { normalizeListingUrl } from '../details/url.ts';

/** A saved apartment as the user confirmed it. Only `url` is required: a
 *  blocked page still gets saved, with whatever the user typed in. */
export interface SavedInput {
  url: string;
  title: string | null;
  priceEur: number | null;
  rooms: number | null;
  sqm: number | null;
  floor: number | null;
  floorsTotal: number | null;
  yearBuilt: number | null;
  location: string | null;
  partitioning: Partitioning | null;
  imageUrl: string | null;
  notes: string | null;
}

type Result = { ok: true; value: SavedInput } | { ok: false; error: string };

class InputError extends Error {}

function text(body: Record<string, unknown>, key: string, max: number): string | null {
  const v = body[key];
  if (v === undefined || v === null) return null;
  if (typeof v !== 'string') throw new InputError(`${key} must be text`);
  const t = v.trim();
  if (t.length > max) throw new InputError(`${key} is too long (max ${max} characters)`);
  return t || null;
}

function number(
  body: Record<string, unknown>,
  key: string,
  lo: number,
  hi: number,
  integer: boolean,
): number | null {
  const v = body[key];
  if (v === undefined || v === null || v === '') return null;
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new InputError(`${key} must be a number`);
  }
  if (integer && !Number.isInteger(v)) throw new InputError(`${key} must be a whole number`);
  if (v < lo || v > hi) throw new InputError(`${key} must be between ${lo} and ${hi}`);
  return v;
}

export function parseSavedInput(raw: unknown): Result {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'expected a JSON object' };
  }
  const body = raw as Record<string, unknown>;
  try {
    const url = normalizeListingUrl(typeof body.url === 'string' ? body.url : '');
    if (!url || url.length > 2_000) throw new InputError('url must be an http(s) link');

    const imageUrl = text(body, 'imageUrl', 2_000);
    if (imageUrl && !/^https?:\/\/\S+$/i.test(imageUrl)) {
      throw new InputError('imageUrl must be an http(s) link');
    }

    const partitioning = text(body, 'partitioning', 20);
    if (partitioning && !(PARTITIONINGS as readonly string[]).includes(partitioning)) {
      throw new InputError(`partitioning must be one of ${PARTITIONINGS.join(', ')}`);
    }

    const floor = number(body, 'floor', -2, 60, true);
    const floorsTotal = number(body, 'floorsTotal', 0, 60, true);
    if (floor !== null && floorsTotal !== null && floor > floorsTotal) {
      throw new InputError('floor is above the number of floors in the building');
    }

    return {
      ok: true,
      value: {
        url,
        title: text(body, 'title', 300),
        priceEur: number(body, 'priceEur', 0, 50_000_000, true),
        rooms: number(body, 'rooms', 1, 20, true),
        sqm: number(body, 'sqm', 1, 2_000, false),
        floor,
        floorsTotal,
        yearBuilt: number(body, 'yearBuilt', 1800, new Date().getFullYear() + 5, true),
        location: text(body, 'location', 120),
        partitioning: partitioning as Partitioning | null,
        imageUrl,
        notes: text(body, 'notes', 5_000),
      },
    };
  } catch (err) {
    if (err instanceof InputError) return { ok: false, error: err.message };
    throw err;
  }
}
