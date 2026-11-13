# RMS design: emerald and gold

Emerald is the colour of money and trust; gold marks what's due and lights up the RMS wordmark. Every screen opens with an emerald header band, the body sits on warm white, and rent status is shown as a rubber-stamp impression: a double-ruled outline, like the stamp Indian offices press on a receipt.

Code: tokens in `src/theme/`, shared components in `src/components/ui/`.

## Colour

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `paper` | `#FAFAF7` | `#0E1613` | Screen body (warm white) |
| `surface` | `#FFFFFF` | `#16211C` | Inputs, sheets, tab bar |
| `ink` | `#14201B` | `#E6EEE9` | Main text |
| `inkMuted` | `#55625B` | `#9DB0A6` | Secondary text |
| `inkFaint` | `#8B958F` | `#66776E` | Placeholders, version text |
| `rule` | `#E2E5DE` | `#24322B` | Hairlines between rows, input borders |
| `brand` | `#065F46` | `#34C79A` | Primary buttons, links, active tab, focus ring |
| `onBrand` | `#FFFFFF` | `#052B1F` | Text on brand buttons |
| `header` | `#065F46` | `#0A3D30` | Header band |
| `onHeader` | `#FFFFFF` | `#F2F7F4` | Title on the band |
| `onHeaderMuted` | `#A9D8C6` | `#8FC9B3` | Date, subtitle on the band |
| `gold` | `#E9C46A` | `#E9C46A` | RMS wordmark on the band |
| `paid` | `#047857` | `#34D399` | Paid stamp |
| `due` | `#8F5E12` | `#E7B54F` | Due today / partly paid stamp |
| `overdue` | `#B91C1C` | `#F87171` | Overdue stamp, error messages |

`paid` and `due` are text-safe shades of the chosen swatches (`#059669`, `#B7791F`), so stamp labels meet 4.5:1 contrast on warm white. Status colours always come with words ("Paid", "3 days late"), so colour is never the only signal.

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

- Every screen uses `Screen` with a `header` (`HeaderBand`): optional overline (date, or the gold RMS wordmark on auth screens), title, optional subtitle. The band runs up under the status bar, so the status bar text is always light.
- Text left-aligned, amounts right-aligned so rupees line up.
- 16dp side gutter; 4-point spacing scale (`space`).
- Corners follow hierarchy: ledger rows 0, buttons and fields 6, bottom sheets 20.
- Touch targets at least 48dp. Main actions sit at the bottom, in thumb reach.
- Lists are rows on warm white separated by hairlines, not stacks of identical cards.
- Screen headlines are plain sentences with the real number ("Collect ₹54,000 from 7 tenants today"), not stat cards.

## Principles

1. **Money is the loudest thing on every screen.** Indian grouping (₹1,00,000) via `formatINR`.
2. **Status is a stamp.** `Stamp` component: double-ruled outline in paid green, due gold or overdue red. Only the stamp in a tenant's header is tilted.
3. **Colour in two places: the header band and the stamps.** The body stays calm so status colours stand out.
4. **The landlord's words.** "Collect", "Received", "Leaving on 30 Nov". Sentence case, no all-caps labels, no "→" on buttons.
5. **Errors say what happened and what to do**, shown inline under the form in red, not in pop-up alerts.
6. **Motion only in answer to a tap**: a sheet opening, a payment being recorded. No entrance animations.

## History

- v1 "rent register": khata red brand, grey-green paper, violet paid stamp. Dropped because it felt too plain and violet for "Paid" read as odd.
- v2 (current) "emerald and gold", chosen by the product owner on 13 Nov 2026.
