import {
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import { useFonts } from 'expo-font';

/**
 * Manrope everywhere: extra bold for titles, medium for big amounts (light,
 * calm numbers), semibold/bold for body and labels. It includes the ₹ sign.
 *
 * Never combine these with `fontWeight`: each weight is its own family.
 */
export const fonts = {
  displayBold: 'Manrope_800ExtraBold',
  displaySemi: 'Manrope_700Bold',
  number: 'Manrope_500Medium',
  body: 'Manrope_500Medium',
  bodyMedium: 'Manrope_600SemiBold',
  bodySemi: 'Manrope_700Bold',
  bodyBold: 'Manrope_800ExtraBold',
} as const;

export function useAppFonts() {
  return useFonts({
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
}
