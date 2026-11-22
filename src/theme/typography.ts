import type { TextStyle } from 'react-native';

import { fonts } from './fonts';

/**
 * Type scale. Titles are extra bold and tight; big amounts are medium weight
 * so money reads calm and large. Amounts use tabular figures so rupees line
 * up down a column.
 */
export const typography = {
  /** Big amount headline, e.g. "₹20,500". */
  display: {
    fontFamily: fonts.number,
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  /** Screen title, e.g. "Tenants". */
  title: { fontFamily: fonts.displayBold, fontSize: 30, lineHeight: 36, letterSpacing: -0.7 },
  /** Section heading, e.g. "Rent by month". */
  heading: { fontFamily: fonts.displayBold, fontSize: 18, lineHeight: 24, letterSpacing: -0.2 },
  /** Money in a row. */
  amount: {
    fontFamily: fonts.bodySemi,
    fontSize: 17,
    lineHeight: 24,
    fontVariant: ['tabular-nums'],
  },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 22 },
  /** Field labels and button text. */
  label: { fontFamily: fonts.bodySemi, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.bodyMedium, fontSize: 12.5, lineHeight: 18 },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
