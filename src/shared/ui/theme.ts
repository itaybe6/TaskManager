// Brand palette (beige + purple scale)
// Provided by you:
// --beige-100:  #EEDDD2
// --purple-300: #8A789E
// --purple-500: #585384
// --purple-700: #3F3A6B
export const palette = {
  beige: {
    100: '#EEDDD2',
  },
  purple: {
    300: '#8A789E',
    500: '#585384',
    700: '#3F3A6B',
  },
} as const;

export const theme = {
  colors: {
    // Primary brand
    primary: palette.purple[500],
    primaryLight: palette.purple[300],
    primaryStrong: palette.purple[700],
    // Backward-compatible aliases used around the app
    primaryNeon: palette.purple[700],
    primaryClassic: palette.purple[500],
    primaryDeep: palette.purple[700],
    primaryDarkest: palette.purple[700],

    // Common tints for surfaces/borders/glows (precomputed RGBA)
    primarySoft: 'rgba(88, 83, 132, 0.14)', // #585384
    primarySoft2: 'rgba(138, 120, 158, 0.14)', // #8A789E
    primarySoftDark: 'rgba(138, 120, 158, 0.22)', // #8A789E (better on dark surfaces)
    primaryDeepSoft: 'rgba(63, 58, 107, 0.22)', // #3F3A6B
    primaryBorder: 'rgba(63, 58, 107, 0.18)', // #3F3A6B
    primaryGlow: 'rgba(88, 83, 132, 0.35)', // #585384

    // App background (requested: white)
    background: '#FFFFFF',
    surface: '#FFFFFF',
    // Some screens use surfaceMuted for page background → keep white as well.
    surfaceMuted: '#FFFFFF',
    // Optional warm accent (keep palette available for components that want it)
    accentMuted: palette.beige[100],

    text: '#0C111D',
    textMuted: '#64748B',

    border: 'rgba(63, 58, 107, 0.10)',
    shadow: 'rgba(12, 17, 29, 0.12)',

    danger: '#EF4444',
    success: '#059669',
    warning: '#F59E0B',
  },
} as const;

