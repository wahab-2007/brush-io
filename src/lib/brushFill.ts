import type { Changes } from './intensity.ts'

interface FillDay {
  date: string
  originalCount: number
}

export function randomFill(days: readonly FillDay[], density: number, random = Math.random): Changes {
  const changes: Changes = {}
  for (const { date, originalCount } of days) {
    if (originalCount < Number.MAX_SAFE_INTEGER && random() * 100 < density) {
      const addition = 1 + Math.floor(random() * 8)
      changes[date] = Math.min(Number.MAX_SAFE_INTEGER, originalCount + addition)
    }
  }
  return changes
}

export function fillAll(days: readonly FillDay[], current: Changes): Changes {
  const changes = { ...current }
  for (const { date, originalCount } of days) {
    const count = current[date] ?? originalCount
    const next = Math.min(Number.MAX_SAFE_INTEGER, count + 1)
    if (next === originalCount) delete changes[date]
    else changes[date] = next
  }
  return changes
}
