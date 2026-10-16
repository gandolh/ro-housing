# README images

How each image was made, so the next refresh is a re-run. Re-take an image when the screen it shows changes.

All of them come from a throwaway clone of the repo with both dev servers running and the data from [demo-seed.mjs](demo-seed.mjs): eleven listings and five saved apartments with invented titles, prices, histories and notes, set in real Timișoara neighbourhoods. The seed has no photos, so the shortlist's thumbnails are empty boxes.

| File | Shows | How to reach that state | Viewport | Taken |
|---|---|---|---|---|
| hero.webp | Listings with eleven listings and their price lines | Fresh seed, open the app | 1100×804 @2x, scaled to 1600 px wide | 2026-10-16 |
| saved.webp | The Saved tab sorted by €/m² | Saved, empty the link box, Sort: €/m², low first; cropped to the tab with a 16 px margin | 1100×900 @2x, scaled to 1600 px | 2026-10-16 |
| sources.webp | Sources, with imobiliare.ro failed | Sources; cropped to the tab with a 16 px margin | 1100×900 @2x, scaled to 1600 px | 2026-10-16 |
| draft-phone.webp | A draft with one field edited | Saved, with `/api/saved/scrape` staged as in the next section; paste `https://www.exemplu.ro/oferta/apartament-2-camere-girocului`, Fetch details, set the price to `97.000`, type the note `Asked for 97.000 on the phone. Visit on Tuesday.`; cropped to the panel with a 12 px margin | 390×1200 @3x, scaled to 780 px | 2026-10-16 |
| blocked-phone.webp | The bot-check notice and the empty form | Saved, no mock; paste `https://www.imobiliare.ro/oferta/apartament-de-vanzare-2-camere-timisoara-exemplu`, whose path is made up, and Fetch details; cropped from the panel's top to the price row | 390×1200 @3x, scaled to 780 px | 2026-10-16 |

## The staged draft

`exemplu.ro` does not exist. The draft comes from intercepting `/api/saved/scrape` in the browser and answering with this body, so no real ad, photo or agency appears:

```json
{"url":"https://www.exemplu.ro/oferta/apartament-2-camere-girocului","site":"exemplu.ro","existing":null,
 "draft":{"title":"Apartament 2 camere, Girocului, cu loc de parcare","priceEur":99500,"rooms":2,"sqm":55,
          "floor":4,"floorsTotal":10,"yearBuilt":2008,"location":"Girocului","partitioning":null,"imageUrl":null},
 "found":["title","priceEur","rooms","sqm","floor","floorsTotal","yearBuilt","location"],"via":"fetch","problem":null}
```

The bot-check image is not staged: the clone's API really asked imobiliare.ro, got its Cloudflare block and then its DataDome CAPTCHA, and the app showed what it shows. If imobiliare.ro stops blocking, that screen can no longer be taken this way. Stage it like the draft, with `"problem":{"kind":"blocked","message":"The site answered with a bot check instead of the listing."}` and an empty draft.

## Demo data

1. Clone the repo outside your working copy, then run `npm install` in `api/` and in `web/`.
2. Start both dev servers in the clone with `npm run dev` in each. The API creates the tables on its first start.
3. From any checkout, point the seed at the clone:

   ```bash
   node docs/images/demo-seed.mjs /path/to/clone
   ```

   It writes the listings and the Sources settings straight into the clone's `data/ro-housing.db`, and adds the saved apartments through `POST /api/saved` on `http://127.0.0.1:3000`, or on the address given as a second argument. It touches no listing site. Running it twice adds nothing new.

## Capture method

- Browser: `agent-browser --session rohousing-readme`. `set viewport 1100 804 2` for the hero and `1100 900 2` for the other desktop shots. Use `set viewport 390 1200 3` for the narrow ones. Stage the draft with `network route "**/api/saved/scrape" --body "<the JSON above>"` and remove it with `network unroute`. Move the pointer to a corner with `mouse move 1 1`, so no button shows its hover state.
- Crops: `eval` returns the panel's box from `getBoundingClientRect()` on `[role=tabpanel]:not([hidden]) > div` or its first child. Take a viewport screenshot and crop it with ffmpeg's `-vf "crop=W:H:X:Y"`, each value multiplied by the pixel ratio, 2 or 3.
- Stills: PNG to WebP with `ffmpeg -i in.png -vf scale=1600:-1:flags=lanczos -c:v libwebp -quality 82 out.webp`, with 780 instead of 1600 for the narrow ones.
