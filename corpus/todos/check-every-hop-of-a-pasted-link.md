---
title: Check every hop and the connected address of a pasted link
created: 2026-11-06
status: open
tags: [security, later]
---

# Check every hop and the connected address of a pasted link

Fetch details checks only the first hop of a pasted link: `assertPublicHost`
in `api/src/details/url.ts` resolves the host and refuses private addresses,
then `api/src/lib/fetch.ts` follows redirects with `redirect: 'follow'`, and
the Chromium fallback loads whatever the page asks for. Whether to close this
is the open question "The scrape endpoint on a server" in
[open-questions.md](../wiki/open-questions.md), left for "before anyone else
gets access". This todo is the recipe for that day, not a reason to do it now.

## Where the recipe comes from

A look at hyperlight-dev/hyperagent on 2026-11-06. Its fetch plugin
([README](https://github.com/hyperlight-dev/hyperagent/blob/main/plugins/fetch/README.md))
checks every resolved A and AAAA record against private ranges before it
connects, then checks `socket.remoteAddress` again after the TCP/TLS
handshake, which closes the DNS rebinding gap that a resolve-time check
leaves. IPv4-mapped and translated IPv6 forms are unwrapped and checked as
IPv4. It follows no redirects at all.

The per-hop half is already in the estate: newspapper's
`core/src/scrape/safe-url.ts` follows redirects by hand (at most 5), vets
every hop's addresses with an injectable lookup, and caps the body.
Newspapper left rebinding open "until a connect-time check is worth the
machinery"; HyperAgent's post-connect check is that machinery.

## What it would take

1. In the plain fetch, follow redirects by hand with the address check on
   every hop and a hop cap, as newspapper's `safeFetch` does.
2. Check the address actually connected to: a validating `lookup` on the
   connection (an undici `Agent` with `connect.lookup`, or `node:https` with
   `lookup`), or the remote address after connect as HyperAgent does. Global
   `fetch` alone exposes neither.
3. In Chromium, abort requests to private addresses with `page.route`.
   Chromium resolves names itself, so rebinding stays possible there; say so
   in `docs/decisions.md`.

No RAM cost. Step 2 may make undici a direct dependency (it is in
`node_modules` already, through cheerio).

## Acceptance

A pasted link that redirects to a loopback or private address is refused
with the same notice as a direct one, and so is a host whose stub lookup
answers public at check time and private at connect time. Tests use stub
lookups, as newspapper's do. Do it before anyone but the owner is granted
ro-housing in Ward.
