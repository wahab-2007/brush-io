import { useId, useRef } from 'react'
import { colorsFor, paletteGroups } from '../lib/themes.ts'
import type { Scheme, Theme } from '../lib/themes.ts'

interface PaletteSelectProps<T extends Theme | 'same'> {
  label: string
  value: T
  colors: string[]
  sharedColors?: string[]
  scheme: Scheme
  onChange: (palette: T) => void
}

const options = Object.assign({}, ...Object.values(paletteGroups)) as Record<Theme, string>

function Cubes({ colors, linked }: { colors: string[]; linked?: boolean }) {
  return <span className="palette-cubes" aria-hidden="true">
    {linked && <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M10 13a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1m2 6a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1"/>
    </svg>}
    {colors.map((color) => <span style={{ backgroundColor: color }} key={color}/>)}
  </span>
}

export function PaletteSelect<T extends Theme | 'same'>({ label, value, colors, sharedColors, scheme, onChange }: PaletteSelectProps<T>) {
  const id = useId()
  const trigger = useRef<HTMLButtonElement>(null)
  const picker = useRef<HTMLDivElement>(null)

  function choose(key: Theme | 'same') {
    onChange(key as T)
    picker.current?.hidePopover()
    trigger.current?.focus({ preventScroll: true })
  }

  return <div className="palette-control">
    <span>{label}</span>
    <button type="button" className="palette-preview" ref={trigger} aria-label={label}
      aria-haspopup="dialog" popoverTarget={id} data-palette={value}>
      <Cubes colors={colors} linked={value === 'same'}/>
    </button>
    <div id={id} popover="auto" ref={picker} className="palette-picker" role="dialog" aria-label={label + ' choices'}>
      {sharedColors && <button type="button" aria-label="Same palette" aria-pressed={value === 'same'} onClick={() => choose('same')}>
        <Cubes colors={sharedColors} linked/>
      </button>}
      {(Object.entries(options) as [Theme, string][]).map(([key, name]) =>
        <button type="button" key={key} aria-label={name} aria-pressed={value === key} onClick={() => choose(key)}>
          <Cubes colors={colorsFor(key, scheme)}/>
        </button>,
      )}
    </div>
  </div>
}
