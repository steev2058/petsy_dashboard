import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { PetsyMark, PetsyName } from './PetsyLogo';
import { Brand } from '../brand/tokens';

export function PetsySplash({ onReady }: { onReady?: () => void }) {
  const line = useSharedValue(0);
  useEffect(() => {
    line.value = withDelay(900, withTiming(1, { duration: 360 }));
    const t = setTimeout(() => onReady?.(), Brand.motion.splashHoldMs);
    return () => clearTimeout(t);
  }, []);
  const lineStyle = useAnimatedStyle(() => ({ opacity: line.value }));

  return (
    <View style={styles.root}>
      <PetsyMark size={120} animated />
      <PetsyName fontSize={46} />
      <Animated.Text style={[styles.welcome, lineStyle]}>{Brand.taglineEn}</Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.colors.white,
  },
  welcome: {
    marginTop: 8,
    color: Brand.colors.inkMuted,
    fontSize: 16,
    fontWeight: '600',
  },
});
