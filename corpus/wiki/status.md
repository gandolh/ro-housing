---
summary: One line per brief and where it stands; all ten briefs from the 2026-10-20 sweep were built on 2026-10-27; brief 11 (research Firecrawl and Ollama) is open, paused twice on 2026-10-28 with a provisional recommendation and two models left to score; brief 12 (a Host check against DNS rebinding, the owner's call of 2026-10-28) was built on 2026-10-28.
updated: 2026-10-28
---

# Status: 2026-10-28

Briefs 01-10 are every Now and Next item of the 2026-10-20 improvement sweep. 01-06 are Now:
the API answers any website, three price parsers store wrong numbers, delisted flats look live,
and switching tabs throws work away. The sweep's watch list is not briefed. All ten were built
on 2026-10-27, one commit for the code and one for the record each; nothing is pushed.

- [01](../briefs/done/01-close-api-to-other-sites.md) (Now, done 2026-10-27): Close the API to other websites
- [02](../briefs/done/02-adapter-price-token.md) (Now, done 2026-10-27): Adapters: read the price, not the numbers before it
- [03](../briefs/done/03-not-the-old-price.md) (Now, done 2026-10-27): Don't take the crossed-out old price
- [04](../briefs/done/04-form-price-decimals.md) (Now, done 2026-10-27): The form's price field: decimals are not thousands
- [05](../briefs/done/05-staleness-from-source-runs.md) (Now, done 2026-10-27): Staleness from each source's last run, and a failed Refresh says so
- [06](../briefs/done/06-keep-tabs-mounted.md) (Now, done 2026-10-27): Keep the pages alive when switching tabs
- [07](../briefs/done/07-api-down-shows-error.md) (Next, done 2026-10-27): Show an error when the API is down, not an empty shortlist
- [08](../briefs/done/08-refetch-keeps-draft-edits.md) (Next, done 2026-10-27): A second "Fetch details" must not wipe the open draft
- [09](../briefs/done/09-playwright-recovers.md) (Next, done 2026-10-27): Recover from a failed or crashed Chromium without a restart
- [10](../briefs/done/10-vat-excluded-prices.md) (Next, done 2026-10-27): Mark "+ TVA" prices so €/m² compares like with like

Filed after the sweep:

- [11](../briefs/todo/11-research-firecrawl-and-ollama.md) (todo, filed 2026-10-27, not grilled; paused twice on 2026-10-28; [docs/research-firecrawl-ollama.md](../../docs/research-firecrawl-ollama.md) has the Firecrawl run, the search check, scores for the extractor and `qwen2.5:3b`, and a provisional recommendation: no Firecrawl, two extractor rules and an "OK, 0" warning first, a model only as an opt-in button; `llama3.2:3b` and `qwen2.5:7b` not scored yet): Research whether self-hosted Firecrawl with Ollama, or Ollama alone, makes finding and reading listings easier
- [12](../briefs/done/12-host-check-against-dns-rebinding.md) (done 2026-10-28; the owner chose it): the API checks the `Host` header, so DNS rebinding straight at port 3000 is refused. Only the hostnames `localhost`, `127.0.0.1` and `[::1]` (plus `HOST` if set) are answered; anything else gets 403. Closes the gap brief 01 left open.
