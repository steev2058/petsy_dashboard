/** Petsy — coral pet palette */
import { Brand } from '../brand/tokens';

export const Colors = {
  primary: Brand.colors.orange,
  primaryDark: Brand.colors.orangeDeep,
  primarySoft: Brand.colors.orangeSoft,
  secondary: '#FF8A5B',
  secondaryDark: Brand.colors.orangeDeep,
  accent: Brand.colors.orange,
  background: '#FFFFFF',
  backgroundDark: '#FFF6F2',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  text: Brand.colors.ink,
  textSecondary: Brand.colors.inkMuted,
  textLight: '#B0B0B0',
  error: '#E04B4B',
  success: '#2F9E62',
  warning: '#E39B2B',
  border: '#F0E4DC',
  borderStrong: '#E4CFC4',
  white: '#FFFFFF',
  black: '#1A1A1A',
  overlay: 'rgba(44, 44, 44, 0.45)',
  gradient: ['#FF6B38', '#FF8A5B'] as string[],
  heroGlow: 'rgba(255, 107, 56, 0.16)',
  categoryColors: ['#FF6B38', '#FF8A5B', '#F0A06A', '#E07A5F', '#C96B4A', '#FFB088'],
};

export const Spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
export const FontSize = { xs: 11, sm: 13, md: 15, lg: 17, xl: 20, xxl: 28, xxxl: 40, display: 48 };
export const FontFamily = {
  body: 'Tajawal_400Regular',
  medium: 'Tajawal_500Medium',
  bold: 'Tajawal_700Bold',
  display: 'Tajawal_800ExtraBold',
};
export const BorderRadius = { sm: 10, md: 14, lg: 20, xl: 28, full: 9999 };
export const Shadow = {
  small: { shadowColor: '#FF6B38', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 2 },
  medium: { shadowColor: '#2C2C2C', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
  large: { shadowColor: '#2C2C2C', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 8 },
};
export const Motion = { quick: 180, normal: 320, slow: 520 };
