import type {
  ApartmentFields,
  Partitioning,
  SavedApartment,
  SavedInput,
} from '../api.ts';
import { PARTITIONINGS } from '../api.ts';
import { floorLabel } from './format.ts';

/** The form edits strings; parseForm turns them back into a SavedInput. */
export interface FormValues {
  url: string;
  title: string;
  priceEur: string;
  rooms: string;
  sqm: string;
  floor: string;
  floorsTotal: string;
  yearBuilt: string;
  location: string;
  partitioning: string;
  imageUrl: string;
  notes: string;
}

export type FormField = keyof FormValues;
export type FormErrors = Partial<Record<FormField, string>>;

const asText = (v: number | string | null): string => (v === null ? '' : String(v));

export function formFromFields(
  url: string,
  f: ApartmentFields | null,
  notes: string | null = null,
): FormValues {
  return {
    url,
    title: asText(f?.title ?? null),
    priceEur: asText(f?.priceEur ?? null),
    rooms: asText(f?.rooms ?? null),
    sqm: asText(f?.sqm ?? null),
    floor: f?.floor == null ? '' : floorLabel(f.floor),
    floorsTotal: asText(f?.floorsTotal ?? null),
    yearBuilt: asText(f?.yearBuilt ?? null),
    location: asText(f?.location ?? null),
    partitioning: f?.partitioning ?? '',
    imageUrl: asText(f?.imageUrl ?? null),
    notes: asText(notes),
  };
}

export function formFromSaved(s: SavedApartment): FormValues {
  return formFromFields(s.url, s, s.notes);
}

class FieldError extends Error {}

function whole(v: string): number | null {
  const t = v.trim();
  if (!t) return null;
  if (!/^\d+$/.test(t)) throw new FieldError('Whole number');
  return Number(t);
}

/** "72.000", "72 000 €", "72,000" → 72000. Prices are never fractional. */
function price(v: string): number | null {
  const t = v.replace(/[\s.,€]|eur/gi, '');
  if (!t) return null;
  if (!/^\d+$/.test(t)) throw new FieldError('Price in euro, digits only');
  return Number(t);
}

/** "42,5" or "42.5" → 42.5. */
function area(v: string): number | null {
  const t = v.trim().replace(/\s*(m²|mp|m2)$/i, '').replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) throw new FieldError('Number of m²');
  return n;
}

/** "P"/"parter" → 0, "D"/"demisol"/"S"/"subsol" → -1, digits → number. */
export function parseFloorInput(v: string): number | null {
  const t = v.trim().toLowerCase();
  if (!t) return null;
  if (t === 'p' || t === 'parter') return 0;
  if (['d', 'demisol', 's', 'subsol'].includes(t)) return -1;
  if (/^\d{1,2}$/.test(t)) return Number(t);
  throw new FieldError('P, D or a number');
}

export function parseForm(
  v: FormValues,
): { ok: true; input: SavedInput } | { ok: false; errors: FormErrors } {
  const errors: FormErrors = {};
  const read = <T>(field: FormField, fn: (s: string) => T): T | null => {
    try {
      return fn(v[field]);
    } catch (err) {
      if (!(err instanceof FieldError)) throw err;
      errors[field] = err.message;
      return null;
    }
  };
  const text = (s: string) => s.trim() || null;

  const url = v.url.trim();
  if (!/^https?:\/\/\S+$/i.test(url)) errors.url = 'A link starting with http:// or https://';
  const imageUrl = text(v.imageUrl);
  if (imageUrl && !/^https?:\/\/\S+$/i.test(imageUrl)) errors.imageUrl = 'A link, or empty';

  const floor = read('floor', parseFloorInput);
  const floorsTotal = read('floorsTotal', whole);
  if (floor !== null && floorsTotal !== null && floor > floorsTotal) {
    errors.floor = 'Above the top floor';
  }
  const partitioning = (PARTITIONINGS as readonly string[]).includes(v.partitioning)
    ? (v.partitioning as Partitioning)
    : null;

  const input: SavedInput = {
    url,
    title: text(v.title),
    priceEur: read('priceEur', price),
    rooms: read('rooms', whole),
    sqm: read('sqm', area),
    floor,
    floorsTotal,
    yearBuilt: read('yearBuilt', whole),
    location: text(v.location),
    partitioning,
    imageUrl,
    notes: text(v.notes),
  };
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, input };
}
