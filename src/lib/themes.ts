export type Theme = 'green' | 'halloween' | 'winter'
export type Scheme = 'light' | 'dark'
export const themes: Record<Theme, string> = { green: 'Green', halloween: 'Halloween', winter: 'Winter' }

const palette: Record<Theme, Record<Scheme, string[]>> = {
  green: {
    light: ['#eff2f5', '#aceebb', '#4ac26b', '#2da44e', '#116329'],
    dark: ['#151b23', '#033a16', '#196c2e', '#2ea043', '#56d364'],
  },
  halloween: {
    light: ['#eff2f5', '#ffee4a', '#ffc501', '#fe9600', '#954a00'],
    dark: ['#151b23', '#631c03', '#bd561d', '#fa7a18', '#fddf68'],
  },
  winter: {
    light: ['#eff2f5', '#b6e3ff', '#54aeff', '#0969da', '#0a3069'],
    dark: ['#151b23', '#0c2d6b', '#1158c7', '#388bfd', '#79c0ff'],
  },
}

export const colorsFor = (theme: Theme, scheme: Scheme) => palette[theme][scheme]

export function onColor(hex: string) {
  const [red, green, blue] = [1, 3, 5].map((offset) => {
    const channel = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue > 0.179 ? '#000000' : '#ffffff'
}
