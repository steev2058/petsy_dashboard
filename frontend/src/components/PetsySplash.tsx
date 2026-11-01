import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { PetsyMark } from './PetsyLogo';
import { Brand } from '../brand/tokens';

type Props = {
  /** called after entrance motion settles */
  onReady?: () => void;
};

/**
 * Branded splash composition:
 * 1) soft stone wash
 * 2) olive ring breathes in
 * 3) orange mark springs
 * 4) wordmark + Arabic tagline fade up
 */
export function PetsySplash({ onReady }: Props) {
  const ring = useSharedValue(0.7);
  const ringOpacity = useSharedValue(0);
  const markScale = useSharedValue(0.55);
  const markOpacity = useSharedValue(0);
  const wordY = useSharedValue(18);
  const wordOpacity = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    ringOpacity.value = withTiming(1, { duration: 420 });
    ring.value = withSequence(
      withTiming(1.08, { duration: Brand.motion.splashRingMs, easing: Easing.out(Easing.cubic) }),
      withSpring(1, { damping: 12, stiffness: 120 })
    );
    markOpacity.value = withDelay(120, withTiming(1, { duration: 380 }));
    markScale.value = withDelay(
      120,
      withSpring(1, { damping: 11, stiffness: 140 })
    );
    glow.value = withDelay(200, withTiming(1, { duration: 700 }));
    wordOpacity.value = withDelay(380, withTiming(1, { duration: Brand.motion.splashWordMs }));
    wordY.value = withDelay(
      380,
      withTiming(0, { duration: Brand.motion.splashWordMs, easing: Easing.out(Easing.cubic) })
    );
    const t = setTimeout(() => onReady?.(), Brand.motion.splashHoldMs + 500);
    return () => clearTimeout(t);
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ring.value }],
  }));
  const markStyle = useAnimatedStyle(() => ({
    opacity: markOpacity.value,
    transform: [{ scale: markScale.value }],
  }));
  const wordStyle = useAnimatedStyle(() => ({
    opacity: wordOpacity.value,
    transform: [{ translateY: wordY.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.22 * glow.value,
    transform: [{ scale: 0.9 + glow.value * 0.15 }],
  }));

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[Brand.colors.stone, Brand.colors.stoneDark, '#F3E7DC']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[styles.glow, glowStyle]} />

      <View style={styles.stage}>
        <Animated.View style={[styles.ringHalo, ringStyle]} />
        <Animated.View style={markStyle}>
          <PetsyMark size={128} />
        </Animated.View>
      </View>

      <Animated.View style={[styles.wordBlock, wordStyle]}>
        <Text style={styles.word}>{Brand.name}</Text>
        <View style={styles.rule} />
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
    backgroundColor: Brand.colors.stone,
  },
  glow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: Brand.colors.orange,
  },
  stage: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringHalo: {
    position: 'absolute',
    width: 148,
    height: 148,
    borderRadius: 74,
    borderWidth: 1.5,
    borderColor: Brand.colors.oliveRing,
    opacity: 0.55,
  },
  wordBlock: {
    marginTop: 28,
    alignItems: 'center',
  },
  word: {
    fontSize: 44,
    fontWeight: '800',
    color: Brand.colors.ink,
    letterSpacing: 1.4,
    fontFamily: 'Tajawal_800ExtraBold',
  },
  rule: {
    marginTop: 10,
    width: 42,
    height: 3,
    borderRadius: 2,
    backgroundColor: Brand.colors.olive,
  },
  tag: {
    marginTop: 12,
    fontSize: 16,
    color: Brand.colors.inkMuted,
    fontWeight: '600',
    fontFamily: 'Tajawal_500Medium',
  },
});
