import { paletteGroups } from '../lib/themes.ts'
import type { Theme } from '../lib/themes.ts'

interface PaletteSelectProps<T extends Theme | 'same'> {
  label: string
  value: T
  colors?: string[]
  includeSame?: boolean
  onChange: (palette: T) => void
}

export function PaletteSelect<T extends Theme | 'same'>({ label, value, colors, includeSame, onChange }: PaletteSelectProps<T>) {
  return <label className="palette-control">
    <span>{label}</span>
    <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value as T)}>
      {includeSame && <option value="same">Same palette</option>}
      {Object.entries(paletteGroups).map(([group, options]) => <optgroup label={group} key={group}>
        {Object.entries(options).map(([key, name]) => <option value={key} key={key}>{name}</option>)}
      </optgroup>)}
    </select>
    {colors && <span className="palette-preview" aria-hidden="true">
      {colors.map((color) => <span style={{ backgroundColor: color }} key={color}/>)}
    </span>}
  </label>
}
