# User profile, account and streak

Agreed 2026-11-20. UI is built from existing in-app components (bank + onboarding), not from the Figma profile frames.

## Account (owned by the bank)
- First and last name come from the bank and are read-only in Finance Quest.
- Avatar: one of 6 illustrated avatars (DiceBear `notionists`, 3 male `m1–m3`, 3 female `f1–f3`), committed as SVG and rendered with `react-native-svg`. The bank sets the default when it creates the account (male/female from the salutation); the user can pick any of the 6.
- Seed: `demo-user` = Alex Krause, avatar `m1`.
- The bank Overview header shows the same avatar; tapping it opens the profile.

## Profile screen (Learn → Profile), top to bottom
1. Avatar (tap → sheet with the 6 avatars, one tap picks and saves) + full name.
2. Stat tiles: current streak (with "Longest: N days"), total XP, lessons completed.
3. Week strip Mon–Sun, today outlined, days with a lesson filled.
4. "Your goals": chips from onboarding.
5. Settings: "Edit answers" (onboarding, prefilled, no intro) and "Restart onboarding" (demo: also resets progress to the seed).

No confidence ratings, levels or ranks.

## Streak and XP
- A day counts when the user completes at least 1 lesson, by the user's local date (the app sends it).
- At risk (lesson yesterday, none yet today): show the streak N with a grey flame and "Do a lesson today to keep your streak" + button to the next lesson.
- Missed a day: streak drops to 0; the longest streak stays. No streak freeze.
- Repeating a lesson counts for the streak; XP only for the first completion. "Lessons completed" counts distinct lessons.
- The bank's Finance Quest card shows the real streak.

## Demo
- Seed relative to today: streak of 4 days ending yesterday, longest 12, lessons 1 and 2 done.
- Script: do lesson 3 → profile → streak animates 4 → 5.
- "Restart onboarding" restores this state.

## API
| Method | Path | |
|---|---|---|
| GET | `/api/users/{id}/account` | `{userId, firstName, lastName, avatar}`, 404 if the bank has no such customer |
| PATCH | `/api/users/{id}/account` | `{avatar}` |
| POST | `/api/users/{id}/completions` | `{lessonId, completedOn}` → stats |
| GET | `/api/users/{id}/stats?today=YYYY-MM-DD` | `{currentStreak, longestStreak, doneToday, week[7], totalXp, lessonsCompleted}` |
| POST | `/api/users/{id}/progress/reset?today=YYYY-MM-DD` | demo: back to the seed |
