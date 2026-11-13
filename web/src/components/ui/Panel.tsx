import type { HTMLAttributes } from "react";
import { cn } from "../../lib/cn.ts";

// A 1px-ruled container on the panel ground, for the sign-in card and notices.
export function Panel({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={cn("border border-rule bg-panel", className)}>
      {children}
    </div>
  );
}

/** One tab's surface: the head band and the table or list as one framed piece, with the hard offset shadow
 *  in light (the token is none in dark). */
export function Island({ className, children, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section {...props} className={cn("border border-rule bg-panel shadow-island dark:shadow-none", className)}>
      {children}
    </section>
  );
}

/** The island's head band: the controls above the table, on the alt ground, ruled below. */
export function IslandHead({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        "flex min-h-14 flex-wrap items-center gap-3 border-b border-rule bg-panel-alt px-4 py-3",
        className,
      )}
    >
      {children}
    </div>
  );
}
