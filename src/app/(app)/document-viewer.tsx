import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { space } from '@/theme';

const MAX_SCALE = 5;

/** Full-screen photo of a document with pinch and double-tap zoom (PRD DOC-5). */
export default function DocumentViewer() {
  const { url, title } = useLocalSearchParams<{ url: string; title?: string }>();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  const reset = () => {
    'worklet';
    scale.value = withTiming(1);
    savedScale.value = 1;
    x.value = withTiming(0);
    y.value = withTiming(0);
    savedX.value = 0;
    savedY.value = 0;
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(MAX_SCALE, Math.max(1, savedScale.value * e.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value <= 1.01) reset();
    });

  const pan = Gesture.Pan()
    .averageTouches(true)
    .onUpdate((e) => {
      if (scale.value <= 1) return;
      x.value = savedX.value + e.translationX;
      y.value = savedY.value + e.translationY;
    })
    .onEnd(() => {
      savedX.value = x.value;
      savedY.value = y.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        reset();
      } else {
        scale.value = withTiming(2.5);
        savedScale.value = 2.5;
      }
    });

  const gesture = Gesture.Exclusive(doubleTap, Gesture.Simultaneous(pinch, pan));

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }],
  }));

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <View style={styles.bar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={() => router.back()}
          hitSlop={space.sm}
          style={styles.close}>
          <Text variant="label" style={styles.light}>
            Close
          </Text>
        </Pressable>
        <Text variant="label" style={[styles.light, styles.title]} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.close} />
      </View>

      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.stage, animatedStyle]}>
          {failed ? (
            <Text style={styles.light}>This photo couldn&apos;t be loaded. The link may have expired; go back and open it again.</Text>
          ) : (
            <Image
              source={{ uri: url }}
              style={styles.image}
              contentFit="contain"
              onLoad={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setFailed(true);
              }}
              accessibilityLabel={title ?? 'Document photo'}
            />
          )}
        </Animated.View>
      </GestureDetector>
      {loading && !failed ? <ActivityIndicator style={StyleSheet.absoluteFill} color="#FFFFFF" /> : null}

      <Text variant="caption" align="center" style={[styles.light, styles.hint]}>
        Pinch or double-tap to zoom
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000000' },
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, minHeight: 48 },
  close: { width: 64, justifyContent: 'center', minHeight: 44 },
  title: { flex: 1, textAlign: 'center' },
  light: { color: '#FFFFFF' },
  stage: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: space.lg },
  image: { width: '100%', height: '100%' },
  hint: { opacity: 0.7, paddingVertical: space.sm },
});
