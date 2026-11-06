# Task 20: Every hop of a fetch is checked, and the connection too

Promoted from the todo `check-every-hop-of-a-pasted-link` on 2026-11-06,
when the owner asked for it now rather than "before anyone else gets
access".

## Context

"Fetch details" on a pasted link checks only the first hop:
`assertPublicHost` in `api/src/details/url.ts` resolves the host and refuses
private addresses, then `createSession().get()` in `api/src/lib/fetch.ts`
fetches with `redirect: 'follow'`, so a public page that redirects to
loopback or the VPS's own services is followed unchecked; and `fetch`
resolves the name again when it connects, so a short-TTL name can answer
public to the check and private to the connection (DNS rebinding). The
Chromium fallback (`fetchRenderedHtml` in `api/src/lib/playwright.ts`)
loads whatever the page asks for. ro-housing runs on the VPS behind
sign-in; the threat is a pasted or scraped link, not the owner.

newspapper closed the same gap the same day (its brief 04, commit
`725a41a`): redirects followed by hand with the check on every hop (at most
5), and the real request made with `node:http` / `node:https` and a vetting
`lookup` option, so the socket connects only to an address that passed,
behind a small adapter that hands callers a web `Response`. Read its
`core/src/scrape/safe-url.ts` in the newspapper repo as the model; copy the
approach, not the file (the repos share no code).

## Owner decisions

Settled on 2026-11-06: build it now, the way newspapper did, with **no new
dependency** (newspapper's owner call: Node's own `http`/`https`, not the
`undici` package). Two smaller calls, with the default this brief builds:

1. **Which fetches.** Default: every fetch through `createSession()`, the
   adapters' scheduled scrapes of known sites included, not only pasted
   links. One path is simpler to keep right, and the known sites pass the
   check anyway.
2. **Chromium.** Default: `page.route('**/*')` aborts any request whose host
   is a literal private address or resolves (through the same check) to
   one, the page's own navigation and its redirects included. Chromium
   resolves names itself, so rebinding stays possible there; write that in
   `docs/decisions.md` as the accepted gap.

## Files you OWN

- `api/src/lib/fetch.ts` (the session: manual redirects, the vetting
  lookup, the request and adapter) and a new test file beside it
- `api/src/details/url.ts` (`isPrivateAddress` gains the IPv6 forms that
  carry an IPv4 address: NAT64 `64:ff9b::/96` and `::/96` judged as that
  IPv4, 6to4 `2002::/16` refused; `assertPublicHost` stays the early,
  cheap refusal) and `url.test.ts`
- `api/src/lib/playwright.ts` (the route filter) and its test if one fits
- `docs/decisions.md`, the `docs/` pages that describe fetching
  (`architecture.md`, `adapters.md`), `corpus/wiki/status.md`,
  `corpus/log.md`

## What to do

1. The vetting lookup, in both shapes `net.connect` calls it (a single
   address, and `all: true`): resolve, refuse unless every address is
   public, pass on only vetted ones. A literal IP host is checked the same
   way.
2. `get()`: follow redirects by hand (at most 5), checking every hop's URL
   with the same rules before connecting; keep the cookie jar per hop as
   now (cookies set by a redirect response are stored before the next
   hop); the 20 s timeout covers the whole chain. The request goes through
   `node:http`/`node:https` with the lookup; decompress `gzip`, `deflate`
   and `br` as `fetch` did; a refused hop throws the same "local addresses
   are not allowed" error the details route already turns into its notice.
3. Chromium: the route filter of decision 2.
4. Tests with stub lookups and a loopback server, as newspapper's do: a
   redirect to a loopback or private address is refused; a lookup that
   answers public first and `127.0.0.1` after (a rebinding) is refused and
   the loopback server sees no request; a public answer still fetches
   (reach the loopback server through a test-only seam that runs after the
   check, never by weakening it); a gzip body arrives decompressed; cookies
   carry across a redirect.

## Acceptance

- The tests above pass, with the typecheck and lint; the full test run only
  if it is quick.
- One real pasted listing from a site the adapters use still fetches its
  details, and the adapters' scrape of one source still works (one run, not
  a loop).
- **Owner step:** `node cli.ts ro-housing all` from vps-deploy.
