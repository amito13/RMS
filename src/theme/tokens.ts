/**
 * RMS design tokens: paper finish.
 *
 * Warm grey paper with a fine grain, white cards with soft shadows, black pill
 * buttons and pastel status pills. Illustrated sky-and-house scenes head the
 * main screens. See docs/design.md.
 */

export type ColorScheme = 'light' | 'dark';

export type Palette = {
  /** Screen background: warm grey paper. */
  paper: string;
  /** Cards, sheets and the tab bar. */
  surface: string;
  /** Inside text inputs. */
  field: string;
  /** Muted fills inside cards (stat tiles, segmented controls). */
  wash: string;
  /** Main text. */
  ink: string;
  /** Secondary text. */
  inkMuted: string;
  /** Placeholders and disabled text. */
  inkFaint: string;
  /** Borders around inputs and outline buttons. */
  rule: string;
  /** Dividers between rows inside a card. */
  hairline: string;

  /** Primary buttons, active tab, selected chips, focus ring. */
  brand: string;
  /** Text and icons on top of a brand-filled button. */
  onBrand: string;

  /** Kept for screens that still reference the old header band. */
  header: string;
  onHeader: string;
  onHeaderMuted: string;
  /** Warm accent: progress, highlights. */
  gold: string;

  /** Status text colours (also used for errors: overdue). */
  paid: string;
  due: string;
  overdue: string;
  /** Status pill fills. */
  paidSoft: string;
  dueSoft: string;
  overdueSoft: string;
  neutralSoft: string;
  /** Info tint (unit badges, map pins). */
  info: string;
  infoSoft: string;

  /** Sky gradient for illustrated headers. */
  skyTop: string;
  skyBottom: string;
};

const light: Palette = {
  paper: '#ECEBE7',
  surface: '#FBFAF7',
  field: '#FFFFFF',
  wash: '#ECEBE7',
  ink: '#161616',
  inkMuted: '#6B6A66',
  inkFaint: '#8A8882',
  rule: '#D9D6CF',
  hairline: '#ECEAE4',

  brand: '#161616',
  onBrand: '#FFFFFF',

  header: '#ECEBE7',
  onHeader: '#161616',
  onHeaderMuted: '#6B6A66',
  gold: '#F2B98A',

  paid: '#2D6A22',
  due: '#8A470C',
  overdue: '#A3281C',
  paidSoft: '#DCEFD3',
  dueSoft: '#FBE2C6',
  overdueSoft: '#F8D5D0',
  neutralSoft: '#E4E2DC',
  info: '#2F4F78',
  infoSoft: '#E3EEF9',

  skyTop: '#A9CBF2',
  skyBottom: '#DCEAF8',
};

export const palettes: Record<ColorScheme, Palette> = {
  light,
  // The paper finish is a light design; dark mode uses the same palette until
  // a dark version is designed.
  dark: light,
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

export const radius = {
  none: 0,
  /** Inputs and small tiles. */
  control: 16,
  /** Cards. */
  card: 24,
  /** Hero cards and sheets. */
  sheet: 30,
  pill: 999,
} as const;

/** Minimum touch target, in dp. */
export const touchTarget = 48;

/** Soft paper shadow for cards. */
export const cardShadow = '0px 1px 2px rgba(22, 22, 22, 0.05), 0px 12px 28px -14px rgba(22, 22, 22, 0.14)';
/** Lifted shadow for floating things (tab bar, round buttons). */
export const floatShadow = '0px 14px 34px -12px rgba(22, 22, 22, 0.30)';
export const buttonShadow = '0px 1px 2px rgba(22, 22, 22, 0.06), 0px 6px 16px -8px rgba(22, 22, 22, 0.18)';
