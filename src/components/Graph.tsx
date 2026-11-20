import { memo, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'
import { formatDate, layout } from '../lib/calendar.ts'
import { cellColor } from '../lib/themes.ts'
import type { Theme } from '../lib/themes.ts'
import { playInterfaceSound } from '../lib/brushSound.ts'
import { useCellPaint } from '../lib/useCellPaint.ts'
import type { PaintDelta } from '../lib/useCellPaint.ts'

const countFormat = new Intl.NumberFormat('en-US')
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface GraphProps {
  dates: string[]
  counts: number[]
  levels: number[]
  palette: string[]
  theme: Theme
  onPaint: (date: string, delta: PaintDelta, stroke: symbol) => void
  onInspect: (index?: number) => void
}

export const Graph = memo(function Graph({
  dates, counts, levels, palette, theme, onPaint, onInspect,
}: GraphProps) {
  const { cells, months, columns } = useMemo(() => layout(dates), [dates])
  const dateLabels = useMemo(() => dates.map(formatDate), [dates])
  const hovered = useRef<number | undefined>(undefined)
  const focused = useRef<number | undefined>(undefined)
  const [rangeStart, setRangeStart] = useState(dates[0])
  const buttons = useRef(new Map<string, HTMLButtonElement>())
  const tabDate = dates.includes(rangeStart) ? rangeStart : dates[0]
  const plotStyle = {
    '--weeks': columns,
  } as CSSProperties

  const cellsByDate = useMemo(() => new Map(dates.map((date, index) => [date, index])), [dates])

  function applyPaint(date: string, delta: PaintDelta, stroke: symbol) {
    const index = cellsByDate.get(date)
    if (index === undefined) return
    const count = counts[index] ?? 0
    if ((delta === -1 && count === 0) || (delta === 1 && count >= Number.MAX_SAFE_INTEGER)) return
    onPaint(date, delta, stroke)
    void playInterfaceSound(delta === 1 ? 'add' : 'remove')
  }

  const paint = useCellPaint(dates, true, applyPaint)

  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const offsets: Record<string, number> = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7 }
    const target = event.key === 'Home' ? 0 : event.key === 'End' ? dates.length - 1 : index + (offsets[event.key] ?? 0)
    if (target === index && !(event.key in offsets || event.key === 'Home' || event.key === 'End')) return
    event.preventDefault()
    buttons.current.get(dates[Math.max(0, Math.min(target, dates.length - 1))])?.focus()
  }

  return (
    <div className="graph-scroll" aria-label="Contribution calendar by date">
      <div className="plot" style={plotStyle}>
        {months.map(({ label, column }) => <span className="month" key={label}
          style={{ gridColumn: column + 2, gridRow: 1 }}>{label}</span>)}
        {weekdays.map((label, index) => <span className="weekday" key={label}
          style={{ gridColumn: 1, gridRow: index + 2 }}>{label}</span>)}
        {cells.map(({ date, column, row }, index) => {
          const count = counts[index] ?? 0
          const color = cellColor(theme, palette, count, levels[index] ?? 0)
          const style = {
            gridColumn: column + 2, gridRow: row + 2, '--cell-color': color,
          } as CSSProperties
          const label = countFormat.format(count) + (count === 1 ? ' planned commit on ' : ' planned commits on ') + dateLabels[index]
          return <button type="button" key={date} className="cell" style={style}
            ref={(element) => { if (element) buttons.current.set(date, element); else buttons.current.delete(date) }}
            tabIndex={tabDate === date ? 0 : -1} aria-label={label}
            onPointerDown={(event) => paint.start(date, event)}
            onPointerEnter={(event) => {
              if (event.pointerType !== 'touch') {
                hovered.current = index
                onInspect(index)
              }
              paint.enter(date, event)
            }}
            onPointerLeave={() => {
              hovered.current = undefined
              onInspect(focused.current)
              paint.leave(date)
            }}
            onContextMenu={(event) => event.preventDefault()}
            onFocus={(event) => {
              setRangeStart(date)
              focused.current = event.currentTarget.matches(':focus-visible') ? index : undefined
              onInspect(hovered.current ?? focused.current)
            }}
            onBlur={() => {
              focused.current = undefined
              onInspect(hovered.current)
            }}
            onClick={(event) => {
              const touch = event.nativeEvent instanceof PointerEvent && event.nativeEvent.pointerType === 'touch'
              if (event.detail === 0 || touch) applyPaint(date, 1, Symbol())
            }}
            onKeyDown={(event) => {
              if (['+', '=', '-'].includes(event.key)) {
                event.preventDefault()
                applyPaint(date, event.key === '-' ? -1 : 1, Symbol())
              } else navigate(event, index)
            }}>
          </button>
        })}
      </div>
    </div>
  )
})
