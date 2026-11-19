import { useId, useRef } from 'react'
import { colorsFor, paletteGroups } from '../lib/themes.ts'
import type { Scheme, Theme } from '../lib/themes.ts'

interface PaletteSelectProps {
  value: Theme
  colors: string[]
  scheme: Scheme
  onChange: (palette: Theme) => void
}

const options = Object.assign({}, ...Object.values(paletteGroups)) as Record<Theme, string>

function Cubes({ colors }: { colors: string[] }) {
  return <span className="palette-cubes" aria-hidden="true">
    {colors.map((color) => <span style={{ backgroundColor: color }} key={color}/>)}
  </span>
}

export function PaletteSelect({ value, colors, scheme, onChange }: PaletteSelectProps) {
  const id = useId()
  const trigger = useRef<HTMLButtonElement>(null)
  const picker = useRef<HTMLDivElement>(null)

  function choose(key: Theme) {
    onChange(key)
    picker.current?.hidePopover()
    trigger.current?.focus({ preventScroll: true })
  }

  return <>
    <button type="button" className="palette-preview" ref={trigger} aria-label="Palette"
      aria-haspopup="dialog" popoverTarget={id} data-palette={value}>
      <Cubes colors={colors}/>
    </button>
    <div id={id} popover="auto" ref={picker} className="palette-picker" role="dialog" aria-label="Palette choices">
      {(Object.entries(options) as [Theme, string][]).map(([key, name]) =>
        <button type="button" key={key} aria-label={name} aria-pressed={value === key} onClick={() => choose(key)}>
          <Cubes colors={colorsFor(key, scheme)}/>
        </button>,
      )}
    </div>
  </>
}
