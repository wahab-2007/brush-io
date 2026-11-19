import { useEffect, useMemo, useRef, useState } from 'react'
import { Appearance } from './components/Appearance.tsx'
import { Graph } from './components/Graph.tsx'
import { Icon } from './components/Icon.tsx'
import { PaletteSelect } from './components/PaletteSelect.tsx'
import { useInterfaceSounds } from './lib/useInterfaceSounds.ts'
import type { PaintDelta } from './lib/useCellPaint.ts'
import { FIRST_YEAR, yearDates } from './lib/calendar.ts'
import { summarize } from './lib/intensity.ts'
import { createPlan, generatePython } from './lib/pythonGenerator.ts'
import { deserialize, newHistory, readSession, redo, saveSession, serialize, setChanges, setCount, undo } from './lib/session.ts'
import { colorsFor, schemeFor } from './lib/themes.ts'
import type { SiteTheme, Theme } from './lib/themes.ts'


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
  const [expanded, setExpanded] = useState(false)
  const [notice, setNotice] = useState('')
  const [copyFallback, setCopyFallback] = useState<string>()
  const upload = useRef<HTMLInputElement>(null)
  const scheme = schemeFor(mode, systemDark)
  const palette = useMemo(() => colorsFor(theme, scheme), [theme, scheme])
  const oddPalette = useMemo(() => oddTheme === 'same' || oddTheme === theme ? undefined : colorsFor(oddTheme, scheme),
    [oddTheme, theme, scheme])
  const currentDates = useMemo(() => yearDates(year), [year])
  const { counts, levels, total } = useMemo(() => summarize(currentDates, history.current), [currentDates, history.current])
  const years = Array.from({ length: currentYear - FIRST_YEAR + 1 }, (_, index) => currentYear - index)

  useInterfaceSounds()

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

  function paintCell(date: string, delta: PaintDelta, stroke: symbol) {
    setHistory((state) => {
      const count = state.current[date] ?? 0
      return setCount(state, date, Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, count + delta)), stroke)
    })
  }

  function changeYear(next: number) {
    setYear(next)
    setHistory(newHistory(recover(next)?.changes))
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
                <button aria-pressed={!expanded} onClick={() => { setExpanded(false) }}>Normal</button>
                <button aria-pressed={expanded} onClick={() => { setExpanded(true) }}>Expanded</button>
              </div>
              <select aria-label="Year" value={year} onChange={(event) => changeYear(Number(event.target.value))}>
                {years.map((option) => <option key={option}>{option}</option>)}
              </select>
            </div>
          </div>

          <div className="graph-board">
            <Graph dates={currentDates} counts={counts} levels={levels} palette={palette} oddPalette={oddPalette} expanded={expanded}
              onPaint={paintCell}/>
          </div>
        </div>

        <div className="action-bar">
          <div className="history-actions" aria-label="Canvas history">
            <button className="history-button" aria-label="Undo" title="Undo" disabled={!history.past.length} onClick={() => { setHistory(undo) }}><Icon name="undo"/></button>
            <button className="history-button" aria-label="Redo" title="Redo" disabled={!history.future.length} onClick={() => { setHistory(redo) }}><Icon name="redo"/></button>
            <button disabled={!total} onClick={() => {
              setHistory((state) => setChanges(state, {}))
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

    </main>
  )
}
