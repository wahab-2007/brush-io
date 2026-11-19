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
  oddPalette?: string[]
  expanded: boolean
  opensEditor: boolean
  selected?: string
  onSelect: (selection: Selection) => void
}

export const Graph = memo(function Graph({
  dates, counts, levels, palette, oddPalette, expanded, opensEditor, selected, onSelect,
}: GraphProps) {
  const { cells, months, columns } = useMemo(() => layout(dates), [dates])
  const [hovered, setHovered] = useState<string>()
  const [focused, setFocused] = useState<string>()
  const [rangeStart, setRangeStart] = useState(dates[0])
  const buttons = useRef(new Map<string, HTMLButtonElement>())
  const tabDate = dates.includes(rangeStart) ? rangeStart : dates[0]
  const digits = counts.reduce((max, count) => Math.max(max, String(count).length), 1)
  const plotStyle = {
    '--weeks': columns,
    '--digits': digits,
  } as CSSProperties

  function cellColor(date: string, index: number) {
    const colors = oddPalette && Number(date.slice(5, 7)) % 2 === 1 ? oddPalette : palette
    return colors[levels[index] ?? 0]
  }

  const activeDate = hovered ?? focused
  const activeIndex = activeDate ? dates.indexOf(activeDate) : -1
  const activeCount = counts[activeIndex] ?? 0
  const activeColor = activeDate ? cellColor(activeDate, activeIndex) : palette[0]

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
            const color = cellColor(date, index)
            const style = {
              gridColumn: column + 2, gridRow: row + 2, '--cell-color': color, color: onColor(color),
            } as CSSProperties
            const label = count.toLocaleString('en-US') + (count === 1 ? ' planned commit on ' : ' planned commits on ') + formatDate(date)
            return <button type="button" key={date} className="cell" style={style}
              ref={(element) => { if (element) buttons.current.set(date, element); else buttons.current.delete(date) }}
              tabIndex={tabDate === date ? 0 : -1} aria-label={label}
              aria-haspopup={opensEditor ? 'dialog' : undefined} aria-expanded={opensEditor ? date === selected : undefined}
              onPointerEnter={(event) => { if (event.pointerType !== 'touch') setHovered(date) }}
              onPointerLeave={() => setHovered(undefined)}
              onFocus={(event) => {
                setRangeStart(date)
                if (event.currentTarget.matches(':focus-visible')) setFocused(date)
              }}
              onBlur={() => setFocused(undefined)}
              onClick={(event) => { onSelect({ date, anchor: event.currentTarget }) }}
              onKeyDown={(event) => navigate(event, index)}>
              {expanded && count > 0 ? count : null}
            </button>
          })}
        </div>
      </div>
      <div className="graph-footer">
        <div className="cell-readout" aria-hidden="true">
          {activeDate && activeIndex >= 0 && <>
            <span>{formatDate(activeDate)}</span>
            <span className="readout-number" style={{ color: activeColor, backgroundColor: onColor(activeColor) }}>
              {activeCount.toLocaleString('en-US')}
            </span>
            <span>{activeCount === 1 ? 'commit' : 'commits'}</span>
          </>}
        </div>
        <div className="graph-legends">
          <Legend colors={palette} months={oddPalette ? 'Even months' : undefined}/>
          {oddPalette && <Legend colors={oddPalette} months="Odd months"/>}
        </div>
      </div>
    </>
  )
})

function Legend({ colors, months }: { colors: string[]; months?: string }) {
  return <div className="legend" aria-label={months ? 'Contribution intensity for ' + months.toLowerCase() : 'Contribution intensity from less to more'}>
    {months && <span className="legend-months">{months}</span>}
    <span>Less</span>
    {colors.map((color) => <span key={color} className="legend-cell" style={{ background: color }} aria-hidden="true"/>)}
    <span>More</span>
  </div>
}
