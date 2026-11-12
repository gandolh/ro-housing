# A refresh in flight holds the shutdown

Found by brief 24's builder (2026-11-12). `POST /api/refresh` runs every source in turn and can take minutes. Since
brief 24, `close-with-grace` waits 10 s on SIGTERM; a refresh still running then makes the process exit 1 (the old
loop waited with no limit). A deploy during a refresh therefore logs a failed stop, and the refresh is cut wherever
it was.

## What to do

- Give the refresh loop an `AbortSignal` that a `preClose` hook aborts: the loop stops between sources (or aborts the
  fetch in flight), the stream or reply ends with a short "the server is restarting" line, and the close finishes.
- Same for a held Wicket fill poll (up to 25 s).
- Check on a real socket: start the built server, hold a refresh against slow stubbed sources, send SIGTERM, expect
  exit 0 within a second, read from the node PID.
