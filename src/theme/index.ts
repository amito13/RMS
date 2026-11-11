import { useColorScheme } from 'react-native';

import { palettes, type ColorScheme } from './tokens';

export { fonts, useAppFonts } from './fonts';
export { radius, space, touchTarget, type Palette } from './tokens';
export { typography, type TypographyVariant } from './typography';

/** Current colour palette, following the phone's light/dark setting. */
export function useTheme() {
  const scheme: ColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { scheme, colors: palettes[scheme] };
}
