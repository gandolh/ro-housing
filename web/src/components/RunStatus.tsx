import type { Source } from "../api.ts";
import { fmtWhen } from "../lib/format.ts";
import { Icon } from "./Icon.tsx";

/** A source that failed on its last run: a square chip with an icon and the word, so colour is never alone. */
function FailedChip() {
  return (
    <b className="inline-flex items-center gap-1 border border-bad bg-bad-soft px-1.5 text-xs font-bold text-bad">
      <Icon name="xcircle" size={12} />
      failed
    </b>
  );
}

/** "last run: 3m ago" with a check after a clean run, `failed` after a failed one, and a note when it found
 *  nothing. The line wraps by whole items. */
export function LastRun({ source }: { source: Source }) {
  const failed = source.lastRunOk === false;
  const empty = source.lastRunOk === true && source.lastRunCount === 0;
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-dim">
      {source.lastRunOk === true && <Icon name="check" size={12} className="shrink-0 text-ok" />}
      <span className="whitespace-nowrap">last run: {fmtWhen(source.lastRunAt)}</span>
      {failed && <FailedChip />}
      {empty && <span className="whitespace-nowrap font-medium text-warn">found no listings</span>}
    </span>
  );
}
