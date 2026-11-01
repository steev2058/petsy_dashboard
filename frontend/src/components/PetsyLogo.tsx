import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Brand } from '../brand/tokens';

type Size = 'sm' | 'md' | 'lg' | 'xl' | number;
const SIZE_MAP = { sm: 36, md: 56, lg: 88, xl: 128 };

function Paw({ size, color = Brand.colors.white }: { size: number; color?: string }) {
  const toe = size * 0.22;
  return (
    <View style={{ width: size, height: size * 1.15, alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: size * 0.07 }}>
        {[0.88, 1, 0.88].map((scale, i) => (
          <View
            key={i}
            style={{
              width: toe * scale,
              height: toe * scale * 1.28,
              borderRadius: toe,
              backgroundColor: color,
              marginBottom: i === 1 ? toe * 0.28 : 0,
            }}
          />
        ))}
      </View>
      <View
        style={{
          width: size * 0.62,
          height: size * 0.48,
          borderRadius: size,
          backgroundColor: color,
          marginTop: size * 0.02,
        }}
      />
    </View>
  );
}

/** Orange disc with two white footprints — pet + sy */
export function PetsyMark({
  size = 'md',
  style,
  animated = false,
}: {
  size?: Size;
  style?: ViewStyle;
  animated?: boolean;
  creative?: boolean;
}) {
  const s = typeof size === 'number' ? size : SIZE_MAP[size];
  const disc = useSharedValue(animated ? 0.72 : 1);
  const pawA = useSharedValue(animated ? 0 : 1);
  const pawB = useSharedValue(animated ? 0 : 1);

  useEffect(() => {
    if (!animated) return;
    disc.value = withSpring(1, { damping: 11, stiffness: 140 });
    pawA.value = withDelay(180, withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) }));
    pawB.value = withDelay(340, withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) }));
  }, [animated]);

  const discStyle = useAnimatedStyle(() => ({ transform: [{ scale: disc.value }] }));
  const aStyle = useAnimatedStyle(() => ({
    opacity: pawA.value,
    transform: [{ translateY: (1 - pawA.value) * 8 }, { rotate: '-24deg' }],
  }));
  const bStyle = useAnimatedStyle(() => ({
    opacity: pawB.value,
    transform: [{ translateY: (1 - pawB.value) * 8 }, { rotate: '16deg' }],
  }));

  return (
    <Animated.View
      style={[
        {
          width: s,
          height: s,
          borderRadius: s / 2,
          backgroundColor: Brand.colors.orange,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        },
        style,
        discStyle,
      ]}
    >
      <Animated.View style={[{ position: 'absolute', left: s * 0.16, top: s * 0.16 }, aStyle]}>
        <Paw size={s * 0.30} />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', right: s * 0.14, bottom: s * 0.12 }, bStyle]}>
        <Paw size={s * 0.36} />
      </Animated.View>
    </Animated.View>
  );
}

export function PetsyMarkImage(props: { size?: Size; style?: ViewStyle }) {
  return <PetsyMark {...props} animated />;
}

const LETTERS = ['P', 'e', 't', 's', 'y'] as const;

function NameLetter({ ch, index, fontSize }: { ch: string; index: number; fontSize: number }) {
  const y = useSharedValue(14);
  const opacity = useSharedValue(0);
  useEffect(() => {
    const delay = 420 + index * Brand.motion.letter;
    opacity.value = withDelay(delay, withTiming(1, { duration: 280 }));
    y.value = withDelay(delay, withTiming(0, { duration: 380, easing: Easing.out(Easing.cubic) }));
  }, [index]);
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }],
  }));
  return (
    <Animated.Text style={[styles.letter, { fontSize }, style]}>{ch}</Animated.Text>
  );
}

/** Staggered Petsy word — pet then sy */
export function PetsyName({ fontSize = 44 }: { fontSize?: number }) {
  const caption = useSharedValue(0);
  useEffect(() => {
    caption.value = withDelay(420 + LETTERS.length * Brand.motion.letter + 80, withTiming(1, { duration: 420 }));
  }, []);
  const captionStyle = useAnimatedStyle(() => ({
    opacity: caption.value,
    transform: [{ translateY: (1 - caption.value) * 8 }],
  }));

  return (
    <View style={styles.nameWrap}>
      <View style={styles.row}>
        {LETTERS.map((ch, i) => (
          <NameLetter key={ch + i} ch={ch} index={i} fontSize={fontSize} />
        ))}
      </View>
      <Animated.View style={captionStyle}>
        <Text style={styles.meaning}>pet  ·  sy</Text>
        <Text style={styles.meaningAr}>{Brand.taglineAr}</Text>
      </Animated.View>
    </View>
  );
}

export function PetsyLogo({
  size = 'md',
  showWordmark = false,
  animated = false,
  style,
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
      {showWordmark ? <PetsyName fontSize={Math.max(28, s * 0.42)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  nameWrap: { alignItems: 'center', marginTop: 14 },
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  letter: {
    color: Brand.colors.orange,
    fontWeight: '800',
    letterSpacing: 0.4,
    fontFamily: 'Tajawal_800ExtraBold',
  },
  meaning: {
    marginTop: 6,
    textAlign: 'center',
    color: Brand.colors.inkMuted,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  meaningAr: {
    marginTop: 2,
    textAlign: 'center',
    color: Brand.colors.inkMuted,
    fontSize: 14,
    fontWeight: '600',
  },
});
