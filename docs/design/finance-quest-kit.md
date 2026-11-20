# Finance Quest design kit

Extracted from the Figma file "Finance Quest — Globe Learn Screen (Copy)", key `4pnAiGtheAqfbYYdlegMRi` (frame "Design Kit", node `3:55`), on 20.11. The Figma MCP quota on our Starter plan is exhausted, so this file is the source for agents; exported PNGs of the frames live next to it in `docs/design/` when present. Commerzbank-inspired palette: petrol + yellow.

## Color tokens
| token | hex | | token | hex |
|---|---|---|---|---|
| `brand/primary` | `#002E3C` | | `text/primary` | `#0F1E24` |
| `brand/primary-pressed` | `#001F29` | | `text/muted` | `#5F6F76` |
| `brand/primary-soft` | `#E6EEF0` | | `text/on-brand` | `#FFFFFF` |
| `brand/accent` | `#FFCC00` | | `text/on-accent` | `#002E3C` |
| `brand/accent-soft` | `#FFF4CC` | | `feedback/success` | `#1E8A5E` |
| `bg/canvas` | `#F5F7F7` | | `feedback/danger` | `#D64545` |
| `bg/surface` | `#FFFFFF` | | `feedback/xp` | `#B58B00` |
| `bg/tint` | `#E3EDEF` | | `feedback/streak` | `#E8833A` |
| `border/default` | `#E1E6E8` | | `globe/ocean-light` | `#1B6F82` |
| `border/strong` | `#C9D2D6` | | `globe/ocean-deep` | `#002E3C` |
| `globe/land` | `#CFE5DD` | | `globe/land-edge` | `#9CC3B6` |
| `story/rose` | `#D9577A` | | `story/violet` | `#6E5AD6` |
| `story/orange` | `#E8833A` | | `story/teal` | `#1E9AA8` |
| `story/slate` | `#9AA5AB` | | | |

## Typography (Inter)
| style | size / line height | weight |
|---|---|---|
| Display/Large | 26/32 | Bold |
| Title/Section | 18/24 | Bold |
| Title/Card | 15/20 | Semi Bold |
| Body/Default | 13/18 | Regular |
| Label/Default | 12/16 | Medium |
| Label/Strong | 12/16 | Semi Bold |
| Label/Tab | 11/14 | Medium |
| Label/Tab Active | 11/14 | Semi Bold |
| Overline | 10/12 | Bold |

## Elevation
Low, Mid, High, Sheet, Pin (shadow values not extracted).

## Icons
24px, 2px stroke, outline style: globe, book, user, flame, bolt, check, lock, chevron, arrow, rotate, pin, trend, flower, coins, wallet, sprout, building, home, transfer, card, percent, safe, plus, dots, bell, cart, briefcase, play, scan, eye.

## Components
- **Button**: Primary, Secondary (101×32 in the kit).
- **Stat Chip**: Streak, XP (50×28).
- **Story Pin**: Default, Active (larger, 47×60), Done, Locked.
- **Story Card** (358 wide): Default, Active, Done, Locked.
- **Tab Item**: Active, Inactive (3-tab bar, 84 high).
- **Pin Callout** (148×128), **Hint Chip** (272×28), **Globe** (300×300).
- **Quick Action** (76×74), **Section Header** (350×24), **List Row** (350×64).
- **Bank Card**: Debit, Credit (300×184). **Account Summary** (350×184).
- **Learn Entry Banner** (350×95), **Portfolio Card** (350×188).

## Screens (390×844, 20px side margin)
- **Learn — Globe** (`3:496`): header (overline "Hi Alex · first-time investor", Display "Where to next?", stat chips streak + XP) → globe with orbit ring, ground shadow, city story pins and a callout → hint chip → bottom sheet "Your stories · 6 paths · 1 done" with Story Cards → 3-tab bar.
- **Bank — Home** (`11:452`): top bar (avatar initials, greeting, scan, bell) → Account Summary → 4 Quick Actions → Learn Entry Banner (the bank app's door into Finance Quest) → card carousel → Portfolio Card → list sections → 5-tab bar.

There are no onboarding or profile frames: build those screens from these tokens and components.
