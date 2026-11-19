import { memo, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'
import { formatDate, layout } from '../lib/calendar.ts'
import { onColor } from '../lib/themes.ts'

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export interface Selection {
  date: string
  anchor: HTMLButtonElement
}

interface GraphProps {
  dates: string[]
  counts: number[]
  levels: number[]
  palette: string[]
  expanded: boolean
  opensEditor: boolean
  selected?: string
  onSelect: (selection: Selection) => void
}

export const Graph = memo(function Graph({
  dates, counts, levels, palette, expanded, opensEditor, selected, onSelect,
}: GraphProps) {
  const { cells, months, columns } = useMemo(() => layout(dates), [dates])
  const [focused, setFocused] = useState<string>()
  const [rangeStart, setRangeStart] = useState(dates[0])
  const buttons = useRef(new Map<string, HTMLButtonElement>())
  const tabDate = dates.includes(rangeStart) ? rangeStart : dates[0]
  const digits = counts.reduce((max, count) => Math.max(max, String(count).length), 1)
  const plotStyle = {
    '--weeks': columns,
    '--digits': digits,
  } as CSSProperties

  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const offsets: Record<string, number> = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7 }
    const target = event.key === 'Home' ? 0 : event.key === 'End' ? dates.length - 1 : index + (offsets[event.key] ?? 0)
    if (target === index && !(event.key in offsets || event.key === 'Home' || event.key === 'End')) return
    event.preventDefault()
    buttons.current.get(dates[Math.max(0, Math.min(target, dates.length - 1))])?.focus()
  }

  return (
    <>
      <div className="graph-scroll" aria-label="Contribution calendar by date">
        <div className={expanded ? 'plot expanded' : 'plot'} style={plotStyle}>
          {months.map(({ label, column }) => <span className="month" key={label}
            style={{ gridColumn: column + 2, gridRow: 1 }}>{label}</span>)}
          {weekdays.map((label, index) => <span className="weekday" key={label}
            style={{ gridColumn: 1, gridRow: index + 2 }}>{label}</span>)}
          {cells.map(({ date, column, row }, index) => {
            const count = counts[index] ?? 0
            const color = palette[levels[index] ?? 0]
            const style = {
              gridColumn: column + 2, gridRow: row + 2, '--cell-color': color, color: onColor(color),
            } as CSSProperties
            const label = count.toLocaleString('en-US') + (count === 1 ? ' planned commit on ' : ' planned commits on ') + formatDate(date)
            return <button type="button" key={date} className="cell" style={style}
              ref={(element) => { if (element) buttons.current.set(date, element); else buttons.current.delete(date) }}
              tabIndex={tabDate === date ? 0 : -1} aria-label={label}
              aria-haspopup={opensEditor ? 'dialog' : undefined} aria-expanded={opensEditor ? date === selected : undefined}
              title={label}
              onFocus={() => { setRangeStart(date); setFocused(date) }}
              onBlur={() => setFocused(undefined)}
              onClick={(event) => { onSelect({ date, anchor: event.currentTarget }) }}
              onKeyDown={(event) => navigate(event, index)}>
              {expanded && count > 0 ? count : null}
            </button>
          })}
        </div>
      </div>
      <div className="graph-footer">
        <span className="focus-caption" aria-hidden="true">
          {focused && !selected && dates.includes(focused)
            ? formatDate(focused) + ' · ' + (counts[dates.indexOf(focused)] ?? 0).toLocaleString('en-US')
            : null}
        </span>
        <div className="legend" aria-label="Contribution intensity from less to more">
          <span>Less</span>
          {palette.map((color, level) => <span key={level} className="legend-cell"
            style={{ background: color }} aria-hidden="true"/>)}
          <span>More</span>
        </div>
      </div>
    </>
  )
})
