# ro-housing: two directions

Written 2026-11-12 by the art director. Repo: ro-housing, brief 25. `docs/design.md` sets the look today: terminal-retro, monospace for everything, square corners, 1 px ink borders, a paper ground, one burnt-ochre accent used rarely, and no shadows except the hard offset "sticker" shadow on popups. Brief 25's default 1 keeps the retro direction as the starting point, and leaving it is a board question. So A stays inside it, and B is where that question lives.

Both directions keep this behaviour (`docs/decisions.md`): tabs stay mounted, one Refresh at a time, the "+TVA" marker beside the price and the €/m², stale rows dimmed in place (never hidden), a single-choice source filter, sort plus order, Save on every row (it hands the link to the Saved tab), and Light / Dark / System with light on a first visit. They use only the controls that exist today: Refresh, the source filter, sort, order, the count, nine data columns, the history line and Save. There is no map, no rooms or price filter and no duplicate mark, so the genre's map and "seen on N sites" are out of scope.

## 1. Today's strengths (keep all of them)

1. **One table island.** Every listing sits in one bordered table with a header band. The columns run Title, Source, Rooms, m², Price, €/m², Location, Age, History, so you compare price and €/m² straight down a column.
2. **History on the row.** Each row draws its price history: a line ending in a point, or a single point for one price. Change shows without a click.
3. **Stale rows stay visible, dimmed,** with the reason in the Age cell's tooltip ("not found by its source's last refresh").
4. **One toolbar row.** Refresh is the only solid button, then source, sort and order, and the count at the right end.
5. **A clear shell.** The header bar is its own surface, with the wordmark on the left and Report and the account on the right. Three underline tabs read as tabs. The footer bar says "Timișoara only".
6. **A visible look.** A bordered source chip on every row, square corners, ink rules: a tool that looks like a tool.

Weak today, and both directions fix it:
- **Phone:** at 390 the table scrolls sideways and is cut off after the m² column.
- **Floor and type:** tracked capitals (Hallmark Floor 9) become sentence case. 13 px type with 10 px labels goes to body 14 on desktop and 16 on phone, nothing under 12. The system mono (banned as a default) becomes a named Google face.
- **Rows:** stale text is `#9a9a9a` on white (2.8:1); titles wrap to three lines in the 960 px column; figures are left-aligned; every title has a full ink underline; Save is a 12 px text link.
- **Borrowed dark:** the dark ground `#121212` is Material's dark baseline to the digit.

## 2. The main screen

The **Listings** tab, with its shell (header, tabs, toolbar, table, footer).
- Today: `board/shots/ro-housing/light-1280-listings.png` and `light-390-listings.png` (dark: `dark-1280-listings.png`, `dark-390-listings.png`).
- Route `/ro-housing/`, first tab.

## 3. The content fixture

Copy it from the shot word for word. Strings are in source case, because the capitals today come from CSS; case is each direction's call.

- **Shell.** Header: the wordmark `ro-housing`, a button `Report (0/10)`, the account button `tester`. Tabs: `Listings` (current), `Saved`, `Sources`. Footer: `ro-housing` and `Timișoara only`.
- **Toolbar.** `Refresh`, the source filter `All sources`, the sort `Sort: last seen`, the order `↓ desc`, and the count `11 listings`.
  - Source filter items: `All sources` plus, in this order, `agentie-imobiliare-timisoara.ro`, `apostuestate.ro`, `blitz.ro`, `districtestate.ro`, `foxfort.ro`, `hitchmosher.ro`, `imobiliare.ro`, `imobiliare.ro (RSS)`, `primum.ro`, `storia.ro`.
  - Last-run lines, from the Sources tab (B shows them):
    - `last run: just now` for apostuestate.ro, districtestate.ro, foxfort.ro, primum.ro and storia.ro (storia is below the Sources shot's fold; the demo seed sets it ok);
    - `last run: just now — failed` for imobiliare.ro;
    - `last run: never` for the other four.
- **Column heads.** `Title`, `Source`, `Rooms`, `m²`, `Price`, `€/m²`, `Location`, `Age`, `History`, then a Save column with no visible head.
- **Save buttons.** Each is named `Save <title> for comparing`; the visible word is `save`, and a direction may capitalise it. No row has "+TVA".
- **Rows,** in this order (last seen, newest first). History lists the prices oldest to newest, from the repo's `docs/images/demo-seed.mjs`; one price draws a point. **Stale** means dimmed as in the shot: 10 of 11 rows. Only row 2 is at full ink. It comes from the demo data (the cause was not traced). Draw that state; don't "fix" it.

| # | Title | Source | Rooms | m² | Price | €/m² | Location | Age | History (€) | Stale |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Apartament 2 camere, Soarelui, centrală proprie | storia | 2 | 52 m² | 89.000 € | 1.712 €/m² | Soarelui | 20d | 92.000, 92.000, 89.000 | yes |
| 2 | Apartament 3 camere decomandat, Circumvalațiunii | imobiliare | 3 | 68 m² | 118.000 € | 1.735 €/m² | Circumvalațiunii | 29d | 124.000, 121.000, 121.000, 118.000 | no |
| 3 | Apartament 3 camere, zona Iosefin, bloc nou | foxfort | 3 | 74 m² | 135.000 € | 1.824 €/m² | Iosefin | 11d | 135.000, 135.000 | yes |
| 4 | Garsonieră renovată, Complexul Studențesc | storia | 1 | 32 m² | 54.500 € | 1.703 €/m² | Complexul Studențesc | 2d | 54.500 | yes |
| 5 | Apartament 2 camere, Fabric, etaj 2 | foxfort | 2 | 49 m² | 82.000 € | 1.673 €/m² | Fabric | 16d | 85.000, 85.000, 82.000 | yes |
| 6 | Apartament 2 camere, Freidorf, bloc 2025 | apostu | 2 | 50 m² | 102.000 € | 2.040 €/m² | Freidorf | 8d | 104.000, 102.000 | yes |
| 7 | Apartament 2 camere, Calea Aradului, lift | primum | 2 | 50 m² | 108.000 € | 2.160 €/m² | Calea Aradului | 13d | 108.000, 108.000, 108.000 | yes |
| 8 | Apartament 4 camere, Elisabetin, casă interbelică | district | 4 | 112 m² | 245.000 € | 2.188 €/m² | Elisabetin | 25d | 255.000, 249.000, 245.000 | yes |
| 9 | Apartament 3 camere, Dâmbovița, renovat | storia | 3 | 64 m² | 109.000 € | 1.703 €/m² | Dâmbovița | 5d | 112.000, 109.000 | yes |
| 10 | Garsonieră, Lipovei, etaj 1 | imobiliare | 1 | 28 m² | 47.000 € | 1.679 €/m² | Lipovei | today | 47.000 | yes |
| 11 | Apartament 3 camere, Take Ionescu, două băi | storia | 3 | 80 m² | 159.000 € | 1.988 €/m² | Take Ionescu | 18d | 165.000, 162.000, 159.000 | yes |

- **Leave out** the Refresh result strip and the error banner; they aren't in the shot.
- **States** for the Direction sheet, in the app's own words: empty `No listings yet. Configure source URLs and click Refresh.`; error `Couldn't load the listings`, with Retry; busy `Refreshing…`; conflict `Another Refresh is already running. Try again when it has finished.`
- **Font check for both directions:** render `Circumvalațiunii`, `Studențesc`, `Dâmbovița` and `Timișoara`, and confirm that ș, ț, â and ă come from the chosen face (comma below, not cedilla).

## 4. Directions

### A. The console, re-ruled (Evolve today)
- **Idea:** today's ink-ruled console, set in a real mono at reading size, with the toolbar joined to its table and a phone list that fits the screen.
- **Layout skeleton:**
  - **1280.**
    - **Header bar:** 48 px on `surface`, with a 1 px `rule` foot. The wordmark sits on the left; `Report (0/10)` (a bordered 32 px button) and `tester` on the right. The container is 1120 px (was 960), with 24 px gutters, so titles fit in two lines.
    - **Tabs:** three underline tabs on the ground. The current one sits on `surface` with a 2 px `accent` rule and joins the island below.
    - **The island:** one `surface` panel in a 1 px `rule` frame. Its head band is `surface-alt`, 56 px tall, and holds Refresh (solid ink, 36 px), the three 36 px bordered selects, and `11 listings` on the right. Under the head band are an ink rule and the column-head row (`surface-alt`).
    - **Rows:** 44 px minimum. Figures are right-aligned with tabular numerals, and the price is at 600. Titles are 2 lines at most, ink, with a `rule-soft` underline that thickens on hover. History is 88 × 20. Save is a bordered 32 px button. A `rule-soft` line separates rows.
    - **Stale rows** turn `ink-dim` (7.5:1) with an `ink-dim` line. The island's foot holds one line: `Dimmed: not found by its source’s last refresh.` (the tooltip's own words).
  - **390.**
    - **Header and tabs:** a 48 px header with the wordmark at 16. The tabs are full width, each target 48 px.
    - **The island's head stacks:** Refresh with the count; the source select at full width; then sort and order. Every control is 48 px.
    - **Rows become list items** inside the same island, never cards inside a card.
      - Line 1: the title, 16/24, two lines.
      - Line 2: the price at 18/24 600, the €/m² at 14/20, the history on the right.
      - Line 3: rooms, m², location, the source chip and the age as spaced items, with no middle dots. A 48 px Save sits at the right of this line.
    - **No sideways scroll.**
- **Type:** Source Code Pro, from Google Fonts (today's stack names it; the capture fell back to a system mono), weights 400 to 700. Five sizes: 12/16 at 500 for labels and chips; 14/20 for the table and controls; 16/24 for phone body; 18/24 for the phone price and the desktop wordmark (700, -0.02 em, uppercase as today); 20/28 kept free for dialog titles.
- **Palette,** today's token names (light / dark):
  - **Ground and surfaces:** paper `#f3f2ee` / `#11110f`; panel `#ffffff` / `#23221e`; panel-alt `#efede6` / `#2c2b26`.
  - **Text:** ink `#15140f` / `#edebe4`; ink-dim `#58554c` / `#b1ada3`; ink-faint `#6f6b62` / `#9a968c` (placeholder and disabled only).
  - **Lines:** rule (frames and control borders) `#15140f` / `#8a867b`; rule-soft `#d6d3c9` / `#3d3b35`.
  - **Accent** (burnt ochre, today's, made darker for contrast): accent `#a35100` / `#eb9a4a`; accent-soft `#f8ecdc` / `#3e2c17`; on-accent `#ffffff` / `#1a1206`.
  - **Status:** ok `#1f6b2a` / `#7fd08a`; bad `#a51a1a` / `#ff8a80`; warn `#7f5300` / `#e8b04e`.
  - **Focus:** 2 px ink, 2 px offset.
  - **Accent use:** the current tab's rule and the chosen item in a select. Never a fill on the Listings screen.
  - **Pre-checked (light / dark):**
    - ink on panel 18.4 / 13.4; ink-dim on panel 7.5 / 7.1; ink-dim on panel-alt 6.4 / 6.3; ink-faint on panel 5.3 / 5.4;
    - accent on panel 5.6 / 7.0; accent on accent-soft 4.8 / 5.9; on-accent on accent 5.6 / 8.2;
    - panel on paper 1.12 / 1.19; rule-soft on panel 1.5 / 1.4; dark rule on panel 4.4.
    - Re-run `contrast.mjs`.
- **Signature:** the island's frame. Today's dialog "sticker", a 3 px hard offset shadow in `ink`, becomes the depth of the table island in light, so the island visibly lies on the paper. In dark the frame stays, the shadow goes, and the panel steps up by lightness instead. This reopens one line of design.md ("no shadows on standard elements").
- **Reference:** `opencode.ai`, for one structural move: every word in one mono, with hierarchy from weight and size alone. Nothing of its palette or its face.

### B. The source rail
- **Idea:** an aggregator of ten sites shows them all the time. A left rail holds the places and every site with its last run. Picking a site is the filter, and the listings take the rest of the width, with the words in a sans and the figures in a mono.
- **Layout skeleton:**
  - **1280.**
    - **Header and grid:** a 56 px header bar on `surface` with a 1 px `line-strong` foot: the wordmark on the left, `Report (0/10)` and `tester` on the right. Under it, a 1200 px container with 24 px gutters, holding a 272 px rail and the main column with a 24 px gap.
    - **The rail:** one raised `surface` island with a 1 px `line-strong` edge, sticky under the header.
      - Places: `Listings` (current: `accent-soft` fill, `accent` text, 600), `Saved`, `Sources`. Rows are 44 px, with stroke icons.
      - A rule, then a head `Sources` (12/16 500 ink-dim).
      - `All sources` (chosen), then the ten sites as 44 px rows of one radio group: the name at 14/20, wrapping to a second line when it must (`agentie-imobiliare-timisoara.ro` is 31 characters; the row grows, it never clips), its last-run line under it at 12/16 `ink-dim`, and `failed` in `bad`. It is today's single-choice filter, moved.
    - **The main column:**
      - A head island holds `Listings` at 20/28 600 with `11 listings` under it. On the right sit the sort and order selects (36 px), then Refresh in solid ink (40 px), the screen's one primary action.
      - 16 px below it, the table island: the column heads on `surface-alt`, titles in sans 14/20 500, figures in mono 14/20 tabular and right-aligned, the price at 600, the source chip in mono 12/16 with an edge, History 88 × 20, Save as a 32 px button with an edge.
      - Stale rows and the foot line work as in A.
  - **390.**
    - **Top bar** of 56 px: the wordmark, Report and `tester`.
    - **Head:** `Listings` with `11 listings`, then Refresh at full width (48 px).
    - **Filter controls:** a 48 px `All sources` button opens a sheet holding the rail's site list. Sort and order sit beside each other, also 48 px.
    - **The list:** inside one island, rows as in A's phone layout, but the price comes first on line 1.
    - **Bottom bar,** 64 px: `Listings`, `Saved`, `Sources`, each an icon plus a label, the current one in `accent`. The list is padded by the bar's height.
- **Type:** IBM Plex Sans for words (titles, labels, controls); IBM Plex Mono for figures, source chips and the wordmark (600, 18/24, lowercase `ro-housing`). Six sizes: 12/16, 14/20, 16/24 (phone body), 18/24 (phone price), 20/28 (the page head), 24/32 (kept free for dialogs). This reopens "mono is the whole identity" (design.md), because Romanian titles of 45-50 characters wrap far less in a sans.
- **Palette** (light / dark), today's names plus `line-strong`:
  - **Ground and surfaces:** paper `#efeef2` / `#111015`; panel `#ffffff` / `#232129`; panel-alt `#f5f4f8` / `#2c2a33`.
  - **Text:** ink `#17151c` / `#ecebf1`; ink-dim `#56525f` / `#b3afbd`; ink-faint `#6c6876` / `#9a96a5`.
  - **Lines:** rule-soft `#dcd9e3` / `#393642`; line-strong (edges, control borders) `#8f8a9c` / `#6e6a7b`.
  - **Accent** (violet, the ink of a notary's stamp pad, where a flat purchase ends): accent `#6b2f8f` / `#d2a8ee`, hue about 278°, clear of the-board C's mulberry at 319°; accent-soft `#f0e7f6` / `#3b2b4a`; on-accent `#ffffff` / `#1a0f22`.
  - **Status:** as in A.
  - **Accent use:** the current place, the chosen site and the focus ring. Never as a fill on a button: the primary stays ink.
  - **Pre-checked (light / dark):**
    - ink on panel 18.1 / 13.4; ink-dim on panel 7.6 / 7.4; ink-faint on panel 5.4 / 5.5;
    - accent on panel 8.7 / 8.0; accent on accent-soft 7.2 / 6.5; ink on accent-soft 15.1 / 10.9; on-accent on accent 8.7 / 9.3;
    - panel on paper 1.15 / 1.19; line-strong on panel 3.3 / 3.0.
    - Dark ink-faint on accent-soft is 4.47, so no stale or faint text sits on the chosen fill.
    - Re-run `contrast.mjs`.
- **Signature:** the rail is both the filter and the health of every site. Each site's last run (`just now`, `never`, `failed`) shows right where you pick it, so a broken source is seen from the Listings tab, not only on Sources.
- **Reference:** `stripe`, for one move: a quiet left navigation beside a dense table with right-aligned figures. Nothing of its palette or type.
- **Reopens:**
  - the 960 px single column with no sidebar (design.md, Layout);
  - mono only (design.md, Typography);
  - the burnt-ochre accent (design.md, Color; today's ochre now sits between satchel's clay `#9e4502` and lantern's amber `#9c5300`).

## 5. Questions for the owner (ask sticky)

1. Approve one direction. B leaves part of the retro rules: a sans for words, and a left rail on desktop with a bottom bar on phone. Is leaving retro on the table, or does A's all-mono console stay the frame?
2. The accent: keep burnt ochre (A; today's, but satchel and lantern now hold the neighbouring hues), or move to B's violet stamp ink?
3. A's table island gets today's hard offset "sticker" shadow, against design.md's "no shadows on standard elements". Yes or no?

## 6. Registry lines

| ro-housing (A) | The console, re-ruled | Source Code Pro (wordmark, uppercase 700) | Source Code Pro | burnt ochre (today's), on the current tab only; ink is the action | 48 px header bar; underline tabs on the ground; one ink-framed table island with the toolbar as its head band and a hard offset shadow; phone: tabs on top, rows as list items in the island |
| ro-housing (B) | The source rail | IBM Plex Mono (wordmark, figures) | IBM Plex Sans | violet stamp ink (hue ~278); ink is the action | 56 px header bar; a 272 px raised rail of places plus the ten sites with their last run as the filter; a head island with sort and Refresh over the table island; phone: bottom bar of three places, a site sheet, list rows |
