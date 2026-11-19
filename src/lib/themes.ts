export type Scheme = 'light' | 'dark'

export const themes = {
  green: 'Green',
  halloween: 'Halloween',
  winter: 'Winter',
  ocean: 'Ocean',
  lagoon: 'Lagoon',
  plum: 'Plum',
  lavender: 'Lavender',
  rose: 'Rose',
  coral: 'Coral',
  ember: 'Ember',
  honey: 'Honey',
  citrus: 'Citrus',
  forest: 'Forest',
  terracotta: 'Terracotta',
  indigo: 'Indigo',
  mono: 'Mono',
  blackWhite: 'Black & White',
} as const

export type Theme = keyof typeof themes

type Ramp = [string, string, string, string]
const ramps: Record<Theme, [light: Ramp, dark: Ramp]> = {
  green: [['#aceebb', '#4ac26b', '#2da44e', '#116329'], ['#033a16', '#196c2e', '#2ea043', '#56d364']],
  halloween: [['#ffee4a', '#ffc501', '#fe9600', '#954a00'], ['#631c03', '#bd561d', '#fa7a18', '#fddf68']],
  winter: [['#b6e3ff', '#54aeff', '#0969da', '#0a3069'], ['#0c2d6b', '#1158c7', '#388bfd', '#79c0ff']],
  ocean: [['#b8dafa', '#66addb', '#256d9f', '#103d64'], ['#123752', '#205879', '#3a90ba', '#80c9ed']],
  lagoon: [['#a5edeb', '#4bc7c6', '#178889', '#145153'], ['#164144', '#266667', '#42a9a3', '#7fe5d7']],
  plum: [['#ecd0f6', '#d19ae4', '#a257b9', '#622477'], ['#43234f', '#72407f', '#aa63be', '#e7a5f6']],
  lavender: [['#dfd9fb', '#b7a7ed', '#8168ca', '#4b348c'], ['#362c55', '#5d4c87', '#8c72c2', '#c9b4ff']],
  rose: [['#fbcfe0', '#f18db1', '#cd477f', '#8d1c52'], ['#54283b', '#8f3b5d', '#ce5c89', '#ff9ec3']],
  coral: [['#ffdacb', '#ffa689', '#dc634d', '#912e27'], ['#562b28', '#8e4641', '#d26757', '#ffa488']],
  ember: [['#ffd4b3', '#fc9a59', '#d55124', '#902811'], ['#522b17', '#8d411d', '#d66a2c', '#ffaf70']],
  honey: [['#ffebb1', '#f2ca6b', '#bb841e', '#765008'], ['#46331b', '#775824', '#bc8b2c', '#f6d575']],
  citrus: [['#e5f1a6', '#b8d856', '#7a9f27', '#4a6215'], ['#37401e', '#626f2d', '#97ad42', '#d2ec76']],
  forest: [['#cce0bb', '#94bc7b', '#597e4b', '#2f4c2b'], ['#2b3e26', '#4c6640', '#789d61', '#b7d694']],
  terracotta: [['#f2d8cb', '#d9a693', '#aa6b53', '#713d2d'], ['#49312a', '#795347', '#b8816b', '#eeb69a']],
  indigo: [['#d3ddff', '#9daef9', '#5e70dc', '#333e93'], ['#2a3260', '#46569a', '#7588e7', '#adb9ff']],
  mono: [['#dce1e7', '#afb7c1', '#77818f', '#434c59'], ['#333943', '#5a6370', '#8b95a3', '#c2cad4']],
  blackWhite: [['#cccccc', '#888888', '#444444', '#000000'], ['#444444', '#888888', '#cccccc', '#ffffff']],
}

export function colorsFor(theme: Theme, scheme: Scheme) {
  const dark = scheme === 'dark'
  const empty = theme === 'blackWhite' ? (dark ? '#000000' : '#ffffff') : (dark ? '#151b23' : '#eff2f5')
  return [empty, ...ramps[theme][dark ? 1 : 0]]
}

export function onColor(hex: string) {
  const [red, green, blue] = [1, 3, 5].map((offset) => {
    const channel = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue > 0.179 ? '#000000' : '#ffffff'
}
