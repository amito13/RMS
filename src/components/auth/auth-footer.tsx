import { Link, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { space, typography, useTheme } from '@/theme';

type Props = { prompt: string; linkText: string; href: Href };

/** "New to RMS? Create an account" style switch between auth screens. */
export function AuthFooter({ prompt, linkText, href }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.footer}>
      <Text tone="inkMuted">{prompt}</Text>
      <Link href={href} replace style={[typography.bodyStrong, { color: colors.blue }]}>
        {linkText}
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: space.xs + 2,
    marginTop: space.xl,
    paddingVertical: space.sm,
  },
});
