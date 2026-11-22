import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import {
  Keyboard,
  ScrollView,
  TextInput,
  View,
  type HostInstance,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

/** Room kept above a focused input for its label, and below it for the hint. */
const ABOVE = 40;
const BELOW = 56;

const RevealContext = createContext<() => void>(() => {});

/** Call from an input's onFocus to scroll it above the keyboard. */
export const useRevealFocusedInput = () => useContext(RevealContext);

type Props = {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

/**
 * A ScrollView that keeps the focused text input visible above the keyboard.
 * Use inside a KeyboardAvoidingView so the view shrinks when the keyboard opens.
 */
export function KeyboardScrollView({ children, contentContainerStyle }: Props) {
  const scrollRef = useRef<ScrollViewInstance>(null);
  const contentRef = useRef<HostInstance>(null);
  const scrollY = useRef(0);
  const height = useRef(0);
  const pending = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function run() {
    pending.current = false;
    const input = TextInput.State.currentlyFocusedInput();
    const content = contentRef.current;
    if (!input || !content || !height.current) return;
    input.measureLayout(
      content,
      (_x, y, _w, h) => {
        const top = y - ABOVE;
        const bottom = y + h + BELOW;
        const visibleBottom = scrollY.current + height.current;
        if (bottom > visibleBottom) {
          scrollRef.current?.scrollTo({ y: Math.min(bottom - height.current, top), animated: true });
        } else if (top < scrollY.current) {
          scrollRef.current?.scrollTo({ y: Math.max(top, 0), animated: true });
        }
      },
      () => {},
    );
  }

  // Waits for the keyboard and the padding it adds before measuring.
  function reveal() {
    pending.current = true;
    clearTimeout(timer.current);
    timer.current = setTimeout(run, 150);
  }

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', reveal);
    return () => {
      show.remove();
      clearTimeout(timer.current);
    };
    // reveal only touches refs, so subscribing once is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onLayout(e: LayoutChangeEvent) {
    height.current = e.nativeEvent.layout.height;
    if (pending.current) {
      clearTimeout(timer.current);
      run();
    }
  }

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    scrollY.current = e.nativeEvent.contentOffset.y;
  }

  return (
    <RevealContext.Provider value={reveal}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={contentContainerStyle}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        onLayout={onLayout}
        onScroll={onScroll}
        scrollEventThrottle={16}>
        <View ref={contentRef} collapsable={false} style={contentContainerStyle}>
          {children}
        </View>
      </ScrollView>
    </RevealContext.Provider>
  );
}

/** A plain TextInput that scrolls itself above the keyboard when focused. */
export function RevealingTextInput({ onFocus, ...props }: TextInputProps) {
  const reveal = useRevealFocusedInput();
  return (
    <TextInput
      {...props}
      onFocus={(e) => {
        reveal();
        onFocus?.(e);
      }}
    />
  );
}
