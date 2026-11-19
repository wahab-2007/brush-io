import { dateKey, FIRST_YEAR, validCount, yearDates } from './calendar.ts'
import type { Changes } from './intensity.ts'

export interface Session {
  year: number
  changes: Changes
}

export interface History {
  past: Changes[]
  current: Changes
  future: Changes[]
  stroke?: symbol
}

export const newHistory = (current: Changes = {}): History => ({ past: [], current, future: [] })

export function setChanges(history: History, current: Changes, stroke?: symbol): History {
  const keys = Object.keys(current)
  if (keys.length === Object.keys(history.current).length &&
      keys.every((date) => current[date] === history.current[date])) return history
  const past = stroke && stroke === history.stroke ? history.past : [...history.past, history.current]
  return { past, current, future: [], ...(stroke ? { stroke } : {}) }
}

export function setCount(history: History, date: string, count: number, stroke?: symbol): History {
  if (!validCount(count)) return history
  const next = { ...history.current }
  if (count === 0) delete next[date]
  else next[date] = count
  return setChanges(history, next, stroke)
}

export function undo({ past, current, future }: History): History {
  const previous = past.at(-1)
  return previous ? { past: past.slice(0, -1), current: previous, future: [current, ...future] }
    : { past, current, future }
}

export function redo({ past, current, future }: History): History {
  const next = future[0]
  return next ? { past: [...past, current], current: next, future: future.slice(1) }
    : { past, current, future }
}

export function serialize({ year, changes }: Session) {
  return JSON.stringify({ version: 1, year, counts: changes })
}

export function deserialize(raw: string, today = dateKey(new Date())): Session {
  if (raw.length > 64_000) throw new Error('The canvas file is too large.')
  const value = JSON.parse(raw)
  if (value?.version !== 1 || !Number.isInteger(value.year) || value.year < FIRST_YEAR ||
      value.year > Number(today.slice(0, 4)) || !value.counts ||
      typeof value.counts !== 'object' || Array.isArray(value.counts)) {
    throw new Error('Choose a valid Brush IO canvas file.')
  }
  const dates = new Set(yearDates(value.year, today))
  const changes: Changes = {}
  for (const [date, count] of Object.entries(value.counts)) {
    if (!dates.has(date) || !validCount(count)) throw new Error('The canvas contains an invalid date or count.')
    if (count > 0) changes[date] = count
  }
  return { year: value.year, changes }
}

const sessionKey = (year: number) => 'brush-io:v1:' + year
const activeKey = 'brush-io:v1:active-year'

export function saveSession(storage: Pick<Storage, 'setItem'>, session: Session) {
  storage.setItem(sessionKey(session.year), serialize(session))
  storage.setItem(activeKey, String(session.year))
}

export function readSession(storage: Pick<Storage, 'getItem'>, year?: number, today?: string) {
  const stored = storage.getItem(sessionKey(year ?? Number(storage.getItem(activeKey))))
  if (!stored) return null
  const session = deserialize(stored, today)
  return year === undefined || year === session.year ? session : null
}
