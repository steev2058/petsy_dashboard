/**
 * Petsy Brand — Lantern Courtyard
 * Cedar arch · gold light · mist ground
 */
export const Brand = {
  name: 'Petsy',
  taglineAr: 'رعاية الحيوان في سوريا',
  taglineEn: 'Pet care for Syria',
  colors: {
    cedar: '#143E3C',
    cedarDeep: '#0E2C2A',
    gold: '#E8A317',
    goldDeep: '#C4840C',
    goldSoft: '#FFF6E0',
    mist: '#F3F6F5',
    mistDark: '#E4ECEA',
    ink: '#12211F',
    inkMuted: '#4E625F',
    white: '#FFFFFF',
    /** aliases so older screens follow the new system */
    orange: '#143E3C',
    orangeDeep: '#0E2C2A',
    orangeSoft: '#E7F1F0',
    olive: '#1F6A5A',
    oliveDeep: '#143E3C',
    oliveRing: '#E8A317',
    stone: '#F3F6F5',
    stoneDark: '#E4ECEA',
  },
  motion: {
    splashMarkMs: 720,
    splashWordMs: 480,
    splashRingMs: 900,
    splashHoldMs: 1500,
    enter: 460,
  },
} as const;

export type BrandColors = typeof Brand.colors;
