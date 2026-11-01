/**
 * Petsy Design System — aligned to Brand mark
 * Orange paw · olive trust · Damascus stone ground
 */
import { Brand } from '../brand/tokens';

export const Colors = {
  primary: Brand.colors.orange,
  primaryDark: Brand.colors.orangeDeep,
  primarySoft: Brand.colors.orangeSoft,
  secondary: Brand.colors.olive,
  secondaryDark: Brand.colors.oliveDeep,
  accent: Brand.colors.oliveRing,
  background: Brand.colors.stone,
  backgroundDark: Brand.colors.stoneDark,
  surface: '#FFFCF8',
  surfaceElevated: '#FFFFFF',
  text: Brand.colors.ink,
  textSecondary: Brand.colors.inkMuted,
  textLight: '#8A9690',
  error: '#C94545',
  success: '#2F7D4A',
  warning: '#C4892A',
  border: '#E2D8CC',
  borderStrong: '#CBBBA8',
  white: Brand.colors.white,
  black: '#0B0F0D',
  overlay: 'rgba(31, 42, 36, 0.45)',
  gradient: [Brand.colors.orange, '#F6A85A'] as string[],
  heroGlow: 'rgba(240, 140, 53, 0.18)',
  categoryColors: [
    Brand.colors.orange,
    Brand.colors.olive,
    Brand.colors.oliveRing,
    '#6B8F9E',
    '#9B7EBD',
    '#8B6B5A',
  ],
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 28,
  xxxl: 40,
  display: 48,
};

export const FontFamily = {
  body: 'Tajawal_400Regular',
  medium: 'Tajawal_500Medium',
  bold: 'Tajawal_700Bold',
  display: 'Tajawal_800ExtraBold',
};

export const BorderRadius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  full: 9999,
};

export const Shadow = {
  small: {
    shadowColor: Brand.colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  medium: {
    shadowColor: Brand.colors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 5,
  },
  large: {
    shadowColor: Brand.colors.ink,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 10,
  },
};

export const Motion = {
  quick: 180,
  normal: 280,
  slow: 420,
};
