import { useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { YearHeading } from './YearChart.tsx'

export type CalendarPosition = { year: number }

interface CalendarViewportProps {
  years: readonly number[]
  position: CalendarPosition
  activeYear: number
  onActivate: (year: number) => void
  renderYear: (year: number, active: boolean) => ReactNode
}

export function CalendarViewport({ years, position, activeYear, onActivate, renderYear }: CalendarViewportProps) {
  const viewport = useRef<HTMLDivElement>(null)
  const startIndex = Math.max(0, years.indexOf(position.year))
  const [first, setFirst] = useState(() => Math.min(startIndex, Math.max(0, years.length - 3)))
  const currentFirst = useRef(first)

  function updateFirst(next: number) {
    currentFirst.current = next
    setFirst(next)
  }

  useLayoutEffect(() => {
    const scroller = viewport.current
    const row = scroller?.firstElementChild
    if (!scroller || !row) return
    const height = row.getBoundingClientRect().height
    scroller.scrollTop = startIndex * height
    updateFirst(Math.floor((scroller.scrollTop + 0.75) / height))
  }, [position, startIndex, years.length])

  return <div className="calendar-viewport" ref={viewport} tabIndex={0} role="region" aria-label="Calendar years"
    onScroll={(event) => {
      if (event.target !== event.currentTarget) return
      const scroller = event.currentTarget
      const height = scroller.firstElementChild?.getBoundingClientRect().height
      if (!height) return
      const next = Math.min(years.length - 1, Math.floor((scroller.scrollTop + 0.75) / height))
      if (next === currentFirst.current) return
      updateFirst(next)
      onActivate(years[next])
    }}>
    {years.map((year, index) => <section className="calendar-year" key={year} aria-label={year + ' calendar'}>
      {index >= first - 1 && index <= first + 3
        ? renderYear(year, year === activeYear)
        : <YearHeading year={year} active={year === activeYear} onActivate={onActivate}/>}
    </section>)}
  </div>
}
