import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { PetsyMark } from './PetsyLogo';
import { Brand } from '../brand/tokens';

type Props = { onReady?: () => void };

/** Splash: mist wash → gold breath → arch mark springs → word + Arabic line */
export function PetsySplash({ onReady }: Props) {
  const wash = useSharedValue(0);
  const wordY = useSharedValue(22);
  const wordOpacity = useSharedValue(0);
  const line = useSharedValue(0);

  useEffect(() => {
    wash.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
    line.value = withDelay(520, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }));
    wordOpacity.value = withDelay(360, withTiming(1, { duration: Brand.motion.splashWordMs }));
    wordY.value = withDelay(
      360,
      withTiming(0, { duration: Brand.motion.splashWordMs, easing: Easing.out(Easing.cubic) })
    );
    const t = setTimeout(() => onReady?.(), Brand.motion.splashHoldMs + 420);
    return () => clearTimeout(t);
  }, []);

  const washStyle = useAnimatedStyle(() => ({ opacity: 0.35 * wash.value }));
  const wordStyle = useAnimatedStyle(() => ({
    opacity: wordOpacity.value,
    transform: [{ translateY: wordY.value }],
  }));
  const lineStyle = useAnimatedStyle(() => ({
    width: 18 + line.value * 46,
    opacity: 0.4 + line.value * 0.6,
  }));

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[Brand.colors.mist, '#E7F1F0', Brand.colors.mistDark]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[styles.wash, washStyle]} />
      <PetsyMark size={132} animated />
      <Animated.View style={[styles.wordBlock, wordStyle]}>
        <Text style={styles.word}>{Brand.name}</Text>
        <Animated.View style={[styles.rule, lineStyle]} />
        <Text style={styles.tag}>{Brand.taglineAr}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.colors.mist,
  },
  wash: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: Brand.colors.gold,
  },
  wordBlock: { marginTop: 28, alignItems: 'center' },
  word: {
    fontSize: 46,
    fontWeight: '800',
    color: Brand.colors.cedar,
    letterSpacing: 1.6,
    fontFamily: 'Tajawal_800ExtraBold',
  },
  rule: { marginTop: 12, height: 3, borderRadius: 2, backgroundColor: Brand.colors.gold },
  tag: {
    marginTop: 12,
    fontSize: 16,
    color: Brand.colors.inkMuted,
    fontWeight: '600',
    fontFamily: 'Tajawal_500Medium',
  },
});
