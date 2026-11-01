import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle, Image } from 'react-native';
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
const MARK = require('../../assets/images/icon.png');

/** Orange disc with two white 3-toe footprints (from brand icon asset) */
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
  const scale = useSharedValue(animated ? 0.82 : 1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!animated) return;
    scale.value = withSpring(1, { damping: 11, stiffness: 140 });
  }, [animated]);

  const discStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[{ width: s, height: s }, style, discStyle]}>
      <Image
        source={MARK}
        style={{ width: s, height: s, borderRadius: s / 2 }}
        resizeMode="cover"
      />
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

export function PetsyName({ fontSize = 44 }: { fontSize?: number }) {
  return (
    <View style={styles.nameWrap}>
      <View style={styles.row}>
        {LETTERS.map((ch, i) => (
          <NameLetter key={ch + i} ch={ch} index={i} fontSize={fontSize} />
        ))}
      </View>
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
});
