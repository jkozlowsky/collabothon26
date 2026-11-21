# Atlas pitch deck

A 5-minute pitch for Atlas: Alex's journey across the Atlas globe (Frankfurt → Berlin → Frankfurt → Rome → Tokyo). The pin always lands on the same spot, its callout carries the stop title, and a phone frame plays the app recording for each stop.

- Spec: [`.plans/atlas-pitch-deck-spec.md`](../.plans/atlas-pitch-deck-spec.md)
- The team's story and slide plan it came from: [`story-plan.md`](story-plan.md)
- Online copy (private, without recordings): https://claude.ai/artifact/7gW1zgrSqg5xXe8xBQ575d

## Run

Open `atlas-pitch.html` in Chrome or Edge. It needs no network.

| Action | Keys |
|---|---|
| Next (click steps first, then the next stop) | → · space · PageDown · a clicker |
| Back | ← |
| Speaker notes, with a timer and the target time per stop | N |
| Full screen | F |

To send the deck, zip the whole `presentation/` folder: the recordings sit next to the HTML, not inside it.

## App recordings

Put them in `clips/` with the names listed in [`clips/README.txt`](clips/README.txt), as `.mp4` (H.264) or `.webm`. They are git-ignored, because they are large and can be recorded again.

- Clips 01–07 come from `make record` (output in `front/recordings/out/`).
- `08-deposit` has to be recorded by hand.
- A missing clip shows a labelled placeholder in the phone frame.

## Edit

1. Change `src/atlas-pitch.html`. Each stop is one `<section class="stop">` with its city, lat/lng, colour, callout title (`data-title`), target seconds and speaker notes (`<aside class="notes">`).
2. Mark click steps with `data-step="1"`, `"2"` and so on. Add `data-clip` to a step to swap the phone recording.
3. Rebuild the offline file:

   ```bash
   cd presentation/src && python3 make_offline.py   # writes ../atlas-pitch.html
   ```

`src/atlas-pitch.html` is also the page published online. It loads d3, topojson and Inter from CDNs and `land-110m.json` from its own folder. The offline build embeds all of them.

## Status (2026-11-21)

Done:

- All 7 stops, click steps, speaker notes and timing (4:55 planned).
- Checked offline in headless Chromium at 1920×1080 and 1366×768.

Open:

- [ ] Record clips 01–07 with `make record` and copy them into `clips/`.
- [ ] Record `08-deposit` (summary → Go to your bank → deposit opened).
- [ ] Pick the deposit rate. Stop 5 shows the placeholder `[x.x]% p.a.`, because the mock bank has no deposit product.
- [ ] Confirm the duel wording "vs another player (ranked) · solo". Main has only the `HUMAN` and `SOLO` modes.

## Licences

d3 (ISC), topojson-client (ISC), world-atlas / Natural Earth (public domain), Inter (SIL OFL 1.1).
