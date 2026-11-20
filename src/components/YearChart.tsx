import { useState } from 'react'
import type { ComponentProps } from 'react'
import { Graph } from './Graph.tsx'
import { cellColor, onColor } from '../lib/themes.ts'

export interface YearHeadingProps {
  year: number
  active: boolean
  onActivate: (year: number) => void
}

const countFormat = new Intl.NumberFormat('en-US')

export function YearHeading({ year, active, onActivate, count, color }: YearHeadingProps & {
  count?: number | bigint
  color?: string
}) {
  return <div className="year-rail">
    <h2 className="year-heading">
      <button type="button" className="year-marker" aria-pressed={active}
        onClick={() => onActivate(year)}>{year}</button>
    </h2>
    {count !== undefined && <output className="year-count" aria-live="off"
      aria-label={color ? 'Cell commits' : 'Total commits for ' + year}
      style={color ? { backgroundColor: color, color: onColor(color) } : undefined}>
      {countFormat.format(count)}
    </output>}
  </div>
}

export function YearChart({ year, active, onActivate, total, ...graph }: YearHeadingProps &
  Omit<ComponentProps<typeof Graph>, 'onInspect'> & { total?: bigint }) {
  const [inspected, setInspected] = useState<number>()
  const count = inspected === undefined ? undefined : graph.counts[inspected]
  const color = inspected === undefined || count === undefined
    ? undefined : cellColor(graph.theme, graph.palette, count, graph.levels[inspected] ?? 0)
  return <>
    <YearHeading year={year} active={active} onActivate={onActivate} count={count ?? total} color={color}/>
    <div className="year-grid">
      <Graph {...graph} onInspect={setInspected}/>
    </div>
  </>
}
