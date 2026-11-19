import { useEffect, useMemo, useState } from 'react'
import { Appearance } from './components/Appearance.tsx'
import { Graph } from './components/Graph.tsx'
import { Icon } from './components/Icon.tsx'
import { PaletteSelect } from './components/PaletteSelect.tsx'
import { useInterfaceSounds } from './lib/useInterfaceSounds.ts'
import type { PaintDelta } from './lib/useCellPaint.ts'
import { FIRST_YEAR, yearDates } from './lib/calendar.ts'
import { summarize } from './lib/intensity.ts'
import { createPlan, generatePython } from './lib/pythonGenerator.ts'
import { newHistory, readSession, redo, saveSession, setChanges, setCount, undo } from './lib/session.ts'
import { colorsFor, schemeFor } from './lib/themes.ts'
import { useAppearancePreferences } from './lib/useAppearancePreferences.ts'


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
  const [{ mode, theme, oddTheme }, setAppearance] = useAppearancePreferences()
  const [systemDark, setSystemDark] = useState(() => matchMedia(systemQuery).matches)
  const [expanded, setExpanded] = useState(false)
  const [notice, setNotice] = useState('')
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
      setNotice('Local storage is unavailable. Your canvas may not survive a reload.')
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
    setNotice('')
  }

  function exportScript() {
    const plan = createPlan(currentDates, history.current)
    if (plan.length) download(scriptName, generatePython(plan), 'text/x-python;charset=utf-8')
  }

  return (
    <main className="app">
      <section className="workspace" aria-label="Contribution canvas">
        <div className="graph-section">
          <div className="view-bar">
            <div className="palette-controls">
              <PaletteSelect label="Palette" value={theme} scheme={scheme} colors={palette} onChange={(theme) => setAppearance((current) => ({ ...current, theme }))}/>
              <PaletteSelect label="Odd months" value={oddTheme} scheme={scheme} colors={oddPalette ?? palette} sharedColors={palette} onChange={(oddTheme) => setAppearance((current) => ({ ...current, oddTheme }))}/>
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
            <button className="history-button" aria-label="Clear canvas" title="Clear canvas" disabled={!total} onClick={() => {
              setHistory((state) => setChanges(state, {}))
            }}>
              <Icon name="close"/>
            </button>
          </div>
          <div className="script-actions">
            <button className="primary" disabled={!total} onClick={exportScript}><Icon name="code"/>Script</button>
            <Appearance theme={mode} onChange={(mode) => setAppearance((current) => ({ ...current, mode }))}/>
          </div>
        </div>
        {notice && <div className="notice" role="alert">{notice}</div>}
      </section>

      <footer className="site-credit">
        <a href="https://github.com/wahab-2007">Made by @wahab-2007</a>
      </footer>

    </main>
  )
}
