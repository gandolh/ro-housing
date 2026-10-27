import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ApiError, api, type SavedApartment, type ScrapeResult } from '../api.ts';
import { ApartmentForm } from '../components/ApartmentForm.tsx';
import { ApiErrorNotice } from '../components/ApiErrorNotice.tsx';
import { SavedTable } from '../components/SavedTable.tsx';
import { Button } from '../components/ui/Button.tsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '../components/ui/Dialog.tsx';
import { Input } from '../components/ui/Input.tsx';
import { Panel } from '../components/ui/Panel.tsx';
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValueLabel,
} from '../components/ui/Select.tsx';
import {
  formFromFields,
  formFromSaved,
  parseForm,
  type FormErrors,
  type FormField,
  type FormValues,
} from '../lib/apartment.ts';
import { pricePerSqm } from '../lib/format.ts';

type Sort = 'saved' | 'price' | 'perSqm' | 'sqm' | 'year';

const SORT_LABELS: Record<Sort, string> = {
  saved: 'Sort: newest saved',
  price: 'Sort: price, low first',
  perSqm: 'Sort: €/m², low first',
  sqm: 'Sort: m², large first',
  year: 'Sort: year built, new first',
};

/** Ascending key per sort; nulls always last. */
const SORT_KEY: Record<Sort, (s: SavedApartment) => number | null> = {
  saved: (s) => -s.savedAt,
  price: (s) => s.priceEur,
  perSqm: (s) => pricePerSqm(s.priceEur, s.sqm),
  sqm: (s) => (s.sqm === null ? null : -s.sqm),
  year: (s) => (s.yearBuilt === null ? null : -s.yearBuilt),
};

function sortSaved(list: SavedApartment[], sort: Sort): SavedApartment[] {
  const key = SORT_KEY[sort];
  return [...list].sort((a, b) => {
    const ka = key(a);
    const kb = key(b);
    if (ka === null) return kb === null ? 0 : 1;
    if (kb === null) return -1;
    return ka - kb;
  });
}

const TOTAL_FIELDS = 10;

type Stage =
  | { kind: 'idle' }
  | { kind: 'fetching' }
  | { kind: 'existing'; result: ScrapeResult; existing: SavedApartment }
  | {
      kind: 'draft';
      result: ScrapeResult;
      values: FormValues;
      page: { values: FormValues; found: FormField[] } | undefined;
    };

function message(err: unknown): string {
  return err instanceof ApiError || err instanceof Error ? err.message : String(err);
}

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface Props {
  /** A link handed over from the Listings tab's "save" action. */
  incomingLink: string | null;
  onIncomingTaken: () => void;
}

export function SavedPage({ incomingLink, onIncomingTaken }: Props) {
  const [saved, setSaved] = useState<SavedApartment[]>([]);
  const [sort, setSort] = useState<Sort>('saved');
  const [link, setLink] = useState('');
  const [stage, setStage] = useState<Stage>({ kind: 'idle' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [notice, setNotice] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const [editing, setEditing] = useState<SavedApartment | null>(null);
  const [editValues, setEditValues] = useState<FormValues | null>(null);
  const [editErrors, setEditErrors] = useState<FormErrors>({});
  const [editProblem, setEditProblem] = useState<string | null>(null);

  const [loadError, setLoadError] = useState<{ error: unknown } | null>(null);
  const [loading, setLoading] = useState(false);

  const reload = async () => {
    setSaved(await api.listSaved());
    setLoadError(null);
  };

  // The first load, and Retry: a failure shows in place of the table, so an
  // API that is not running does not look like an empty shortlist.
  const load = async () => {
    setLoading(true);
    try {
      await reload();
    } catch (error) {
      setLoadError({ error });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const fetchDetails = async (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) {
      setNotice({ tone: 'bad', text: 'Paste a listing link first.' });
      return;
    }
    setNotice(null);
    setErrors({});
    setStage({ kind: 'fetching' });
    try {
      const result = await api.scrapeLink(trimmed);
      if (result.existing) {
        setStage({ kind: 'existing', result, existing: result.existing });
        return;
      }
      const values = formFromFields(result.url, result.draft);
      setStage({
        kind: 'draft',
        result,
        values,
        page: result.problem ? undefined : { values, found: result.found },
      });
    } catch (err) {
      setStage({ kind: 'idle' });
      setNotice({ tone: 'bad', text: message(err) });
    }
  };

  // StrictMode runs this effect twice in dev; the ref keeps it to one fetch
  // per hand-over, and resets once the parent clears the link.
  const handledLink = useRef<string | null>(null);
  useEffect(() => {
    if (!incomingLink) {
      handledLink.current = null;
      return;
    }
    if (handledLink.current === incomingLink) return;
    handledLink.current = incomingLink;
    setLink(incomingLink);
    void fetchDetails(incomingLink);
    onIncomingTaken();
  }, [incomingLink]);

  const onSubmitLink = (e: FormEvent) => {
    e.preventDefault();
    void fetchDetails(link);
  };

  const setDraftField = (field: FormField, value: string) => {
    setStage((s) => (s.kind === 'draft' ? { ...s, values: { ...s.values, [field]: value } } : s));
  };

  const saveDraft = async () => {
    if (stage.kind !== 'draft') return;
    const parsed = parseForm(stage.values);
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setBusy(true);
    try {
      const row = await api.createSaved(parsed.input);
      setStage({ kind: 'idle' });
      setLink('');
      setErrors({});
      setNotice({ tone: 'ok', text: `Saved: ${row.title ?? row.url}` });
      await reload();
    } catch (err) {
      setNotice({ tone: 'bad', text: message(err) });
    } finally {
      setBusy(false);
    }
  };

  const discard = () => {
    setStage({ kind: 'idle' });
    setErrors({});
    setNotice(null);
  };

  const startEdit = (s: SavedApartment) => {
    setEditing(s);
    setEditValues(formFromSaved(s));
    setEditErrors({});
    setEditProblem(null);
  };

  const saveEdit = async () => {
    if (!editing || !editValues) return;
    const parsed = parseForm(editValues);
    if (!parsed.ok) {
      setEditErrors(parsed.errors);
      return;
    }
    setBusy(true);
    try {
      await api.updateSaved(editing.id, parsed.input);
      setEditing(null);
      // The "Already saved: <title>" line would show the pre-edit values.
      setStage((s) => (s.kind === 'existing' ? { kind: 'idle' } : s));
      await reload();
    } catch (err) {
      setEditProblem(message(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (s: SavedApartment) => {
    try {
      await api.deleteSaved(s.id);
      await reload();
    } catch (err) {
      setNotice({ tone: 'bad', text: message(err) });
    }
  };

  const sorted = useMemo(() => sortSaved(saved, sort), [saved, sort]);
  const hasDraft = stage.kind === 'draft';

  return (
    <div>
      <Panel className="px-3 py-3">
        <form onSubmit={onSubmitLink} className="flex gap-2">
          <Input
            aria-label="Listing link"
            placeholder="Paste a listing link: storia.ro, an agency site, imobiliare.ro…"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            disabled={stage.kind === 'fetching'}
          />
          <Button
            type="submit"
            variant={hasDraft ? 'default' : 'primary'}
            disabled={stage.kind === 'fetching'}
            className="shrink-0"
          >
            {stage.kind === 'fetching' ? 'Reading the page…' : 'Fetch details'}
          </Button>
        </form>
        {notice && (
          <p
            role={notice.tone === 'bad' ? 'alert' : 'status'}
            className={notice.tone === 'bad' ? 'mt-2 text-xs text-bad' : 'mt-2 text-xs text-ok'}
          >
            {notice.text}
          </p>
        )}
        {stage.kind === 'idle' && !notice && (
          <p className="mt-2 text-xs text-ink-dim">
            Reads what it can from the page. You check every field before anything is saved.
          </p>
        )}

        {stage.kind === 'existing' && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-rule-soft pt-3 text-sm">
            <span>
              Already saved on {fmtDate(stage.existing.savedAt)}
              {stage.existing.title ? `: ${stage.existing.title}` : ''}.
            </span>
            <Button variant="default" onClick={() => startEdit(stage.existing)}>
              Edit it
            </Button>
            <Button variant="ghost" onClick={discard}>
              Clear
            </Button>
          </div>
        )}

        {stage.kind === 'draft' && (
          <div className="mt-3 border-t border-rule-soft pt-3">
            {stage.result.problem ? (
              <p role="alert" className="mb-3 border border-bad bg-bad-soft px-2 py-1.5 text-xs text-bad">
                {stage.result.problem.message} Nothing was read from {stage.result.site}. Fill in what
                you know; the link is saved with it.
              </p>
            ) : (
              <p className="mb-3 text-xs text-ink-dim">
                Read {stage.result.found.length} of {TOTAL_FIELDS} fields from {stage.result.site}
                {stage.result.via === 'browser' ? ' (through a browser)' : ''}. Check them, fill the
                gaps, then save.
              </p>
            )}
            <div className="flex flex-col gap-3 sm:flex-row">
              {stage.values.imageUrl && (
                <img
                  src={stage.values.imageUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-28 w-40 shrink-0 border border-ink object-cover"
                />
              )}
              <div className="flex-1">
                <ApartmentForm
                  values={stage.values}
                  onChange={setDraftField}
                  errors={errors}
                  page={stage.page}
                  disabled={busy}
                />
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="ghost" onClick={discard} disabled={busy}>
                Discard
              </Button>
              <Button variant="primary" onClick={saveDraft} disabled={busy}>
                {busy ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        )}
      </Panel>

      <div className="mt-4 flex items-center gap-2">
        <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
          <SelectTrigger aria-label="Sort saved apartments">
            <SelectValueLabel labels={SORT_LABELS} />
          </SelectTrigger>
          <SelectPopup>
            {(Object.keys(SORT_LABELS) as Sort[]).map((k) => (
              <SelectItem key={k} value={k}>
                {SORT_LABELS[k]}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
        {!loadError && (
          <span className="ml-auto text-xs uppercase tracking-wide text-ink-dim">{saved.length} saved</span>
        )}
      </div>

      <div className="mt-3">
        {loadError ? (
          <ApiErrorNotice
            action="Couldn't load the saved apartments"
            error={loadError.error}
            onRetry={() => void load()}
            busy={loading}
          />
        ) : (
          <SavedTable saved={sorted} onEdit={startEdit} onDelete={remove} />
        )}
      </div>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="w-[min(760px,94vw)]">
          <DialogTitle>Edit saved apartment</DialogTitle>
          <DialogDescription>
            Saved {editing ? fmtDate(editing.savedAt) : ''}. Changes here are yours; nothing is
            fetched again.
          </DialogDescription>
          {editValues && (
            <div className="mt-3">
              <ApartmentForm
                values={editValues}
                onChange={(field, value) => setEditValues((v) => (v ? { ...v, [field]: value } : v))}
                errors={editErrors}
                showUrl
                disabled={busy}
              />
            </div>
          )}
          {editProblem && (
            <p role="alert" className="mt-2 text-xs text-bad">
              {editProblem}
            </p>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditing(null)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="primary" onClick={saveEdit} disabled={busy}>
              {busy ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
