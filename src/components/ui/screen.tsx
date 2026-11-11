import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { space, useTheme } from '@/theme';

type Props = {
  children: ReactNode;
  /** Scrollable content with keyboard handling, for forms and long screens. */
  scroll?: boolean;
  /** Centre the content vertically (auth screens). */
  centered?: boolean;
  /** Tab screens sit above the tab bar, so they don't need the bottom inset. */
  edges?: Edge[];
};

/** Register-paper background with safe-area padding and the standard side gutter. */
export function Screen({ children, scroll, centered, edges = ['top', 'bottom'] }: Props) {
  const { colors } = useTheme();
  const content = [styles.content, centered && styles.centered];

  return (
    <SafeAreaView edges={edges} style={[styles.flex, { backgroundColor: colors.paper }]}>
      {scroll ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={[content, styles.grow]}
            keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <View style={[styles.flex, content]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grow: { flexGrow: 1 },
  content: { paddingHorizontal: space.lg, paddingVertical: space.xl },
  centered: { justifyContent: 'center' },
});
