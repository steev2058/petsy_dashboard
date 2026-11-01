import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
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
};

/** Vector-like Petsy mark built from views — matches brand icon geometry */
export function PetsyMark({ size = 'md', style }: { size?: Size; style?: ViewStyle }) {
  const s = typeof size === 'number' ? size : SIZE_MAP[size];
  const pad = s * 0.18;
  const inner = s - pad * 2;
  const toe = inner * 0.16;
  const heelW = inner * 0.42;
  const heelH = inner * 0.36;

  return (
    <View style={[{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }, style]}>
      {/* olive broken ring */}
      <View
        style={{
          position: 'absolute',
          width: s,
          height: s,
          borderRadius: s / 2,
          borderWidth: Math.max(2, s * 0.035),
          borderColor: Brand.colors.oliveRing,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          transform: [{ rotate: '0deg' }],
        }}
      />
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
        {/* toes */}
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
        {/* heart heel */}
        <View
          style={{
            width: heelW,
            height: heelH,
            borderRadius: heelW / 2,
            backgroundColor: Brand.colors.white,
            marginTop: -inner * 0.02,
          }}
        />
      </View>
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
}: Props) {
  const s = typeof size === 'number' ? size : SIZE_MAP[size];
  return (
    <View style={[styles.wrap, style]}>
      <PetsyMark size={s} />
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
