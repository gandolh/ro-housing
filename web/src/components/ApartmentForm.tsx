import { useId } from 'react';
import { PARTITIONINGS } from '../api.ts';
import type { FormErrors, FormField, FormValues } from '../lib/apartment.ts';
import { parseForm } from '../lib/apartment.ts';
import { cn } from '../lib/cn.ts';
import { fmtPricePerSqm } from '../lib/format.ts';
import { Field, FieldError, FieldLabel } from './ui/Field.tsx';
import { Input } from './ui/Input.tsx';
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValueLabel,
} from './ui/Select.tsx';
import { Textarea } from './ui/Textarea.tsx';

const PARTITIONING_LABELS: Record<string, string> = {
  '': '—',
  ...Object.fromEntries(PARTITIONINGS.map((p) => [p, p])),
};

interface Props {
  values: FormValues;
  onChange: (field: FormField, value: string) => void;
  errors: FormErrors;
  /** Draft mode: the values the page gave, and which fields it filled. Each
   *  field is then marked "from page", "edited" or "not on page". */
  page?: { values: FormValues; found: FormField[] };
  /** The link is editable only when editing a saved apartment. */
  showUrl?: boolean;
  disabled?: boolean;
}

function Marker({ field, values, page }: Pick<Props, 'values' | 'page'> & { field: FormField }) {
  if (!page) return null;
  const label = page.found.includes(field)
    ? values[field] === page.values[field]
      ? 'from page'
      : 'edited'
    : 'not on page';
  return (
    <span
      className={cn(
        'ml-1.5 normal-case tracking-normal',
        label === 'not on page' ? 'text-ink-faint' : 'text-ink-dim',
      )}
    >
      · {label}
    </span>
  );
}

export function ApartmentForm({ values, onChange, errors, page, showUrl, disabled }: Props) {
  const partitioningLabelId = useId();

  const text = (
    field: FormField,
    label: string,
    opts: { span?: 2 | 4; placeholder?: string; inputMode?: 'numeric' | 'decimal' } = {},
  ) => (
    <Field
      invalid={Boolean(errors[field])}
      disabled={disabled}
      className={cn(opts.span === 2 && 'col-span-2', opts.span === 4 && 'col-span-2 sm:col-span-4')}
    >
      <FieldLabel>
        {label}
        <Marker field={field} values={values} page={page} />
      </FieldLabel>
      <Input
        value={values[field]}
        onChange={(e) => onChange(field, e.target.value)}
        placeholder={opts.placeholder}
        inputMode={opts.inputMode}
        autoComplete="off"
      />
      {errors[field] && <FieldError match>{errors[field]}</FieldError>}
    </Field>
  );

  // €/m² from what is typed right now, ignoring fields that don't parse yet.
  const preview = parseForm({ ...values, url: values.url || 'https://x' });
  const perSqm = preview.ok
    ? fmtPricePerSqm(preview.input.priceEur, preview.input.sqm)
    : '—';

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-4">
      {showUrl && text('url', 'Link', { span: 4 })}
      {text('title', 'Title', { span: 4 })}
      {text('priceEur', 'Price €', { inputMode: 'numeric' })}
      {text('rooms', 'Rooms', { inputMode: 'numeric' })}
      {text('sqm', 'Usable m²', { inputMode: 'decimal' })}
      <div>
        <span className="mb-1 block text-xs uppercase tracking-wide text-ink-dim">€/m²</span>
        <div className="flex h-7 items-center border border-rule-soft bg-panel-alt px-2 text-sm text-ink-dim">
          {perSqm}
        </div>
      </div>
      {text('floor', 'Floor', { placeholder: 'P, D, 1, 2…' })}
      {text('floorsTotal', 'Top floor', { inputMode: 'numeric' })}
      {text('yearBuilt', 'Year built', { inputMode: 'numeric' })}
      <div>
        <span id={partitioningLabelId} className="mb-1 block text-xs uppercase tracking-wide text-ink-dim">
          Partitioning
          <Marker field="partitioning" values={values} page={page} />
        </span>
        <Select
          value={values.partitioning}
          onValueChange={(v) => onChange('partitioning', String(v ?? ''))}
          disabled={disabled}
        >
          <SelectTrigger className="w-full" aria-labelledby={partitioningLabelId}>
            <SelectValueLabel labels={PARTITIONING_LABELS} />
          </SelectTrigger>
          <SelectPopup>
            {Object.entries(PARTITIONING_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
      </div>
      {text('location', 'Area', { span: 2, placeholder: 'Neighbourhood or street' })}
      {text('imageUrl', 'Photo link', { span: 2 })}
      <Field disabled={disabled} className="col-span-2 sm:col-span-4">
        <FieldLabel>Notes</FieldLabel>
        <Textarea
          aria-label="Notes"
          rows={2}
          value={values.notes}
          onChange={(e) => onChange('notes', e.target.value)}
          placeholder="Anything to remember when comparing: the visit, the agent's answers, the street noise…"
        />
      </Field>
    </div>
  );
}
