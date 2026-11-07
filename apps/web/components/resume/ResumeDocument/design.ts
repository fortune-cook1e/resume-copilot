export const densityPresets = {
  compact: { label: 'Compact', lineHeight: 1.35, entryGap: 4, sectionGap: 9 },
  normal: { label: 'Normal', lineHeight: 1.5, entryGap: 6, sectionGap: 12 },
  roomy: { label: 'Roomy', lineHeight: 1.65, entryGap: 8, sectionGap: 16 },
} as const

export const themeColors = {
  blue: { label: 'Blue', hex: '#0284c7' },
  moss: { label: 'Moss', hex: '#3e6b4f' },
  teal: { label: 'Teal', hex: '#1f6e73' },
  plum: { label: 'Plum', hex: '#6b3e6e' },
  rust: { label: 'Rust', hex: '#a0442a' },
  burgundy: { label: 'Burgundy', hex: '#8a2c3f' },
  ochre: { label: 'Ochre', hex: '#7a5a12' },
  graphite: { label: 'Graphite', hex: '#3b3f45' },
} as const

export function resolveThemeColor(value = 'blue') {
  return Object.entries(themeColors).find(([id]) => id === value)?.[1].hex ?? value
}
