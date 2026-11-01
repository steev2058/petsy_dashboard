import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle, Image } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Brand } from '../brand/tokens';

type Size = 'sm' | 'md' | 'lg' | 'xl' | number;
const SIZE_MAP = { sm: 36, md: 56, lg: 88, xl: 128 };

type MarkProps = {
  size?: Size;
  style?: ViewStyle;
  animated?: boolean;
  creative?: boolean;
};

/** Courtyard-arch mark — cedar tile with a slow gold breath when animated */
export function PetsyMark({ size = 'md', style, animated = false }: MarkProps) {
  const s = typeof size === 'number' ? size : SIZE_MAP[size];
  const scale = useSharedValue(animated ? 0.92 : 1);
  const opacity = useSharedValue(1);
  const ring = useSharedValue(0.92);

  useEffect(() => {
    if (!animated) return;
    opacity.value = withTiming(1, { duration: 420 });
    scale.value = withSpring(1, { damping: 12, stiffness: 130 });
    ring.value = withDelay(
      200,
      withRepeat(
        withSequence(
          withTiming(1.06, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.96, { duration: 1400, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      )
    );
  }, [animated]);

  const markStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.55,
    transform: [{ scale: ring.value }],
  }));

  return (
    <Animated.View style={[{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }, style, markStyle]}>
      {animated && (
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: s * 1.08,
              height: s * 1.08,
              borderRadius: s * 0.28,
              borderWidth: 1.5,
              borderColor: Brand.colors.gold,
            },
            ringStyle,
          ]}
        />
      )}
      <Image
        source={require('../../assets/images/icon.png')}
        style={{ width: s, height: s, borderRadius: s * 0.22 }}
        resizeMode="cover"
      />
    </Animated.View>
  );
}

export function PetsyMarkImage({ size = 'lg', style }: { size?: Size; style?: ViewStyle }) {
  return <PetsyMark size={size} style={style} animated />;
}

export function PetsyLogo({
  size = 'md',
  showWordmark = false,
  wordmarkColor = Brand.colors.ink,
  tagline = null,
  style,
  wordmarkStyle,
  animated = false,
}: {
  size?: Size;
  showWordmark?: boolean;
  wordmarkColor?: string;
  tagline?: string | null;
  style?: ViewStyle;
  wordmarkStyle?: TextStyle;
  creative?: boolean;
  animated?: boolean;
}) {
  const s = typeof size === 'number' ? size : SIZE_MAP[size];
  return (
    <View style={[styles.wrap, style]}>
      <PetsyMark size={s} animated={animated} />
      {showWordmark && (
        <View style={styles.wordCol}>
          <Text style={[styles.word, { color: wordmarkColor, fontSize: Math.max(18, s * 0.38) }, wordmarkStyle]}>
            {Brand.name}
          </Text>
          <View style={styles.goldRule} />
          {tagline ? <Text style={styles.tag}>{tagline}</Text> : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  wordCol: { alignItems: 'center', marginTop: 12 },
  word: { fontWeight: '800', letterSpacing: 1.4, fontFamily: 'Tajawal_800ExtraBold' },
  goldRule: {
    marginTop: 8,
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: Brand.colors.gold,
  },
  tag: {
    marginTop: 8,
    color: Brand.colors.inkMuted,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Tajawal_500Medium',
  },
});
