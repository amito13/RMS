/**
 * RMS design tokens: emerald and gold.
 *
 * Emerald is the colour of money and trust; gold marks what's due. Each screen
 * opens with an emerald header band, the body sits on warm white, and rent
 * status is shown as a rubber-stamp impression. See docs/design.md.
 */

export type ColorScheme = 'light' | 'dark';

export type Palette = {
  /** Screen body background. */
  paper: string;
  /** Raised surfaces: inputs, bottom sheets, tab bar. */
  surface: string;
  /** Main text. */
  ink: string;
  /** Secondary text. */
  inkMuted: string;
  /** Placeholders and disabled text. */
  inkFaint: string;
  /** Hairline rules between rows and around inputs. */
  rule: string;

  /** Brand: primary buttons, links, active tab, focus ring. */
  brand: string;
  /** Text and icons on top of a brand-filled button. */
  onBrand: string;

  /** Header band at the top of every screen. */
  header: string;
  /** Title text on the header band. */
  onHeader: string;
  /** Secondary text on the header band. */
  onHeaderMuted: string;
  /** Gold accent on the header band (wordmark). */
  gold: string;

  /** Paid / received stamp ink. */
  paid: string;
  /** Due today / partly paid stamp ink. */
  due: string;
  /** Overdue stamp ink, and error messages. */
  overdue: string;
};

export const palettes: Record<ColorScheme, Palette> = {
  light: {
    paper: '#FAFAF7',
    surface: '#FFFFFF',
    ink: '#14201B',
    inkMuted: '#55625B',
    inkFaint: '#8B958F',
    rule: '#E2E5DE',

    brand: '#065F46',
    onBrand: '#FFFFFF',

    header: '#065F46',
    onHeader: '#FFFFFF',
    onHeaderMuted: '#A9D8C6',
    gold: '#E9C46A',

    // Text-safe shades of the chosen swatches (#059669, #B7791F) so stamp
    // labels stay readable on warm white (contrast ≥ 4.5:1).
    paid: '#047857',
    due: '#8F5E12',
    overdue: '#B91C1C',
  },
  dark: {
    paper: '#0E1613',
    surface: '#16211C',
    ink: '#E6EEE9',
    inkMuted: '#9DB0A6',
    inkFaint: '#66776E',
    rule: '#24322B',

    brand: '#34C79A',
    onBrand: '#052B1F',

    header: '#0A3D30',
    onHeader: '#F2F7F4',
    onHeaderMuted: '#8FC9B3',
    gold: '#E9C46A',

    paid: '#34D399',
    due: '#E7B54F',
    overdue: '#F87171',
  },
};

/** 4-point spacing scale. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/** Corners follow hierarchy: ledger rows square, controls slightly rounded, sheets well rounded. */
export const radius = {
  none: 0,
  control: 6,
  sheet: 20,
} as const;

/** Minimum touch target, in dp. */
export const touchTarget = 48;
