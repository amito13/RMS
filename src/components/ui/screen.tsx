import type { ReactNode } from 'react';
import { KeyboardAvoidingView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { space, useTheme } from '@/theme';

import { HeaderBand, type HeaderBandProps } from './header-band';
import { KeyboardScrollView } from './keyboard-scroll';
import { Card, PaperGrain } from './paper';
import { Scene } from './scene';

/** Room kept under tab screens for the floating tab bar. */
export const TAB_BAR_SPACE = 112;

type Props = {
  children?: ReactNode;
  /** Header at the top. It handles the top safe-area inset. Leave out to draw your own. */
  header?: HeaderBandProps;
  /** Scrollable body with keyboard handling, for forms and long screens. */
  scroll?: boolean;
  /** Centre the body vertically (loading states). */
  centered?: boolean;
  /** Tab screens sit under the floating tab bar, so they leave room for it instead. */
  bottomInset?: boolean;
  /** Pinned under the scrolling body, e.g. the main action of a form. */
  footer?: ReactNode;
  /** Illustrated sky scene above the header (sign-in, setup screens). */
  hero?: 'house' | 'street';
  /** Put the body inside a white paper card (forms). */
  card?: boolean;
};

/** Paper background with grain, an optional header, then the body with the standard gutter. */
export function Screen({ children, header, scroll, centered, bottomInset = true, footer, hero, card }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const body = [styles.body, centered && styles.centered, !bottomInset && { paddingBottom: TAB_BAR_SPACE }];
  const content = card ? <Card padding={18} style={styles.card}>{children}</Card> : children;
  // With a hero, the sky runs up under the status bar and the header follows it.
  const top = hero ? (
    <>
      <Scene art={hero} height={insets.top + 230} fadeToPaper />
      {header ? <HeaderBand {...header} inset={false} /> : null}
    </>
  ) : header ? (
    <HeaderBand {...header} />
  ) : null;

  return (
    <SafeAreaView edges={bottomInset ? ['bottom'] : []} style={[styles.flex, { backgroundColor: colors.paper }]}>
      <PaperGrain />
      {scroll ? (
        // Android apps are edge-to-edge, so the window no longer resizes for
        // the keyboard: pad on both platforms.
        <KeyboardAvoidingView style={styles.flex} behavior="padding">
          <KeyboardScrollView contentContainerStyle={styles.grow}>
            {top}
            <View style={[body, styles.grow]}>{content}</View>
          </KeyboardScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </KeyboardAvoidingView>
      ) : (
        <>
          {top}
          <View style={[styles.flex, body]}>{content}</View>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grow: { flexGrow: 1 },
  body: { paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.xl },
  centered: { justifyContent: 'center' },
  card: { gap: space.lg, borderRadius: 28 },
  footer: { paddingHorizontal: space.lg + space.xs, paddingTop: space.sm, paddingBottom: space.md, gap: space.sm },
});
