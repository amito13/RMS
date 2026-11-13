import { Text as RNText, type TextProps } from 'react-native';

import { typography, useTheme, type Palette, type TypographyVariant } from '@/theme';

type Tone = keyof Pick<
  Palette,
  'ink' | 'inkMuted' | 'inkFaint' | 'brand' | 'paid' | 'due' | 'overdue'
>;

type Props = TextProps & {
  variant?: TypographyVariant;
  tone?: Tone;
  align?: 'left' | 'center' | 'right';
};

export function Text({ variant = 'body', tone = 'ink', align, style, ...props }: Props) {
  const { colors } = useTheme();
  return (
    <RNText
      style={[typography[variant], { color: colors[tone] }, align && { textAlign: align }, style]}
      {...props}
    />
  );
}
