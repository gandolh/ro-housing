import { useSyncExternalStore } from "react";
import { appBase } from "./base.ts";

/**
 * Three addresses under the base: the app itself, the login page and the
 * account page (where Ward sends the browser back after linking). Small enough
 * that a router library would be the bigger part. The tabs inside the app are
 * not addresses.
 */
export type Page = "app" | "login" | "account";

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("popstate", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("popstate", listener);
  };
}

/** The page a path names; anything else under the base is the app. */
export function pageOf(pathname: string, base: string = appBase()): Page {
  const rest = pathname.startsWith(base) ? pathname.slice(base.length) : "";
  const name = rest.replace(/\/+$/, "");
  return name === "login" ? "login" : name === "account" ? "account" : "app";
}

export function pathOf(page: Page): string {
  return page === "app" ? appBase() : `${appBase()}${page}`;
}

/** Go to a page without a reload. `replace` keeps Back from returning here. */
export function navigate(page: Page, { replace = false }: { replace?: boolean } = {}): void {
  const path = pathOf(page);
  if (window.location.pathname === path) return;
  if (replace) window.history.replaceState(null, "", path);
  else window.history.pushState(null, "", path);
  for (const listener of listeners) listener();
}

/** The page the address shows; re-renders when it changes. */
export function usePage(): Page {
  return useSyncExternalStore(subscribe, () => pageOf(window.location.pathname));
}
