/**
 * Petsy Brand System — source of truth
 * Mark: warm orange paw-heart · Accent: Damascus olive · Ground: soft stone
 */
export const Brand = {
  name: 'Petsy',
  taglineAr: 'رعاية الحيوان في سوريا',
  taglineEn: 'Pet care for Syria',
  colors: {
    orange: '#F08C35',
    orangeDeep: '#D96F1F',
    orangeSoft: '#FFF3E8',
    olive: '#6E7F4A',
    oliveDeep: '#4F5C35',
    oliveRing: '#8B9050',
    stone: '#F7F3EE',
    stoneDark: '#E8E0D4',
    ink: '#1F2A24',
    inkMuted: '#5C6B63',
    white: '#FFFFFF',
  },
  motion: {
    splashMarkMs: 700,
    splashWordMs: 450,
    splashRingMs: 900,
    splashHoldMs: 1400,
  },
} as const;

export type BrandColors = typeof Brand.colors;
