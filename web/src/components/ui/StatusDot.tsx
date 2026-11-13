import { cn } from "../../lib/cn.ts";

type Status = "ok" | "bad" | "warn" | "unknown";

const classByStatus: Record<Status, string> = {
  ok: "bg-ok",
  bad: "bg-bad",
  warn: "bg-warn",
  unknown: "bg-ink-faint",
};

export function StatusDot({ status, className }: { status: Status; className?: string }) {
  return (
    <span aria-hidden className={cn("inline-block size-2 border border-rule", classByStatus[status], className)} />
  );
}
