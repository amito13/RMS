# RMS design: the rent register

The look of RMS comes from two things every Indian landlord knows: the *bahi-khata*, a red cloth-bound ledger with ruled columns, and the violet rubber stamp used to mark a payment as received. Money is laid out like a well-kept register, and rent status is shown as an ink stamp.

Code: tokens in `src/theme/`, shared components in `src/components/ui/`.

## Colour

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `paper` | `#F5F6F2` | `#121A24` | Screen background. Cool grey-white, never cream. |
| `surface` | `#FCFDFA` | `#1A2430` | Inputs, bottom sheets |
| `ink` | `#1B2430` | `#E9ECE6` | Main text (fountain-pen blue-black) |
| `inkMuted` | `#566170` | `#A3ACB8` | Secondary text |
| `inkFaint` | `#8A929D` | `#6F7A88` | Placeholders, version text |
| `rule` | `#D9DDD6` | `#2A3542` | Hairlines between rows, input borders |
| `khata` | `#9B1C31` | `#E0566B` | Brand, primary buttons, overdue, errors |
| `violet` | `#5B3E96` | `#A98BE0` | Paid / received stamp |
| `haldi` | `#8F5E12` | `#E3A94A` | Due today, partly paid stamp |
| `blue` | `#2F5D8A` | `#7FA8D6` | Links, focus ring, ruled ledger lines |

Status colours always come with words ("Paid", "3 days late"), so colour is never the only signal.

## Type

- **Anek Latin** (`displayBold`, `displaySemi`): amounts and headlines.
- **Mukta** (`body` … `bodyBold`): everything else.
- Both include ₹ and have Devanagari versions, for when Hindi is added.
- Each weight is its own font family. Never set `fontWeight` on these.

| Variant | Font | Size / line |
|---------|------|-------------|
| `display` | Anek 700 | 40 / 44 |
| `title` | Anek 700 | 28 / 32 |
| `heading` | Anek 600 | 20 / 26 |
| `amount` | Anek 600, tabular figures | 20 / 26 |
| `body` | Mukta 400 | 16 / 24 |
| `bodyStrong` | Mukta 600 | 16 / 24 |
| `label` | Mukta 600 | 15 / 20 |
| `caption` | Mukta 400 | 13 / 18 |

## Layout

- Text left-aligned, amounts right-aligned so rupees line up.
- 16dp side gutter; 4-point spacing scale (`space`).
- Corners follow hierarchy: ledger rows 0, buttons and fields 6, bottom sheets 20.
- Touch targets at least 48dp. Main actions sit at the bottom, in thumb reach.
- Lists are rows on paper separated by hairlines, not stacks of identical cards.
- Screen headlines are plain sentences with the real number ("Collect ₹54,000 from 7 tenants today"), not stat cards.

## Principles

1. **Money is the loudest thing on every screen.** Indian grouping (₹1,00,000) via `formatINR`.
2. **Status is an ink stamp, not a pill.** `Stamp` component, double-ruled outline. Only the stamp in a tenant's header is tilted.
3. **Ruled lines only where there's a ledger.** Payment history gets columns; other screens don't.
4. **The landlord's words.** "Collect", "Received", "Leaving on 30 Nov". Sentence case, no all-caps labels, no "→" on buttons.
5. **Errors say what happened and what to do**, shown inline under the form, not in pop-up alerts.
6. **Motion only in answer to a tap**: a sheet opening, a payment being recorded. No entrance animations.

## Avoided on purpose

Cream background with a serif display and terracotta accent; green "paid" pills; identical rounded cards with soft shadows; all-caps eyebrow labels; middle-dot meta strings.
