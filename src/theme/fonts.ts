import { AnekLatin_600SemiBold, AnekLatin_700Bold } from '@expo-google-fonts/anek-latin';
import {
  Mukta_400Regular,
  Mukta_500Medium,
  Mukta_600SemiBold,
  Mukta_700Bold,
} from '@expo-google-fonts/mukta';
import { useFonts } from 'expo-font';

/**
 * Anek Latin for amounts and headlines, Mukta for everything else.
 * Both come from an Indian foundry, include the ₹ sign, and have Devanagari
 * versions for when Hindi is added.
 *
 * Never combine these with `fontWeight`: each weight is its own family.
 */
export const fonts = {
  displayBold: 'AnekLatin_700Bold',
  displaySemi: 'AnekLatin_600SemiBold',
  body: 'Mukta_400Regular',
  bodyMedium: 'Mukta_500Medium',
  bodySemi: 'Mukta_600SemiBold',
  bodyBold: 'Mukta_700Bold',
} as const;

export function useAppFonts() {
  return useFonts({
    AnekLatin_600SemiBold,
    AnekLatin_700Bold,
    Mukta_400Regular,
    Mukta_500Medium,
    Mukta_600SemiBold,
    Mukta_700Bold,
  });
}
