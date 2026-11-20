# The board's notes: ro-housing

The estate redesign board is a private canvas. This file copies what its page for this app said beside the screens: the owner's asks, the decisions, the rules the design reopened, the open questions and the Floor. The owner's answers are in [README.md](../README.md#the-owners-decisions).

## Asks to the owner

- 1. Reopened: Listings' toolbar and table become one island, and the hard offset sticker shadow (today only on popups) goes on that island in light, against design.md's "no shadows on standard elements". Yes or no? 2. Keep burnt ochre (a little darker, `#a35100`) as the accent, now that satchel and lantern hold neighbouring hues, or move to violet? And keep all-mono, or set listing titles in a proportional face with mono for figures (both judges suggested it)? 3. Approve The console, re-ruled as ro-housing's direction? (beside `ro-housing-direction`)

## Decisions

- Source health: the source control lists each site with its last run (open state on the Direction sheet), a failed site shows a red `failed` with an icon, and when any source failed a warning line sits beside the control (judge ruling 1, from B). (beside `ro-housing-proposed-listings-1280`)
- Price is the first stop: 16 px bold, right-aligned, mono figures, in a 116 px column (ruling 4). Refresh is now a quiet secondary button, never the loudest control (ruling 3); the page's solid ink button is Fetch details on Saved and Save on Sources. (beside `ro-housing-proposed-listings-1280`)
- Phone: a bottom bar of Listings, Saved, Sources replaces the top tabs; each card leads with the price (18 px bold), then the title, then fixed rows (rooms, m2, age; location and source), with a 48 px Save; the island's head stacks Refresh with the count, the source control, sort and order, and the failed-source line (rulings 2, from B). (beside `ro-housing-proposed-listings-390`)
- Type: Source Code Pro (today's stack names it; the capture fell back to a system mono) at 12, 14, 16, 18 and 20, nothing smaller; tracked capitals become sentence case. ș, ț, ă, â and î render with comma-below forms. (beside `ro-housing-direction`)
- Dark is its own palette, not Material's #121212: a warm near-black ground, panels one step lighter with a 4.4:1 rule edge. The island's hard shadow is dropped in dark; popups keep the 3px hard offset in both themes (design.md: hard-edge, not blurry). Stale text goes from 2.8:1 to 7.5:1 and 7.1:1. (beside `ro-housing-direction`)
- The link box becomes the island's head band, with the hint, the sort and the count on its second line, so the table and its toolbar read as one surface; Fetch details is the one solid button. (beside `ro-housing-proposed-saved-1280`)
- Price leads the data columns as on Listings (bold, right-aligned). Title, source chip, layout and note stay together in the Apartment cell; empty thumbnails show a quiet image glyph. (beside `ro-housing-proposed-saved-1280`)
- Edit and Delete become ghost buttons with icons, 48 px on a phone, where today's are bare text links. (beside `ro-housing-proposed-saved-1280`)
- The head band holds Save and Discard (disabled until something changes, as today), the source-health line and "7 of 10 enabled". (beside `ro-housing-proposed-sources-1280`)
- A failed source carries a 4 px red edge, a `failed` word with an icon (never colour alone) and its warning in the head band. Last-run state is text plus a check mark, with the site key at the right. (beside `ro-housing-proposed-sources-1280`)
- Save is a lighter ghost button with a bookmark icon, on every row as today: no toggle, no saved mark on the listings. The filled Saved state is on the Direction sheet only. (beside `ro-housing-proposed-listings-1280`)
- Stale rows now carry a hollow ring before the Age value, and the foot line keys it: ring Dimmed: not found by its source's last refresh; dot new: first seen 2 days ago or less. A row can be both new and dimmed (rows 4 and 10). Colour alone no longer separates stale rows. (beside `ro-housing-proposed-listings-1280`)
- Between 960 and 1199 px the table stays: Location moves under the title, History narrows and Save is icon-only. From 640 to 959 the listings are cards in two columns; below 640, one column. The table needs about 960 px to keep titles on two lines, so the break is 960, not the critic's 900. (beside `ro-housing-proposed-listings-1280`)
- The site key sits under the name, last run keeps a fixed 220 px, and the search URL takes the rest (about 560 px) so the longest seeded URL shows whole. A failed source is a square `failed` chip with a bad border on bad-soft; the side stripe is gone. (beside `ro-housing-proposed-sources-1280`)

## Open questions

- New or unseen rows get an ochre dot and the word `new` (ruling 5). The app has no seen flag, so the board marks rows first seen two days ago or less (rows 4 and 10); a rule is needed in the app. (beside `ro-housing-proposed-listings-1280`)
- 10 of 11 demo rows show as stale (dimmed) for an untraced reason; row 2 is the only fresh one. The board draws it as it is; worth a look in the app. (beside `ro-housing-proposed-listings-1280`)
- Hide the URL field on unchecked sources on a phone? It would fit 7 rows at 390 like today, but changes behaviour (the field is how you paste a new URL). Left as is; owner's call. (beside `ro-housing-proposed-sources-390`)
- A saved mark on a listing needs a URL join the app doesn't have (saved is keyed by URL with no link to listings, decisions.md); Save opens a draft today. The filled Saved specimen on this sheet shows the look only. Owner's call whether the code brief adds the join. (beside `ro-housing-direction`)

## The Floor

- Contrast is scripted over 33 pairs: text min 4.53 light and 4.81 dark, UI parts 4.8 and 3.9, panel on paper 1.12 and 1.19 with a 1px rule edge on every surface; all pass. No sideways overflow at 1280, 1024, 768, 390 or 360 in either theme, and no control or select spills its box (selects measured by text width). Phone targets are 48 px; the bottom bar is in flow at the page end. Sloplint --scope app --render gives 0 FAIL on all six twins (24b and 49b waived with reasons in the stamp). Form controls on this sheet now inherit the mono face and ink colour in both themes. (beside `ro-housing-direction`)

## Other notes

- Storia's row is below today's shot's fold; the demo seed enables it with a recent successful run and its search URL, which the board copies.
- Prices keep the app's format (89.000 €, 1.712 €/m²). No dash appears in the data, so no lint gate needed a workaround. The phone's Saved cards drop the Floor and Built column heads into one line (floor 6/10, built 1980).
- First screen whole rows (not under the bottom bar), today / build. Listings: 1280x800 10 / 10; 390x844 0 / 3; 360x800 not captured / 3. Saved: 1280 5 / 5; 390 3 / 2; 360 not captured / 1. Sources: 1280 8 / 9; 390 7 / 5; 360 not captured / 5. Today's Sources 390 rows had URL fields 3 to 15 characters wide; the build's fields are full width. Getting back to 7 would mean hiding the URL field on unchecked sources, a behaviour change left to the owner.

## Contrast, as measured

| Pair | Light | Dark | Needs |
|---|---|---|---|
| ink on panel (rows, island) | 18.14 | 13.35 | 4.5 |
| ink on panel-alt (head band, column heads, hover) | 15.74 | 11.89 | 4.5 |
| ink on paper (footer, current-tab text) | 16.46 | 15.85 | 4.5 |
| ink on accent-soft (chosen menu item) | 15.83 | 11.16 | 4.5 |
| ink-dim on panel (stale rows, meta) | 7.33 | 7.11 | 4.5 |
| ink-dim on panel-alt (labels, count, foot line, stale row on hover) | 6.36 | 6.33 | 4.5 |
| ink-dim on paper (inactive tabs, bottom bar) | 6.65 | 8.44 | 4.5 |
| ink-faint on panel (placeholder) | 5.22 | 5.39 | 4.5 |
| ink-faint on panel-alt (disabled Save, Discard) | 4.53 | 4.81 | 4.5 |
| paper on ink (Fetch details, Save label) | 16.46 | 15.85 | 4.5 |
| accent on panel (the new word) | 5.53 | 7.02 | 4.5 |
| accent on panel-alt (the new word on a hovered row) | 4.8 | 6.25 | 4.5 |
| accent on accent-soft | 4.83 | 5.87 | 4.5 |
| ok on panel (last run: just now) | 6.47 | 8.56 | 4.5 |
| bad on panel (failed) | 7.48 | 6.97 | 4.5 |
| bad on panel-alt (failed on a hovered row) | 6.49 | 6.21 | 4.5 |
| bad on bad-soft (error notice) | 5.87 | 6.79 | 4.5 |
| ink on ok-soft (toast) | 15.46 | 11.35 | 4.5 |
| warn on panel-alt (source-health line in the head band) | 5.71 | 7.26 | 4.5 |
| warn on panel (unsaved count) | 6.58 | 8.15 | 4.5 |
| rule on panel (control borders, the frame) | 18.14 | 4.38 | 3 |
| rule on panel-alt (control borders in the head band) | 15.74 | 3.9 | 3 |
| rule on paper (the island's frame edge) | 16.46 | 5.2 | 3 |
| accent on panel (saved bookmark icon) | 5.53 | 7.02 | 3 |
| accent on paper (the current tab's rule) | 5.02 | 8.33 | 3 |
| accent on panel-alt (the current tab's rule, new dot) | 4.8 | 6.25 | 3 |
| focus ring on paper | 16.46 | 15.85 | 3 |
| focus ring on panel | 18.14 | 13.35 | 3 |
| focus ring on panel-alt | 15.74 | 11.89 | 3 |
| ok on panel (status dot) | 6.47 | 8.56 | 3 |
| panel on paper (surface on ground; needs 1.09 or an edge) | 1.1 | 1.19 | 1.09 |
| rule on paper (the surface's own edge; needs 1.3) | 16.46 | 5.2 | 1.3 |
| rule-soft on panel (row line, decorative) | 1.47 | 1.42 | 1.3 |

## The runner-up

**Runner-up: B, The source rail (sketch only, not built)**

Note: how this direction was picked. Two directions were sketched (A evolve today, B the source rail) and two judges compared every pair against today, in both orders, at 1280 light and 390 dark. Both beat today at both widths (today's stale rows fall to about 2.8:1, and its phone table cuts the price off). Between A and B the judges split, the same way at both widths: one chose A for its own voice and the full-width table, the other B for its grouping, the source list with each site's last run, and sans titles. With a tie, the recorded retro identity decided, and B's source health and price-first phone cards were folded into A. Say so here if you'd rather leave the retro console for B's sidebar and violet.

## The artboards on the board

- Direction · The console, re-ruled
- Listings · 1280 · light · today
- Listings · 390 · light · today
- Saved · 1280 · light · today
- Saved · 390 · light · today
- Sources · 1280 · light · today
- Sources · 390 · light · today
- Listings · 1280 · light · proposed
- Listings · 390 · dark · proposed
- Saved · 1280 · light · proposed
- Saved · 390 · dark · proposed
- Sources · 1280 · light · proposed
- Sources · 390 · dark · proposed
- Runner-up B, The source rail · light 1280 (sketch)
- Runner-up B, The source rail · dark 390 (sketch)
