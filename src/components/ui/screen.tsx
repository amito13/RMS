import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { space, useTheme } from '@/theme';

import { HeaderBand, type HeaderBandProps } from './header-band';

type Props = {
  children?: ReactNode;
  /** Emerald header band at the top. It handles the top safe-area inset. */
  header: HeaderBandProps;
  /** Scrollable body with keyboard handling, for forms and long screens. */
  scroll?: boolean;
  /** Centre the body vertically (loading states). */
  centered?: boolean;
  /** Tab screens sit above the tab bar, so they skip the bottom inset. */
  bottomInset?: boolean;
};

/** Header band, then the body on warm white with the standard side gutter. */
export function Screen({ children, header, scroll, centered, bottomInset = true }: Props) {
  const { colors } = useTheme();
  const body = [styles.body, centered && styles.centered];

  return (
    <SafeAreaView
      edges={bottomInset ? ['bottom'] : []}
      style={[styles.flex, { backgroundColor: colors.paper }]}>
      {scroll ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.grow} keyboardShouldPersistTaps="handled">
            <HeaderBand {...header} />
            <View style={[body, styles.grow]}>{children}</View>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <>
          <HeaderBand {...header} />
          <View style={[styles.flex, body]}>{children}</View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grow: { flexGrow: 1 },
  body: { paddingHorizontal: space.lg, paddingVertical: space.xl },
  centered: { justifyContent: 'center' },
});
