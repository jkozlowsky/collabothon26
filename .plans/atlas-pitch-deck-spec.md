# Atlas pitch deck: journey on a globe

**Status:** spec v1, from an interview on 2026-11-21. Source story: [`presentation/story-plan.md`](../presentation/story-plan.md).
**Builds on:** the globe prototype (online copy: https://claude.ai/artifact/WJBypT1tcPTYQLiKkCYbU5). Its engine (d3 orthographic globe, fixed pin spot, callout to the left, offline build script) is reused; this spec says what changes.

## 1. Goal

A 5-minute pitch for the Commerzbank challenge that tells **one user's story, Alex**, as a journey across the Atlas globe. Each stop is one part of the product, shown with a screen recording from the app. English on screen and in the notes.

Names used in the deck:

| Thing | Name in the deck |
|---|---|
| The learning module | **Atlas** |
| The AI that profiles the user | **Jev** |
| 1v1 knowledge games | **Duels**, played in **the Arena** (Rome) |
| The bank | "Commerzbank" as plain text only. No logo, in either version. |

"Finance Quest" does not appear in the deck. "Quiz House" does not appear either (app UI says Duel / Arena).

## 2. Format and delivery

- **Same engine as the prototype:** full-screen HTML page, slide copy on the left, globe on the right with more than half of it off screen, the pin always lands on the same spot near the top, the callout opens to the left of the pin.
- **Two outputs, same content:**
  - online artifact (private link, shareable from claude.ai);
  - offline build. Because of the clips it is a **folder**: `atlas-pitch.html` + `clips/`, zipped for sending. Clips are not base64-embedded (a single file would get too big).
- **Stops:** 7, with click steps inside some of them (decided: "4 big stops + click steps, add stops if needed").
- **Click steps:** reveal on the left and can swap the phone clip. The globe does not move inside a stop.
- **Two stops in a row in the same city** (Frankfurt 2 → 3): the globe does not rotate. The pin bounces again and the callout changes.
- **Controls:** arrows / space / clicker. A click step counts as one "next". Hash `#stop-N` deep links.
- **Speaker notes and target seconds** live in the source per stop. The presenter view was not requested; notes are for preparation (printable list in the README or a hidden panel, see §7).

## 3. The journey

Timing totals 4:55, including about 2 s per globe flight.

| # | Pin (lat, lng) | Callout title (journey log) | Left side | Click steps | Phone slot | Target |
|---|---|---|---|---|---|---|
| 1 | **Whole globe**, no pin (zoomed out, slow drift) | "The problem" | "People don't lack information. They lack the confidence to act." + one line on self-directed investors of every generation | none | none | 0:25 |
| 2 | Frankfurt (50.11, 8.68) | "Frankfurt: meet Alex" | Alex card: 29, Frankfurt, €2,150 net, ~€880 left each month, €4,280 current account, €12,500 savings, €100/month ETF for 18 months. Goal: a flat with his partner in 2–3 years, but the savings have no clear purpose. Then: he opens **Atlas** from the Learn tab of his bank app | a) Alex · b) Atlas appears | `01-bank-to-learn` | 0:35 |
| 3 | Frankfurt (same spot, no rotation) | "Boarding Atlas" | Two columns. **What Jev reads from the bank** (with consent): saves regularly, has a safety net, invests small amounts. **What Atlas asks**: life stage, goal (flat in 2–3 years), how he manages money today. Then the quick check: real-interest question wrong, confidence 2/5 | a) consent + data split · b) what Atlas asks · c) quick check result | `02-onboarding` → `03-consent-quick-check` → `04-summary` (one per click step) | 0:50 |
| 4 | Berlin (52.52, 13.40) | "Berlin: why safe money shrinks" | Atlas suggests the **Saving** area, starting from the basics. Lesson 1 "Safe money that shrinks" in 4 beats: **Explain** · **Play with it** (slider, predict) · **Check** (quiz) · **Your numbers** (his €12,500 at 2.25% vs inflation). Then the Berlin path: 5 lessons, done within two weeks | a) recommendation · b) the 4 beats · c) the 5-lesson path | `05-globe` → `06-lesson` → `06-lesson` held on its end frame (XP, concepts learned) | 1:15 |
| 5 | Frankfurt | "Back home: Alex decides" | Summary: what he learned + his goal. Atlas lays out the trade-offs with his numbers; **Alex chooses** and keeps €7,500 as a six-month safety net (his costs are about €1,270/month) and puts €5,000 into a 24-month fixed-term deposit at **[x.x]% p.a.**. "Go to your bank" opens the bank's own deposit screen; the deposit shows in his account | a) summary + options · b) Alex's choice · c) the deposit in his bank | `08-deposit` (**to be recorded by the team**, empty labelled slot until then) | 0:55 |
| 6 | Rome (41.89, 12.49) | "Rome: the Arena" | Duels revise what he learned. Ranked by knowledge (Elo), never by money. After each match a review explains his mistakes; questions come from the Atlas stories he played. Modes: vs another player (ranked) · solo | a) duel · b) review of mistakes | `07-duel` | 0:35 |
| 7 | Tokyo (35.68, 139.69) | "Tokyo: next stop" | Next area: **Long-term investing** (the app's Tokyo story, "Spreading your investments"). Thank you · questions | none | none | 0:20 |

Order follows the slide plan (deposit before duels), as decided in the interview. The Berlin → Frankfurt → Rome → Tokyo route draws as a trail on the globe.

## 4. Speaker notes (draft, from the story text)

Cut to fit the target times. Spoken at about 140 words per minute.

1. **The problem.** "Commerzbank asked us how to make financial learning something people seek out and act on. Our answer starts from one idea: people don't lack information, they lack the confidence to act. Let us show you through one customer."
2. **Meet Alex.** "This is Alex. He's 29 and lives in Frankfurt. He earns 2,150 euros net and has about 880 left each month. 12,500 sits in savings, and he puts 100 euros a month into an ETF, without really knowing why. He and his partner want a flat in two or three years, but his savings have no plan. Alex opens his Commerzbank app every day. Today he taps Learn, and Atlas opens."
3. **Boarding Atlas.** "Alex agrees that Atlas can tailor learning to his bank data. Jev, our AI, already sees that he saves regularly, has a safety net and invests small amounts. So Atlas only asks what the data can't tell: his stage of life, his goal and how he handles money. A short check shows a gap: he gets the real-interest question wrong and rates his confidence two out of five."
4. **Berlin.** "Atlas suggests the Saving area, starting from the basics. His first lesson: why safe money shrinks. A short explanation, then he plays with it on a slider and predicts the result, a quick quiz, and finally his own numbers: his 12,500 at 2.25 percent against inflation. Five short lessons like this, and within two weeks he has finished the whole area."
5. **Alex decides.** "The summary recaps what he learned and reminds him of the flat. Atlas doesn't tell him what to buy. It shows the trade-offs with his numbers. Alex decides himself: 7,500 stays as a six-month safety net, 5,000 goes into a 24-month fixed-term deposit. One tap takes him to his bank, and the deposit is there."
6. **The Arena.** "To keep the knowledge fresh, Alex plays duels in the Arena. Ranked by what you know, never by money. After each match he sees why he got a question wrong, from the stories he has played."
7. **Tokyo.** "Alex made an informed decision, and his money now matches his goal. His next stop: long-term investing, in Tokyo. Thank you."

## 5. Rules for the content

- **Educate, never advise.** Atlas explains and shows consequences. The deck never says Atlas recommends the deposit. Wording on stop 5: "Atlas shows the trade-offs; Alex chooses."
- **No bank business-case slide.** The story's "the bank gets a two-year deposit" line is left out by decision. The pitch stays user-centred.
- **Only numbers we can source:**
  - Alex's figures come from the story and the mock bank seed (`front/src/lib/bank/seed.ts`: savings €12,500 at 2.25%, current account €4,280.52).
  - The deposit rate is **not** in the app (the seed has no deposit product), so it stays the placeholder `[x.x]% p.a.` until the team picks it.
- **No logo.** Commerzbank is named in text only.

## 6. Media slots

- **Frame and format:** a portrait phone frame (rounded, dark bezel) on the left column's right side, about 9:19.5. The clips come from `make record` (front/recordings/out/): `01-bank-to-learn` … `07-duel`. They are MP4 (H.264) when ffmpeg with libx264 is installed, otherwise WebM.
- **Playback:** a clip starts when the pin lands, or on its click step. It plays once, muted, then holds its last frame. A click on the phone replays it. Before a clip exists, the frame shows its file name (e.g. `08-deposit`) and one line describing what it should show.
- **Poster:** each clip gets a poster frame (its first frame), so thumbnails and a paused state are never black.
- **Size limits:** for the online artifact each clip must be ≤ 15 MB (upload limit). Re-encode if needed (720p, CRF ~28).

## 7. Engine changes against the prototype

1. **Stop types:** `overview` (zoomed out to the whole globe, no pin, slow drift; used by stop 1) and `city` (the current behaviour).
2. **Same-city stops:** when consecutive stops share coordinates, skip the flight and only replay the pin drop and callout.
3. **Click steps:** a per-stop list of fragments on the left. Each one may set a clip. "Next" walks the fragments first, then flies; "previous" walks back.
4. **Phone slot component:** video, poster and placeholder state, play-once-hold-last-frame, replay on click.
5. **Stop data in one place** (array or JSON in the page): city, lat/lng, colour, callout title, fragments, clip names, target seconds, notes. A new stop is a data edit only.
6. **Pin colours follow the app's story colours:** Berlin teal, Tokyo rose. Frankfurt uses the accent yellow (the "current" pin in the Design Kit). Rome needs a new colour; propose slate-blue, not used by stories.
7. **Notes:** stored per stop. A key (`N`) toggles a notes panel at the bottom with the target time, for rehearsal. A separate presenter window was not requested.
8. **Offline build:** extend `make_offline.py` to copy `clips/` next to the HTML and rewrite clip paths. Libraries, the land map and the font stay embedded.

## 8. Design

- **Look:** the prototype's look, i.e. the Figma Design Kit tokens: petrol stage, yellow accent, Inter, white callout like the app's Pin Callout, the app's globe colours.
- **Layout:**
  - Left column ≤ 52% of the width, phone frame inside it.
  - Two-column content (stop 3) goes to a compact card grid, not more text.
  - The Alex card on stop 2 gets an initials avatar ("AK").
  - The figures sit in a small label/value list with tabular numbers.

## 9. Open items

- [ ] **Deposit rate** for stop 5: pick a figure or keep `[x.x]% p.a.`.
- [ ] **Record `08-deposit`** (summary → "Go to your bank" → deposit in the account). The deposit flow may not exist in the app yet.
- [ ] **Run `make record`** on the final build and drop the clips into `clips/`.
- [ ] **Duel modes:** confirm the wording. The code on main has `HUMAN` and `SOLO` only (the bot mode is gone); the deck says "vs another player (ranked) · solo".
- [ ] **Duel review:** confirm that mistakes link back to the right story. The deck only claims "the review explains why".
- [ ] **How it's built:** not in the deck for now (team undecided). Jev is mentioned on stop 3 only.

## 10. Acceptance

- 7 stops, the click steps above, running on a laptop at 1920×1080 and 1366×768 with no overlap between the left column, the phone frame and the callout.
- **Pin placement:** every flight ends with the pin on the same spot. Stops 2 → 3 do not rotate. Stop 1 shows the whole globe.
- **Clips:** each plays once on arrival or on its click and holds its last frame. Missing clips show a labelled placeholder.
- **Offline:** the offline folder works with the network switched off (checked in a headless browser with the network blocked, as for the prototype).
- **Copy:**
  - no "recommend", "you should buy" or product names in the stop text;
  - deposit rate either a sourced number or the visible placeholder;
  - no Commerzbank logo anywhere.
