# Duel mode: topics to discuss

Parking lot for [`duel-mode-spec.md`](duel-mode-spec.md). Nothing here is decided.

## 1. Using the wrong-answer data (idea from the F8 owners)

Every answer and every timeout is already written to `duel_answer`, from the first match. Still open: who reads it and what for.

- A "weak areas" card on Profile or Map, built from accuracy per category and difficulty.
- F6 recommendations: "you often miss questions on fees, so try this lesson".
- Repeat missed questions in later duels (spaced repetition).
- Link a missed question to a glossary term or a lesson. This needs concept tags, which are not planned for the hackathon.

## 2. Proposals in the spec still waiting for a yes or no

- Overall Elo = average of the calibrated categories.
- A match where nobody is connected at the end is `ABANDONED`, with no Elo or XP.
- Prefer questions the player has not seen in their last 3 matches.

## 3. Content

- Who writes the 75 questions and who fact-checks them, in both languages?
- Who owns the app-wide language setting (PL/EN), and how does the duel read it?

## 4. Product

- Global profile level: the sum of category XP, the average level, or something else? Agree with the profile team.
- Contract for the mocked accounts (id format, name, avatar, friends) with the account team.
- Rematch with the same rival, and challenging a specific player: not for the hackathon.
- Badges and win streaks: not now.
- Anti-abuse (alt accounts, bot farming): out of scope; mention as roadmap in the pitch.

## Moved out of F8

- **Confidence measurement** (sure / not sure, before and after): duel mode is a learning minigame, and confidence belongs to the simulations module.
