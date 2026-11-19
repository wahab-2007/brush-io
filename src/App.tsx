import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Appearance } from './components/Appearance.tsx'
import { Graph } from './components/Graph.tsx'
import { CalendarToolbar } from './components/CalendarToolbar.tsx'
import { CalendarViewport } from './components/CalendarViewport.tsx'
import { PaletteSelect } from './components/PaletteSelect.tsx'
import { useInterfaceSounds } from './lib/useInterfaceSounds.ts'
import type { PaintDelta } from './lib/useCellPaint.ts'
import { FIRST_YEAR, yearDates } from './lib/calendar.ts'
import { summarize } from './lib/intensity.ts'
import { createPlan, generatePython } from './lib/pythonGenerator.ts'
import { newHistory, readSession, redo, rememberYear, saveSession, setChanges, setCount, undo } from './lib/session.ts'
import type { History } from './lib/session.ts'
import type { Changes } from './lib/intensity.ts'
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

const currentYear = new Date().getUTCFullYear()
const years = Array.from({ length: currentYear - FIRST_YEAR + 1 }, (_, index) => currentYear - index)

const YearGraph = memo(function YearGraph({ year, changes, palette, paint }: {
  year: number
  changes: Changes
  palette: string[]
  paint: (date: string, delta: PaintDelta, stroke: symbol) => void
}) {
  const dates = useMemo(() => yearDates(year), [year])
  const { counts, levels } = useMemo(() => summarize(dates, changes), [dates, changes])
  return <Graph dates={dates} counts={counts} levels={levels} palette={palette} onPaint={paint}/>
})

export default function App() {
  const [position] = useState(() => ({ year: recover()?.year ?? currentYear }))
  const [year, setYear] = useState(position.year)
  const [histories, setHistories] = useState<Record<number, History>>(() =>
    Object.fromEntries(years.map((item) => [item, newHistory(recover(item)?.changes)])))
  const persisted = useRef(histories)
  const history = histories[year]
  const [{ mode, theme }, setAppearance] = useAppearancePreferences()
  const [systemDark, setSystemDark] = useState(() => matchMedia(systemQuery).matches)
  const [notice, setNotice] = useState('')
  const scheme = schemeFor(mode, systemDark)
  const palette = useMemo(() => colorsFor(theme, scheme), [theme, scheme])

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
      for (const item of years) {
        if (histories[item].current !== persisted.current[item].current) {
          saveSession(localStorage, { year: item, changes: histories[item].current }, false)
        }
      }
      rememberYear(localStorage, year)
      persisted.current = histories
      setNotice('')
    } catch {
      setNotice('Local storage is unavailable. Your canvas may not survive a reload.')
    }
  }, [year, histories])

  const edit = useCallback((target: number, update: (history: History) => History) => {
    setHistories((current) => {
      const previous = current[target]
      const next = update(previous)
      return next === previous ? current : { ...current, [target]: next }
    })
  }, [])

  const paintCell = useCallback((date: string, delta: PaintDelta, stroke: symbol) => {
    const target = Number(date.slice(0, 4))
    setYear(target)
    edit(target, (state) => {
      const count = state.current[date] ?? 0
      return setCount(state, date, Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, count + delta)), stroke)
    })
  }, [edit])

  const additions = Object.keys(history.current).length > 0

  function exportScript() {
    const plan = createPlan(yearDates(year), history.current)
    if (plan.length) download(scriptName, generatePython(plan), 'text/x-python;charset=utf-8')
  }

  return (
    <main className="app">
      <CalendarToolbar year={year}
        canUndo={!!history.past.length} canRedo={!!history.future.length} canClear={additions} canDownload={additions}
        onUndo={() => edit(year, undo)} onRedo={() => edit(year, redo)}
        onClear={() => edit(year, (state) => setChanges(state, {}))} onDownload={exportScript}
        palette={<PaletteSelect value={theme} scheme={scheme} colors={palette} onChange={(theme) => setAppearance((current) => ({ ...current, theme }))}/>}
        appearance={<Appearance theme={mode} onChange={(mode) => setAppearance((current) => ({ ...current, mode }))}/>}/>

      <section className="workspace" aria-label="Contribution canvas">
        <div className="graph-section">
          <CalendarViewport years={years} activeYear={year} position={position} onActivate={setYear}
            renderYear={(item) => <YearGraph year={item} changes={histories[item].current} palette={palette} paint={paintCell}/>}/>
        </div>
        {notice && <div className="notice" role="alert">{notice}</div>}
      </section>

      <footer className="site-credit">
        <a href="https://github.com/wahab-2007">Made by @wahab-2007</a>
      </footer>
    </main>
  )
}
