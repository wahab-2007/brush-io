import { useState } from 'react'
import type { FormEvent } from 'react'
import { ToolbarPopover } from './ToolbarPopover.tsx'
import { paletteGroups } from '../lib/themes.ts'
import type { Theme } from '../lib/themes.ts'

type PresetSnapshot = {
  canvas: string
  theme: Theme
  oddTheme: Theme | 'same'
  expanded: boolean
}

type Preset = PresetSnapshot & { name: string }
const storageKey = 'brush-io:presets:v1'
const chartThemes = new Set(Object.values(paletteGroups).flatMap((group) => Object.keys(group)))

function isPreset(value: unknown): value is Preset {
  if (!value || typeof value !== 'object') return false
  const preset = value as Partial<Preset>
  return typeof preset.name === 'string' && preset.name.length > 0 && preset.name.length <= 60 &&
    typeof preset.canvas === 'string' && chartThemes.has(preset.theme ?? '') &&
    (preset.oddTheme === 'same' || chartThemes.has(preset.oddTheme ?? '')) && typeof preset.expanded === 'boolean'
}

function readPresets(): Preset[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(storageKey) || '[]')
    return Array.isArray(data) ? data.filter(isPreset) : []
  } catch {
    return []
  }
}

interface PresetsProps {
  canSave: boolean
  capture: () => PresetSnapshot
  restore: (snapshot: PresetSnapshot) => void
}

export function Presets({ canSave, capture, restore }: PresetsProps) {
  const [presets, setPresets] = useState(readPresets)
  const [selected, setSelected] = useState('')
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const active = presets.find((preset) => preset.name === selected)

  function persist(next: Preset[]) {
    localStorage.setItem(storageKey, JSON.stringify(next))
    setPresets(next)
  }

  function save(event: FormEvent) {
    event.preventDefault()
    if (!canSave) return
    const title = name.trim()
    if (!title) return
    const previous = readPresets()
    if (previous.some((preset) => preset.name.toLowerCase() === title.toLowerCase())) {
      setMessage('A preset already uses that name. Choose a different name.')
      return
    }
    try {
      persist([...previous, { ...capture(), name: title }])
      setSelected(title)
      setName('')
      setMessage('Preset saved.')
    } catch {
      setMessage('Could not save the preset in this browser.')
    }
  }

  function load() {
    if (!active) return
    try {
      restore(active)
      setMessage('Preset loaded.')
    } catch {
      setMessage('This preset could not be loaded.')
    }
  }

  function remove() {
    if (!active) return
    try {
      persist(readPresets().filter((preset) => preset.name !== selected))
      setSelected('')
      setMessage('Preset deleted.')
    } catch {
      setMessage('Could not delete the preset.')
    }
  }

  return <ToolbarPopover label="Presets">
    <form className="preset-row" onSubmit={save}>
      <input aria-label="Preset name" placeholder="Preset name" value={name} maxLength={60}
        onChange={(event) => setName(event.target.value)} disabled={!canSave}/>
      <button type="submit" disabled={!canSave || !name.trim()}>Save</button>
    </form>
    <div className="preset-row">
      <select aria-label="Saved presets" value={selected} onChange={(event) => {
        setSelected(event.target.value)
        setMessage('')
      }}>
        <option value="">Saved presets</option>
        {presets.map((preset) => <option key={preset.name}>{preset.name}</option>)}
      </select>
      <button type="button" onClick={load} disabled={!active}>Load</button>
      <button type="button" onClick={remove} disabled={!active}>Delete</button>
    </div>
    {message && <p className="preset-status" role="status">{message}</p>}
  </ToolbarPopover>
}
