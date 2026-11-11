/**
 * RMS design tokens: "the rent register".
 *
 * The look borrows from the Indian bahi-khata (red cloth-bound ledger) and the
 * violet rubber stamp used to mark payments received. See docs/design.md.
 */

export type ColorScheme = 'light' | 'dark';

export type Palette = {
  /** Screen background: register paper. */
  paper: string;
  /** Raised surfaces: inputs, bottom sheets. */
  surface: string;
  /** Main text: fountain-pen blue-black. */
  ink: string;
  /** Secondary text. */
  inkMuted: string;
  /** Placeholders and disabled text. */
  inkFaint: string;
  /** Hairline rules between ledger rows and around inputs. */
  rule: string;
  /** Brand, primary actions, overdue. */
  khata: string;
  /** Text on top of khata red. */
  onKhata: string;
  /** Paid / received stamp ink. */
  violet: string;
  /** Due today / partly paid stamp ink. */
  haldi: string;
  /** Links, focus rings, ruled ledger lines. */
  blue: string;
};

export const palettes: Record<ColorScheme, Palette> = {
  light: {
    paper: '#F5F6F2',
    surface: '#FCFDFA',
    ink: '#1B2430',
    inkMuted: '#566170',
    inkFaint: '#8A929D',
    rule: '#D9DDD6',
    khata: '#9B1C31',
    onKhata: '#FFFFFF',
    violet: '#5B3E96',
    // Darker than the swatch #B7791F so stamp text stays readable on paper.
    haldi: '#8F5E12',
    blue: '#2F5D8A',
  },
  dark: {
    paper: '#121A24',
    surface: '#1A2430',
    ink: '#E9ECE6',
    inkMuted: '#A3ACB8',
    inkFaint: '#6F7A88',
    rule: '#2A3542',
    khata: '#E0566B',
    onKhata: '#1A0A0E',
    violet: '#A98BE0',
    haldi: '#E3A94A',
    blue: '#7FA8D6',
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
