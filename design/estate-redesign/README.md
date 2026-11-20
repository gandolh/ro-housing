# The redesign: "The console, re-ruled"

This folder is the design record of ro-housing's redesign. The estate redesign board, where it was drawn and approved, is a private canvas; this is a copy of the app's page on it plus the build behind that page. The owner approved it on 2026-11-13, and [brief 25](../../corpus/briefs/done/25-a-redesign-with-hallmark-on-the-estate-board.md) built it. The code is now the source of truth: where the app and these files differ, the app wins, and later work may have moved a screen on. Read this folder to see what was decided and why before reshaping a screen.

## The owner's decisions

The owner approved the whole board on 2026-11-13, with every question standing at what the board proposed unless they reopened it. The questions this app's page asked:

- **Ask:** 1. Reopened: Listings' toolbar and table become one island, and the hard offset sticker shadow (today only on popups) goes on that island in light, against design.md's "no shadows on standard elements". Yes or no? 2. Keep burnt ochre (a little darker, `#a35100`) as the accent, now that satchel and lantern hold neighbouring hues, or move to violet? And keep all-mono, or set listing titles in a proportional face with mono for figures (both judges suggested it)? 3. Approve The console, re-ruled as ro-housing's direction?
- **Open question:** New or unseen rows get an ochre dot and the word `new` (ruling 5). The app has no seen flag, so the board marks rows first seen two days ago or less (rows 4 and 10); a rule is needed in the app.
- **Open question:** 10 of 11 demo rows show as stale (dimmed) for an untraced reason; row 2 is the only fresh one. The board draws it as it is; worth a look in the app.
- **Open question:** Hide the URL field on unchecked sources on a phone? It would fit 7 rows at 390 like today, but changes behaviour (the field is how you paste a new URL). Left as is; owner's call.
- **Open question:** A saved mark on a listing needs a URL join the app doesn't have (saved is keyed by URL with no link to listings, decisions.md); Save opens a draft today. The filled Saved specimen on this sheet shows the look only. Owner's call whether the code brief adds the join.

Where the files below disagree, the later layer wins: the owner's decisions, then the controller's rulings, then the judges' rulings, then the directions file.

## What is here

| Path | What it holds |
|---|---|
| `directions/ro-housing.md` | The director's brief: both directions (the winner is the one built), the shared fixture and the screens to draw. |
| `judge/ro-housing/RESULT.md` | The blind judging against today and the rulings that came with the win. |
| `critiques/ro-housing-controller.md`, `critiques/ro-housing.md` | The design critic's review against today, and the controller's rulings over it. |
| `manifests/ro-housing.tokens.css`, `manifests/ro-housing.tokens-map.md` | The token hand-off in the app's own names, and the renamed, new and unused tokens. |
| `manifests/ro-housing.board-notes.md` | What the board said beside the screens: the asks, decisions, reopened rules, open questions, the contrast table and the runner-up. |
| `work/ro-housing/twins/*.html` | Each drawn screen as static HTML, light and dark: open one in a browser. |
| `work/ro-housing/shots/` | The twins rendered at 1280 and 390, light and dark, WebP. `direction.webp` is the board's direction sheet. |
| `shots/ro-housing/` | Today's screens as the board showed them before the redesign. |

People's names and data in the pictures come from seeded demo accounts or are invented.

## Not here

The sketches and the judges' images, the runner-up's build (its notes are in the board's notes), the build's scripts, and the screenshots taken while it was built. They stay in the estate build folder.
