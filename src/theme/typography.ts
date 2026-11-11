import type { TextStyle } from 'react-native';

import { fonts } from './fonts';

/**
 * Type scale (ratio ~1.25). Amounts use tabular figures so rupees line up
 * down a column.
 */
export const typography = {
  /** Screen headline, e.g. "Collect ₹54,000". */
  display: { fontFamily: fonts.displayBold, fontSize: 40, lineHeight: 44, letterSpacing: -0.5 },
  /** Screen title, e.g. "Tenants". */
  title: { fontFamily: fonts.displayBold, fontSize: 28, lineHeight: 32, letterSpacing: -0.25 },
  /** Section heading, e.g. a building name. */
  heading: { fontFamily: fonts.displaySemi, fontSize: 20, lineHeight: 26 },
  /** Money in a row. */
  amount: {
    fontFamily: fonts.displaySemi,
    fontSize: 20,
    lineHeight: 26,
    fontVariant: ['tabular-nums'],
  },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: fonts.bodySemi, fontSize: 16, lineHeight: 24 },
  /** Field labels and button text. */
  label: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 20 },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
