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
const SIZE_MAP = { sm: 36, md: 56, lg: 88, xl: 120 };

type Props = {
  size?: Size;
  showWordmark?: boolean;
  wordmarkColor?: string;
  tagline?: string | null;
  style?: ViewStyle;
  wordmarkStyle?: TextStyle;
  creative?: boolean;
  animated?: boolean;
};

/** Core paw-heart geometry */
function PawHeart({ inner }: { inner: number }) {
  const toe = inner * 0.16;
  const heelW = inner * 0.42;
  const heelH = inner * 0.36;
  return (
    <>
      <View style={{ flexDirection: 'row', gap: inner * 0.05, marginBottom: inner * 0.04 }}>
        {[0.78, 1, 1, 0.78].map((scale, i) => (
          <View
            key={i}
            style={{
              width: toe * scale,
              height: toe * scale * 1.15,
              borderRadius: toe,
              backgroundColor: Brand.colors.white,
              marginTop: i === 0 || i === 3 ? toe * 0.35 : 0,
            }}
          />
        ))}
      </View>
      <View
        style={{
          width: heelW,
          height: heelH,
          borderRadius: heelW / 2,
          backgroundColor: Brand.colors.white,
          marginTop: -inner * 0.02,
        }}
      />
    </>
  );
}

/** Vector Petsy mark — optional creative leaf + soft animation */
export function PetsyMark({
  size = 'md',
  style,
  creative = false,
  animated = false,
}: {
  size?: Size;
  style?: ViewStyle;
  creative?: boolean;
  animated?: boolean;
}) {
  const s = typeof size === 'number' ? size : SIZE_MAP[size];
  const pad = s * 0.16;
  const inner = s - pad * 2;
  const ringScale = useSharedValue(1);
  const markScale = useSharedValue(animated ? 0.86 : 1);
  const markOpacity = useSharedValue(animated ? 0 : 1);
  const leaf = useSharedValue(animated ? 0 : 1);

  useEffect(() => {
    if (!animated) return;
    markOpacity.value = withTiming(1, { duration: 420 });
    markScale.value = withSpring(1, { damping: 12, stiffness: 140 });
    leaf.value = withDelay(280, withTiming(1, { duration: 380 }));
    ringScale.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, [animated]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
  }));
  const markStyle = useAnimatedStyle(() => ({
    opacity: markOpacity.value,
    transform: [{ scale: markScale.value }],
  }));
  const leafStyle = useAnimatedStyle(() => ({
    opacity: leaf.value,
    transform: [{ scale: 0.7 + leaf.value * 0.3 }, { rotate: `${-18 + leaf.value * 8}deg` }],
  }));

  return (
    <Animated.View style={[{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }, style, markStyle]}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: s,
            height: s,
            borderRadius: s / 2,
            borderWidth: Math.max(2, s * 0.035),
            borderColor: Brand.colors.oliveRing,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
          },
          ringStyle,
        ]}
      />
      {creative && (
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: s * 0.04,
              right: s * 0.08,
              width: s * 0.18,
              height: s * 0.28,
              borderTopLeftRadius: s * 0.18,
              borderTopRightRadius: s * 0.18,
              borderBottomLeftRadius: s * 0.18,
              backgroundColor: Brand.colors.olive,
              transform: [{ rotate: '-28deg' }],
            },
            leafStyle,
          ]}
        />
      )}
      <View
        style={{
          width: inner,
          height: inner,
          borderRadius: inner / 2,
          backgroundColor: Brand.colors.orange,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <PawHeart inner={inner} />
      </View>
    </Animated.View>
  );
}

/** Image-based creative mark (generated brand asset) */
export function PetsyMarkImage({ size = 'lg', style }: { size?: Size; style?: ViewStyle }) {
  const s = typeof size === 'number' ? size : SIZE_MAP[size];
  return (
    <View style={[{ width: s, height: s, borderRadius: s / 2, overflow: 'hidden' }, style]}>
      <Image
        source={require('../../assets/images/mark-creative.png')}
        style={{ width: s, height: s }}
        resizeMode="cover"
      />
    </View>
  );
}

export function PetsyLogo({
  size = 'md',
  showWordmark = false,
  wordmarkColor = Brand.colors.ink,
  tagline = null,
  style,
  wordmarkStyle,
  creative = false,
  animated = false,
}: Props) {
  const s = typeof size === 'number' ? size : SIZE_MAP[size];
  return (
    <View style={[styles.wrap, style]}>
      <PetsyMark size={s} creative={creative} animated={animated} />
      {showWordmark && (
        <View style={styles.wordCol}>
          <Text style={[styles.word, { color: wordmarkColor, fontSize: Math.max(18, s * 0.42) }, wordmarkStyle]}>
            {Brand.name}
          </Text>
          {tagline ? <Text style={styles.tag}>{tagline}</Text> : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  wordCol: { alignItems: 'center', marginTop: 10 },
  word: {
    fontWeight: '800',
    letterSpacing: 1.2,
    fontFamily: 'Tajawal_800ExtraBold',
  },
  tag: {
    marginTop: 4,
    color: Brand.colors.inkMuted,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Tajawal_500Medium',
  },
});
