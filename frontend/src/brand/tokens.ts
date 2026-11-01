/**
 * Petsy — pet + sy (Syria)
 * Coral paw mark on a clean ground
 */
export const Brand = {
  name: 'Petsy',
  meaning: 'pet + sy',
  taglineAr: 'حيوان أليف من سوريا',
  taglineEn: 'Welcome to Petsy',
  colors: {
    orange: '#FF6B38',
    orangeDeep: '#E25522',
    orangeSoft: '#FFF1EB',
    ink: '#2C2C2C',
    inkMuted: '#8A8A8A',
    white: '#FFFFFF',
    mist: '#FFFFFF',
    mistDark: '#FFF6F2',
    /** legacy aliases follow the orange system */
    cedar: '#FF6B38',
    cedarDeep: '#E25522',
    gold: '#FF6B38',
    goldDeep: '#E25522',
    goldSoft: '#FFF1EB',
    olive: '#FF8A5B',
    oliveDeep: '#E25522',
    oliveRing: '#FF6B38',
    stone: '#FFFFFF',
    stoneDark: '#FFF6F2',
  },
  motion: {
    splashMarkMs: 640,
    splashWordMs: 520,
    splashHoldMs: 1500,
    letter: 70,
  },
} as const;
