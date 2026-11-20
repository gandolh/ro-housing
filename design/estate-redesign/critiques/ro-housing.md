fix

# ro-housing: critique of A "The console, re-ruled" (with B's source health and phone cards)

Read from the twins' renders (1280, 1024, 768, 390, 360, light and dark), today's shots, the Direction sheet render, then the manifest, RESULT.md, the repo's docs/design.md, docs/decisions.md, schema.sql, ListingsTable.tsx and docs/images/demo-seed.mjs.

## First-screen density (measured on the 1:1 renders)

| Screen, viewport | Today | Build |
|---|---|---|
| Listings 1280x800 | 10 whole, 11 prices (price column hard to scan, 13 px, left-aligned) | 10 whole, 11 prices, bold right-aligned |
| Listings 1024x800 | not captured (today's 912 px table fits this width) | 4 whole cards; the table is gone |
| Listings 390x844 | 0 whole, 0 prices (the table is cut after m²) | 3 whole, 4 prices |
| Listings 360x800 | not captured | 3 whole, 3 prices (the 4th sits under the bar) |
| Sources 1280x800 | 8 whole | 9 whole (the manifest says 8) |
| Sources 390x844 | 7 whole, but the URL fields are 3 to 15 characters wide and the last-run lines break over 3 lines | 4 whole |
| Sources 360x800 | not captured | 3 whole |
| Saved 1280x800 | 5 of 5 | 5 of 5 |
| Saved 390x844 | 3 rows, columns past €/m² cut, notes clipped with "…" | 1 whole card, 2 prices |
| Saved 360x800 | not captured | 1 whole card |

The phone Listings gain is real. Sources at 390 is not "slightly worse". It drops from 7 to 4 rows, and Saved at 390 drops from 3 rows to 1 card. Nobody reported the Saved drop.

## Regressions against today

1. **Listings at 1024: the table turns into phone cards.** Today's 960 px table works at 1024. The build shows 4 stretched one-column cards with 48 px Save buttons and empty right halves. That loses today's first strength, comparing price and €/m² straight down a column. Fix: keep the table down to 900 px. Between 900 and 1199, move Location into the Title cell as a second line (12/16, ink-dim), narrow History to 72 px and keep the other columns. Titles stay at 2 lines or fewer, and nothing clips. Below 900, use cards, and between 640 and 899 lay them out in a two-column grid (each card is the phone card's 344 px), so 768 shows twice the listings it does now.
2. **Stale rows no longer stand apart.** Today's dimming read at a glance (though it failed contrast). The build changes only the colour: ink #15140f against ink-dim #58554c in light, #edebe4 against #b1ada3 in dark, and prices stay bold in both. In dark, rows 2 and 3 look almost alike. Fix without dropping below 4.5:1: in stale rows, set a hollow ring glyph (○, 12 px, ink-dim) before the Age value. Start the island's foot line with the same glyph: "○ Dimmed: not found by its source's last refresh." That gives a cue that doesn't depend on colour, and the foot line keys it.
3. **Sources 1280: the search URLs are clipped.** The URL field is a fixed 438 px column, while the last-run and key columns sit half empty. imobiliare's URL ends at "timis…" and storia's at "apartamen…". Today shows imobiliare's whole. Fix: put the site key under the name as a 12/16 ink-dim line, keep last run at a fixed 220 px, and give the field 1fr (about 600 px at 1280). The longest seeded URL, storia's 69 characters, is about 580 px at 14 px. Rows stay 64 px.
4. **Phone density on Sources and Saved** (see the table above). Fixes are under priority issue 3.

## Priority issues (ranked by cost to the user)

1. **The five "Saved" rows (1, 3, 6, 7, 8) show a link the app doesn't have.** decisions.md: `saved` is "its own table, keyed by normalized URL, with no link to `listings`". In the seed, listing URLs are `example.com/<source>/demo-N` and saved URLs point at real sites, so these five match the Saved tab by title only. Today Save opens a draft that the user confirms. It is not a toggle, and switching "Saved" off would delete a record that holds the user's notes. **Clash with ruling 6.** The ruling stands, so the board may draw the filled state with an honest label. Change the callout-3 sticky from `decision` to `open`. Have it say that this needs a URL join of listings and saved (decisions.md's own "Saved vs listings" open idea), that the seed's URLs don't match, and that these rows were matched by title. Tapping a filled "Saved" must open that apartment on the Saved tab. It must never un-save. Without that label, the board must not show these marks.
2. **Listings at 1024 loses the table** (regression 1). Every laptop with a side panel open lands here.
3. **Phone density on Sources and Saved.** No fix may clip content.
   - **Sources 390.** Now about 153 px a row. Put the checkbox in a 32 px left column with a 48x48 hit area that overlaps the name line. To its right, stack the name (14/20, wraps), a 4 px gap, the 48 px field, a 4 px gap, then one 12/16 line with last run on the left and the key on the right. Use 10 px top and bottom padding. That makes 10+20+4+48+4+16+10 = 112 px a row. Head band: Save, Discard and "7 of 10 enabled" on one 48 px row. At 360, "7 of 10 enabled" now wraps, so give the buttons 88 px each. Then the warning line. With 605 px between the band and the bar, that gives **5 whole rows at 390 and 4 to 5 at 360**. Today's 7 can't be reached unless the field is hidden on unchecked sources. That changes behaviour and is the owner's call. Don't do it to win a count.
   - **Saved 390.** Card now 249 px. Let the thumbnail sit beside the price row only, and run the title full width under it. At 360 the thumbnail column squeezes "Apartament 4 camere, Elisabetin, casă interbelică" into 3 lines. The two-line rule must be met with width, never with a line clamp. Move the source chip onto its own row with Edit and Delete as 48 px icon buttons at the right (pencil and bin, `aria-label="Edit <title>"` and `"Delete <title>"`, tooltip on long press). The layout word ("decomandat") joins the location line. Card about 190 px, so **2 whole cards at 390**.
   - **Listings 390.** Head band now 210 px. Row 1: Refresh (quiet, about 115 px) and the source select (flex). The select wraps to two lines when a long site such as `agentie-imobiliare-timisoara.ro` is chosen. Row 2: sort and order. Row 3: the warning on the left and "11 listings" on the right, wrapping under the warning at 360. Card padding goes from 16 to 12. Band about 154 px, so the 4th card's price, title and meta clear the bar.
4. **Clipping in the build at 360.** The sort select reads "Sort: last see", and row 2's `imobiliare` chip touches its Save button. Fix: let the sort select take the row's free width (min-width: max-content) with order at 96 px, and put the chip on the location line's own row when chip plus Save are wider than the card.
5. **`new` needs a key, and it collides with stale.** Rows 4 and 10 are both `new` and dimmed as stale. "First seen 2 days ago" next to "not found by its source's last refresh" reads as a contradiction. Add a key line to the foot: "● new: first seen 2 days ago or less." Keep the open sticky. Partly traced for the stale question: row 2 is the only fresh row because imobiliare's last run failed. ListingsTable's `staleCutoffs` then falls back to that source's newest `lastSeen`, which is row 2. Why every other row is stale is still untraced.
6. **The Direction sheet's component specimens render wrong.** Buttons and inputs fall back to a sans face in both themes. In the dark specimen, Refresh, Edit, Focused and both field values are dark on dark (about 1.2:1, confirmed at native size). Form controls don't inherit font or colour. Fix: `button,input,select,textarea{font:inherit;color:inherit}` in the twin and the canvas file. Then re-render the States block, where dark "Refreshing…" and the dark Discard show the same fault.
7. **The failed source row's 4 px red stripe** (detector `side-tab`, a true positive). design.md says "No glow, no shadow; the color change is the only signal" for row state. Fix: drop the inset stripe. Show `⊗ failed` as a square chip with a 1 px `bad` border on `bad-soft`, like the source chips. The word and the icon already carry the meaning.

## Strengths to keep

- The island: the current tab on `panel` with its ochre rule joins the head band and the table, framed in 1 px ink with the 3 px hard offset in light. This is the "islands" quality the owner asked for, and it is stronger than today's.
- The price column: bold, right-aligned, tabular, 116 px. It is the first stop at 1280, and it leads each phone card next to its history line.
- Source health where you pick the source: the failed line in the head band, last run on every site in the source menu and on Sources.
- A designed dark: warm #11110f ground, panels one step lighter, a lighter head band, no shadow. The surfaces still separate.

## Heuristic scores (0 to 4)

1. Visibility of system status: 3. Source health is clear; the stale cue is weak.
2. Match with the real world: 3. Romanian names with comma-below ș and ț, the app's € format; `new` is undefined until the key exists.
3. User control and freedom: 3. Discard, mounted tabs.
4. Consistency and standards: 2. The Save toggle implies behaviour the app doesn't have; cards at 1024 next to tables at 1280.
5. Error prevention: 3. One Refresh at a time; Save is disabled until something changes.
6. Recognition over recall: 3. Labelled controls, a visible sort and order.
7. Flexibility: 2. One source filter, no shortcuts (fine for a personal tool).
8. Aesthetic and minimal design: 3. Restrained, one accent; phone head bands are heavy.
9. Error recovery: 3. Retry in every error state, in the app's words.
10. Help: 2. Only the foot line and the Age tooltip.

Total 27/40.

## Detector (impeccable detect.mjs, run with its parser modules)

- **`flat-type-hierarchy`** (12/13/14/16/18), all six screen twins: dismissed. The 13 px is the canvas callout bubble (`.co`), not the app. The app scale is 12/14/16/18/20.
- **`side-tab`** on `.src.fail`, all six: **kept** (issue 7).
- **`low-contrast` 1.2:1**, Direction sheet: **kept** (issue 6).
- **`em-dash-overuse`**, Direction sheet: dismissed. The sheet has no em dashes; the detector counts `--color-*` token names.
- **`gpt-thin-border-wide-shadow`**, Direction sheet: **kept, minor.** The dark `--shadow-popup` is `0 6px 18px` blur, against design.md's "hard-edge ink shadow, not blurry" for popups. Use `3px 3px 0 var(--color-rule)` in dark too.

Don't dilute the ink-framed island with its joined tab and the bold right-aligned price column while fixing density. Give text width and rhythm back, and never clip it.
