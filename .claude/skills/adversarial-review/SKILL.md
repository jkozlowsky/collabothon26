---
name: adversarial-review
description: Adversarial review of a spec, plan, diff, branch or file through independent lenses (adversarial critique, edge-case hunter, verification gaps), each run by a fresh subagent that sees only the content. Use when the user asks for an adversarial review, a BMAD-style review, or to tear apart / stress-test a spec or a change before it is built or merged.
---

# Adversarial review

Ported from BMAD-METHOD `skills/core-tools/bmad-review` (MIT, see `LICENSE`, commit `e435a22`). The lens files in `references/` are verbatim; this file replaces BMAD's `_bmad/customize.toml` resolution with fixed defaults.

Report what is real. The adversarial lens must reach at least ten concrete findings; the other lenses may legitimately return `[]`.

## Lenses

| code | file | runs on |
|---|---|---|
| `adversarial` | `references/lens-adversarial.md` | anything |
| `edge-case-hunter` | `references/lens-edge-case-hunter.md` | code, diffs, and specs / plans / tickets that define behavior |
| `verification-gap` | `references/lens-verification-gap.md` | code and diffs inside this repo |

The user naming lenses runs exactly those. Otherwise run every lens whose "runs on" covers the content.

## Steps

1. **Stage the content as one file.** A branch is its diff against the merge base with `main`; uncommitted work includes untracked files. Write diffs to a uniquely named file in the scratchpad (or system temp) directory. A spec or file is reviewed at its own path. Stage the change's narrative (commit messages, PR body, the author's summary) to a separate *claims* file. Done when every lens input is an absolute path.
2. **Announce in one line:** the content class (code or docs) and the lenses about to run.
3. **Run every lens in parallel**, one fresh subagent each, all launched before reading any result. Each prompt carries: the absolute lens file path, the absolute content path, any areas the user asked to weigh (`also_consider`), the claims path for `edge-case-hunter` only (marked "do not read before Step 4"), and this constraint verbatim: "Return ONLY your findings — no other output. Do not invoke any skill, and do not spawn subagents of your own — you are the reviewer. Return your findings as text in your final message." Give them the content, never your own conclusions about it.
4. **Assemble** one markdown report grouped by lens. Each finding renders `location`, `trigger_condition`, `guard_snippet`, `potential_consequence` plus any lens extras. Keep overlap between lenses and note it: two lenses hitting the same spot is signal. A lens with nothing renders one line. No severity, priority or ranking. Done when every lens's findings are in the report.
5. **Hand the findings to the user** and stop. Applying fixes is a separate request.
