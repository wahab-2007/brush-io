import assert from 'node:assert/strict'
import { test } from 'node:test'
import { colorsFor, paletteGroups, schemeFor } from '../src/lib/themes.ts'
import type { Theme } from '../src/lib/themes.ts'
import { fillAll, randomFill } from '../src/lib/brushFill.ts'
import { layout, yearDates } from '../src/lib/calendar.ts'
import { summarize } from '../src/lib/intensity.ts'
import { createPlan, generatePython } from '../src/lib/pythonGenerator.ts'
import { deserialize, newHistory, readSession, redo, saveSession, serialize, setChanges, setCount, undo } from '../src/lib/session.ts'

const today = '2026-11-19'
const dates = yearDates(2026, today)

test('the canvas starts blank with real UTC dates and a seven-day grid', () => {
  const { cells } = layout(dates)
  assert.deepEqual(cells[0], { date: '2026-01-01', row: 4, column: 0 })
  assert.deepEqual(cells[3], { date: '2026-01-04', row: 0, column: 1 })
  assert.equal(yearDates(2024, today).length, 366)
  assert.equal(dates.at(-1), today)
  assert.equal(summarize(dates, {}).total, 0n)
  assert.deepEqual(createPlan(dates, {}, today), [])
})

test('editing recalculates the canvas and supports undo, redo and reset', () => {
  const first = setCount(newHistory(), today, 12)
  const second = setCount(first, '2026-11-18', 61)
  assert.deepEqual(summarize(dates, second.current).counts.slice(-2), [61, 12])
  assert.equal(summarize(dates, second.current).total, 73n)
  assert.deepEqual(summarize(dates, first.current).levels.slice(-2), [0, 4])
  assert.deepEqual(summarize(dates, second.current).levels.slice(-2), [4, 2])
  assert.deepEqual(undo(second).current, first.current)
  assert.deepEqual(redo(undo(second)), second)
  assert.deepEqual(setCount(first, today, 0).current, {})
  assert.deepEqual(setChanges(second, {}).current, {})
})

test('storage and JSON accept only valid canvas counts for the selected year', () => {
  const items = new Map<string, string>()
  const storage = { getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => items.set(key, value) }
  const canvas = { year: 2026, changes: { [today]: 100 } }
  saveSession(storage, canvas)
  saveSession(storage, { year: 2025, changes: {} })
  assert.deepEqual(readSession(storage, undefined, today), { year: 2025, changes: {} })
  assert.deepEqual(readSession(storage, 2026, today), canvas)
  assert.deepEqual(deserialize(serialize(canvas), today), canvas)
  for (const raw of [
    '{"version":1,"year":2026,"counts":{"__proto__":12}}',
    '{"version":1,"year":2026,"counts":{"2026-11-20":1}}',
    '{"version":1,"year":2026,"counts":{"2026-11-19":-2}}',
    '{"version":1,"year":2026,"counts":{"2025-11-19":1}}',
    '{"version":1,"username":"someone","year":2026,"days":[]}',
  ]) assert.throws(() => deserialize(raw, today))
})

test('script plans preserve exact positive counts and exclude future dates', () => {
  const additions = createPlan([...dates, '2026-11-20'], { [today]: 98, '2026-11-20': 3, '2026-11-18': 0 }, today)
  assert.deepEqual(additions, [[today, 98]])
  assert.match(generatePython(additions), /PLAN = \[\["2026-11-19",98\]\]/)
})

test('random and full fills preserve the baseline and can be undone as a single edit', () => {
  const days = [
    { date: '2025-01-01', originalCount: 0 },
    { date: '2025-01-02', originalCount: 10 },
    { date: '2025-01-03', originalCount: Number.MAX_SAFE_INTEGER },
  ]
  assert.deepEqual(randomFill(days, 0, () => 0), {})
  assert.deepEqual(randomFill(days, 100, () => 0.5), { '2025-01-01': 5, '2025-01-02': 15 })
  let index = 0
  const samples = [0.1, 0.8, 0.6]
  assert.deepEqual(randomFill(days, 50, () => samples[index++]), { '2025-01-01': 7 })
  const before = { '2025-01-02': 0 }
  const filled = fillAll(days, before)
  assert.deepEqual(filled, { '2025-01-01': 1, '2025-01-02': 1 })
  assert.deepEqual(fillAll(days, { '2025-01-01': 7 }), { '2025-01-01': 8, '2025-01-02': 11 })
  assert.deepEqual(fillAll(days, { '2025-01-02': 9 }), { '2025-01-01': 1 })
  assert.deepEqual(undo(setChanges(newHistory(before), filled)).current, before)
})

test('chart palettes stay distinct under independent site themes', () => {
  const themes = Object.values(paletteGroups).flatMap((group) => Object.keys(group)) as Theme[]
  assert.equal(new Set(themes).size, 17)
  for (const theme of themes) {
    const light = colorsFor(theme, schemeFor('paper', false))
    const dark = colorsFor(theme, schemeFor('disco', false))
    assert.equal(new Set(light).size, 5)
    assert.equal(new Set(dark).size, 5)
    assert.notDeepEqual(light, dark)
  }
  assert.deepEqual(colorsFor('blackWhite', 'light'), ['#ffffff', '#cccccc', '#888888', '#444444', '#000000'])
})
