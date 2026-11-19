import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Appearance } from './components/Appearance.tsx'
import { DayEditor } from './components/DayEditor.tsx'
import { Graph } from './components/Graph.tsx'
import type { Selection } from './components/Graph.tsx'
import { Icon } from './components/Icon.tsx'
import { PaletteSelect } from './components/PaletteSelect.tsx'
import { ToolbarPopover } from './components/ToolbarPopover.tsx'
import { fillAll, randomFill } from './lib/brushFill.ts'
import { playInterfaceSound } from './lib/brushSound.ts'
import { useInterfaceSounds } from './lib/useInterfaceSounds.ts'
import { FIRST_YEAR, yearDates } from './lib/calendar.ts'
import { summarize } from './lib/intensity.ts'
import { createPlan, generatePython } from './lib/pythonGenerator.ts'
import { deserialize, newHistory, readSession, redo, saveSession, serialize, setChanges, setCount, undo } from './lib/session.ts'
import { colorsFor, schemeFor } from './lib/themes.ts'
import type { SiteTheme, Theme } from './lib/themes.ts'

type Brush = 'manual' | '1' | '5' | '10' | 'custom'

const systemQuery = '(prefers-color-scheme: dark)'
const scriptName = 'github_contributions.py'

function recover(year?: number) {
  try {
    return readSession(window.localStorage, year)
  } catch {
    return null
  }
}

function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function App() {
  const currentYear = new Date().getUTCFullYear()
  const [initial] = useState(recover)
  const [year, setYear] = useState(initial?.year ?? currentYear)
  const [history, setHistory] = useState(() => newHistory(initial?.changes))
  const [mode, setMode] = useState<SiteTheme>('system')
  const [systemDark, setSystemDark] = useState(() => matchMedia(systemQuery).matches)
  const [theme, setTheme] = useState<Theme>('green')
  const [oddTheme, setOddTheme] = useState<Theme | 'same'>('same')
  const [brush, setBrush] = useState<Brush>('manual')
  const [customBrush, setCustomBrush] = useState('1')
  const [sound, setSound] = useState(true)
  const [density, setDensity] = useState(50)
  const [expanded, setExpanded] = useState(false)
  const [selection, setSelection] = useState<Selection>()
  const [notice, setNotice] = useState('')
  const [copyFallback, setCopyFallback] = useState<string>()
  const upload = useRef<HTMLInputElement>(null)
  const scheme = schemeFor(mode, systemDark)
  const palette = useMemo(() => colorsFor(theme, scheme), [theme, scheme])
  const oddPalette = useMemo(() => oddTheme === 'same' || oddTheme === theme ? undefined : colorsFor(oddTheme, scheme),
    [oddTheme, theme, scheme])
  const increment = Number(brush === 'custom' ? customBrush : brush)
  const canPaint = Number.isSafeInteger(increment) && increment > 0
  const currentDates = useMemo(() => yearDates(year), [year])
  const { counts, levels, total } = useMemo(() => summarize(currentDates, history.current), [currentDates, history.current])
  const years = Array.from({ length: currentYear - FIRST_YEAR + 1 }, (_, index) => currentYear - index)

  useInterfaceSounds(sound)

  useEffect(() => {
    const query = matchMedia(systemQuery)
    const change = (event: MediaQueryListEvent) => setSystemDark(event.matches)
    query.addEventListener('change', change)
    return () => query.removeEventListener('change', change)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.scheme = scheme
    document.documentElement.dataset.siteTheme = mode
  }, [scheme, mode])

  useEffect(() => {
    try {
      saveSession(localStorage, { year, changes: history.current })
    } catch {
      setNotice('Local storage is unavailable. Export your canvas to keep it.')
    }
  }, [year, history.current])

  const closeEditor = useCallback((focus: boolean) => {
    if (focus) selection?.anchor.focus()
    setSelection(undefined)
  }, [selection])

  function useBrush(cell: Selection) {
    if (brush === 'manual') {
      setSelection(cell)
      return
    }
    if (!canPaint) return
    setHistory((state) => {
      const count = state.current[cell.date] ?? 0
      return setCount(state, cell.date, Math.min(Number.MAX_SAFE_INTEGER, count + increment))
    })
  }

  function fillCanvas(pattern: 'random' | 'full') {
    const days = currentDates.map((date) => ({ date, originalCount: 0 }))
    if (pattern === 'random') {
      const randomized = randomFill(days, density)
      setHistory((state) => setChanges(state, randomized))
    } else {
      setHistory((state) => setChanges(state, fillAll(days, state.current)))
    }
    setSelection(undefined)
  }

  function changeYear(next: number) {
    setYear(next)
    setHistory(newHistory(recover(next)?.changes))
    setSelection(undefined)
    setCopyFallback(undefined)
    setNotice('')
  }

  async function importFile(file?: File) {
    if (!file) return
    try {
      if (file.size > 64_000) throw new Error('The canvas file is too large.')
      const imported = deserialize(await file.text())
      setYear(imported.year)
      setHistory(newHistory(imported.changes))
      setSelection(undefined)
      setCopyFallback(undefined)
      setNotice('Canvas imported.')
    } catch (error) {
      setNotice(error instanceof SyntaxError ? 'Choose a valid Brush IO canvas file.'
        : error instanceof Error ? error.message : 'Could not import the canvas.')
    }
  }

  async function exportScript(copy: boolean) {
    const plan = createPlan(currentDates, history.current)
    if (!plan.length) return
    const script = generatePython(plan)
    const formatted = total.toLocaleString('en-US') + (total === 1n ? ' commit' : ' commits')
    if (!copy) {
      download(scriptName, script, 'text/x-python;charset=utf-8')
      setNotice('Downloaded the Python script for ' + formatted + '.')
      return
    }
    try {
      await navigator.clipboard.writeText(script)
      setCopyFallback(undefined)
      setNotice('Copied the Python script for ' + formatted + '.')
    } catch {
      setCopyFallback(script)
      setNotice('Select and copy the script below.')
    }
  }

  return (
    <main className="app">
      <section className="workspace" aria-label="Contribution canvas">
        <div className="graph-section">
          <div className="view-bar">
            <div className="palette-controls">
              <PaletteSelect label="Palette" value={theme} scheme={scheme} colors={palette} onChange={setTheme}/>
              <PaletteSelect label="Odd months" value={oddTheme} scheme={scheme} colors={oddPalette ?? palette} sharedColors={palette} onChange={setOddTheme}/>
            </div>
            <div className="view-actions">
              <div className="segmented" role="group" aria-label="Calendar size">
                <button aria-pressed={!expanded} onClick={() => { setExpanded(false); setSelection(undefined) }}>Normal</button>
                <button aria-pressed={expanded} onClick={() => { setExpanded(true); setSelection(undefined) }}>Expanded</button>
              </div>
              <select aria-label="Year" value={year} onChange={(event) => changeYear(Number(event.target.value))}>
                {years.map((option) => <option key={option}>{option}</option>)}
              </select>
            </div>
          </div>

          <div className="graph-board">
            <Graph dates={currentDates} counts={counts} levels={levels} palette={palette} oddPalette={oddPalette} expanded={expanded}
              selected={selection?.date} opensEditor={brush === 'manual'} onSelect={useBrush}/>
          </div>
        </div>

        <div className="action-bar">
          <div className="history-actions" aria-label="Canvas history">
            <ToolbarPopover label="Tools">
              <label className="brush-control"><span>Brush</span>
                <select aria-label="Brush" value={brush} onChange={(event) => {
                  setBrush(event.target.value as Brush)
                  setSelection(undefined)
                }}>
                  <option value="manual">Edit count</option>
                  <option value="1">+1 per click</option>
                  <option value="5">+5 per click</option>
                  <option value="10">+10 per click</option>
                  <option value="custom">Custom amount</option>
                </select>
              </label>
              {brush === 'custom' && <label className="brush-control">
                <span>Add per click</span>
                <input type="number" min="1" step="1" value={customBrush} aria-invalid={!canPaint}
                  onChange={(event) => setCustomBrush(event.target.value)}/>
              </label>}
              <label className="brush-control density-control">
                <span>Density</span>
                <input aria-label="Random fill density" aria-valuetext={density + '%'} type="range" min="0" max="100"
                  value={density} onChange={(event) => setDensity(Number(event.target.value))}/>
                <span aria-hidden="true">{density}%</span>
              </label>
              <button type="button" onClick={() => fillCanvas('random')}>Randomize</button>
              <button type="button" onClick={() => fillCanvas('full')}>FILL ALL</button>
              <button type="button" aria-label="ASMR sound" aria-pressed={sound} onClick={() => {
                if (!sound) void playInterfaceSound('click')
                setSound(!sound)
              }}>Sound {sound ? 'on' : 'off'}</button>
            </ToolbarPopover>
            <button className="history-button" aria-label="Undo" title="Undo" disabled={!history.past.length} onClick={() => { setHistory(undo); setSelection(undefined) }}><Icon name="undo"/></button>
            <button className="history-button" aria-label="Redo" title="Redo" disabled={!history.future.length} onClick={() => { setHistory(redo); setSelection(undefined) }}><Icon name="redo"/></button>
            <button disabled={!total} onClick={() => {
              setHistory((state) => setChanges(state, {}))
              setSelection(undefined)
              setCopyFallback(undefined)
              setNotice('Canvas cleared.')
            }}>
              <Icon name="reset"/>Clear canvas
            </button>
          </div>
          <div className="file-actions">
            <input type="file" accept=".json,application/json" hidden ref={upload} onChange={(event) => {
              void importFile(event.target.files?.[0])
              event.target.value = ''
            }}/>
            <button onClick={() => upload.current?.click()}><Icon name="upload"/>Import canvas</button>
            <button onClick={() => download('brush-io-' + year + '.json', serialize({ year, changes: history.current }), 'application/json')}>
              <Icon name="download"/>Export canvas
            </button>
          </div>
          <div className="script-actions">
            <button disabled={!total} onClick={() => void exportScript(true)}><Icon name="copy"/>Copy Python</button>
            <button className="primary" disabled={!total} onClick={() => void exportScript(false)}><Icon name="code"/>Download Python</button>
            <Appearance theme={mode} onChange={setMode}/>
          </div>
        </div>
        <div className={notice ? 'notice' : 'notice visually-hidden'} role="status">{notice}</div>
        {copyFallback !== undefined && <div className="copy-panel">
          <div><label htmlFor="copy-script">Python script</label><button onClick={() => setCopyFallback(undefined)}>Close</button></div>
          <textarea id="copy-script" value={copyFallback} readOnly autoFocus onFocus={(event) => event.currentTarget.select()}/>
        </div>}
      </section>

      <footer className="site-credit">
        <a href="https://github.com/wahab-2007">Made by @wahab-2007</a>
      </footer>

      {selection && <DayEditor key={selection.date} selection={selection}
        count={history.current[selection.date] ?? 0} onUpdate={(count) => setHistory((state) => setCount(state, selection.date, count))}
        onClose={closeEditor}/>}
    </main>
  )
}
