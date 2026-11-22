import { palettes, type ColorScheme } from './tokens';

export { fonts, useAppFonts } from './fonts';
export {
  buttonShadow,
  cardShadow,
  floatShadow,
  radius,
  space,
  touchTarget,
  type Palette,
} from './tokens';
export { typography, type TypographyVariant } from './typography';

/**
 * Current colour palette. The paper finish is light only for now, so this
 * ignores the phone's dark mode setting.
 */
export function useTheme() {
  const scheme: ColorScheme = 'light';
  return { scheme, colors: palettes[scheme] };
}
