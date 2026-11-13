import { useSyncExternalStore } from "react";

/** How Listings and Saved draw their rows at this width: `full` is the table with a Location column (1200 and
 *  up), `mid` the table with Location under the title (960 to 1199), `cards` the card list below 960. One
 *  layout is rendered at a time, so a row's text exists once for assistive tech. Where the browser has no
 *  media queries (the unit tests) it is `full`. */
export type Layout = "full" | "mid" | "cards";

const QUERIES = ["(min-width: 1200px)", "(min-width: 960px)"] as const;

function subscribe(onChange: () => void): () => void {
  if (typeof window.matchMedia !== "function") return () => undefined;
  const lists = QUERIES.map((q) => window.matchMedia(q));
  for (const l of lists) l.addEventListener("change", onChange);
  return () => {
    for (const l of lists) l.removeEventListener("change", onChange);
  };
}

function snapshot(): Layout {
  if (typeof window.matchMedia !== "function") return "full";
  if (window.matchMedia(QUERIES[0]).matches) return "full";
  return window.matchMedia(QUERIES[1]).matches ? "mid" : "cards";
}

export function useLayout(): Layout {
  return useSyncExternalStore(subscribe, snapshot, () => "full");
}
