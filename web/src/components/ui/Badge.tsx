import type { HTMLAttributes } from "react";
import { cn } from "../../lib/cn.ts";

type Tone = "default" | "ok" | "bad" | "warn" | "accent";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

const toneClass: Record<Tone, string> = {
  default: "border-rule text-ink",
  ok: "border-ok text-ok bg-ok-soft",
  bad: "border-bad text-bad bg-bad-soft",
  warn: "border-warn text-warn",
  accent: "border-accent bg-accent text-on-accent",
};

/** A square chip: a source key, a run result. Sentence case, never tracked capitals. */
export function Badge({ tone = "default", className, children, ...props }: BadgeProps) {
  return (
    <span
      {...props}
      className={cn(
        "inline-flex items-center whitespace-nowrap border px-[7px] py-px text-xs font-medium",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
