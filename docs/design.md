# RMS design: paper finish

Warm grey paper with a fine grain. Content sits on white cards with soft shadows. Main actions are black pills, and rent status is a pastel pill with a dot. Illustrated sky-and-house scenes head the main screens (Today, property, sign-in, setup).

Mockups of every screen are on the design canvas "RMS Paper Redesign" (claude.ai artifact). Code: tokens in `src/theme/`, shared components in `src/components/ui/`.

## Colour

Light only for now: `useTheme()` ignores the phone's dark mode until a dark version is designed.

| Token | Value | Use |
|-------|-------|-----|
| `paper` | `#ECEBE7` | Screen background (with `PaperGrain`) |
| `surface` | `#FBFAF7` | Cards, tab bar, round buttons |
| `field` | `#FFFFFF` | Inside text fields and chips |
| `wash` | `#ECEBE7` | Stat tiles and fills inside cards |
| `ink` | `#161616` | Main text |
| `inkMuted` | `#6B6A66` | Secondary text (4.5:1 on cards) |
| `inkFaint` | `#8A8882` | Placeholders |
| `rule` | `#D9D6CF` | Input and outline-button borders |
| `hairline` | `#ECEAE4` | Dividers between rows in a card |
| `brand` | `#161616` | Primary buttons, active tab, selected chips, focus ring |
| `gold` | `#F2B98A` | Peach accent: second segment of progress bars |
| `paid` / `paidSoft` | `#2D6A22` / `#DCEFD3` | Paid pill |
| `due` / `dueSoft` | `#8A470C` / `#FBE2C6` | Due today, partly paid, vacant |
| `overdue` / `overdueSoft` | `#A3281C` / `#F8D5D0` | Overdue pill, errors |
| `neutralSoft` | `#E4E2DC` | Upcoming, waived, moved out |
| `info` / `infoSoft` | `#2F4F78` / `#E3EEF9` | Unit badges, avatars of tenants not yet due |
| `skyTop` / `skyBottom` | `#A9CBF2` / `#DCEAF8` | Sky gradient behind illustrations |

Status colours always come with words ("Paid", "3 days late"), so colour is never the only signal.

## Type

Manrope throughout (it has the ₹ sign).

| Style | Font | Size | Use |
|-------|------|------|-----|
| `display` | Medium 500 | 40 | Big amounts: "₹20,500 to collect", "Owed now" |
| `title` | ExtraBold 800 | 30 | Screen titles |
| `heading` | ExtraBold 800 | 18 | Section headings |
| `amount` | Bold 700 | 17 | Money in rows (tabular figures) |
| `body` / `bodyStrong` | Medium / Bold | 15 | Text |
| `label` | Bold 700 | 14 | Field labels, buttons |
| `caption` | SemiBold 600 | 12.5 | Secondary lines |

Big amounts are medium weight on purpose: money reads large and calm, titles carry the weight.

## Shape

- Cards: radius 24 (hero cards 30), `cardShadow`.
- Inputs: radius 16, white, 1px `rule` border; 2px ink when focused.
- Buttons, chips, pills, steppers, the tab bar: fully round.
- Progress bars: black segment, optional peach segment, hatched remainder (`hatch.svg`).

## Components

- `Screen`: paper + grain, optional `header`, `hero` (illustration above the header), `card` (wraps a form in a card), `footer`.
- `HeaderBand`: round back (or × with `close`) button, small overline, bold title, subtitle.
- `Card`, `PaperGrain` (`paper.tsx`), `Scene` (sky + `house.svg`/`street.svg`), `ProgressBar`, `Avatar` (initials tinted by status), `IconButton` (+ shared `icons`), `Stamp` (status pill).
- `PillTabBar` (`src/components/tab-bar.tsx`): floating white pill; the active tab is a black pill with its label.

## Principles

1. Money first: the amount owed is the biggest thing on Today and on a tenant.
2. One black button per screen for the main action; everything else is outlined or a link.
3. Group related things on one card; rows inside a card are split by hairlines, not boxes.
4. Status is always words plus colour.
5. Touch targets are at least 44pt.

## History

- Nov 2026: paper finish, from reference designs the owner shared (illustrated headers, white cards, black pills, pastel pills, hatched bars).
- Earlier: emerald and gold with a header band and rubber-stamp status.
