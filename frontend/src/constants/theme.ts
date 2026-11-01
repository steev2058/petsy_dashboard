/**
 * Petsy Design System — Lantern Courtyard rebrand
 */
import { Brand } from '../brand/tokens';

export const Colors = {
  primary: Brand.colors.cedar,
  primaryDark: Brand.colors.cedarDeep,
  primarySoft: Brand.colors.orangeSoft,
  secondary: Brand.colors.gold,
  secondaryDark: Brand.colors.goldDeep,
  accent: Brand.colors.gold,
  background: Brand.colors.mist,
  backgroundDark: Brand.colors.mistDark,
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  text: Brand.colors.ink,
  textSecondary: Brand.colors.inkMuted,
  textLight: '#7D908C',
  error: '#C94545',
  success: '#1F7A4D',
  warning: Brand.colors.goldDeep,
  border: '#D7E2DF',
  borderStrong: '#B7C9C4',
  white: Brand.colors.white,
  black: '#0B1211',
  overlay: 'rgba(18, 33, 31, 0.48)',
  gradient: [Brand.colors.cedar, '#1F6A5A'] as string[],
  heroGlow: 'rgba(232, 163, 23, 0.18)',
  categoryColors: [
    Brand.colors.cedar,
    Brand.colors.gold,
    '#1F6A5A',
    '#6B8F9E',
    '#8B6B5A',
    '#3E6B8A',
  ],
};

export const Spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };

export const FontSize = {
  xs: 11, sm: 13, md: 15, lg: 17, xl: 20, xxl: 28, xxxl: 40, display: 48,
};

export const FontFamily = {
  body: 'Tajawal_400Regular',
  medium: 'Tajawal_500Medium',
  bold: 'Tajawal_700Bold',
  display: 'Tajawal_800ExtraBold',
};

export const BorderRadius = { sm: 10, md: 14, lg: 20, xl: 28, full: 9999 };

export const Shadow = {
  small: { shadowColor: Brand.colors.ink, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
  medium: { shadowColor: Brand.colors.ink, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 5 },
  large: { shadowColor: Brand.colors.ink, shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.16, shadowRadius: 28, elevation: 10 },
};

export const Motion = { quick: 180, normal: 320, slow: 520 };
