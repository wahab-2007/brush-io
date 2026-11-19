import script from './activityTemplate.ts'
import { dateKey, validCount } from './calendar.ts'
import type { Changes } from './intensity.ts'

export type Addition = [date: string, count: number]

export function createPlan(dates: readonly string[], changes: Changes, today = dateKey(new Date())) {
  const additions: Addition[] = []
  for (const date of dates) {
    const count = changes[date]
    if (date <= today && validCount(count) && count > 0) additions.push([date, count])
  }
  return additions
}

export function generatePython(additions: readonly Addition[]) {
  return script.replace('__CONTRIBUTION_PLAN__', () => JSON.stringify(additions))
}
