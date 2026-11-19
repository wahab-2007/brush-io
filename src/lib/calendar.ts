export const FIRST_YEAR = 2008

export const dateKey = (date: Date) => date.toISOString().slice(0, 10)
export const asDate = (date: string) => new Date(date + 'T00:00:00Z')
export const weekday = (date: string) => asDate(date).getUTCDay()

export function validCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

export function yearDates(year: number, today = dateKey(new Date())) {
  const result: string[] = []
  const day = asDate(year + '-01-01')
  while (day.getUTCFullYear() === year) {
    const key = dateKey(day)
    if (key > today) break
    result.push(key)
    day.setUTCDate(day.getUTCDate() + 1)
  }
  return result
}

const monthName = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' })
const longDate = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' })

export const formatDate = (date: string) => longDate.format(asDate(date))

export function layout(dates: readonly string[]) {
  const offset = dates.length ? weekday(dates[0]) : 0
  const cells = dates.map((date, index) => ({
    date,
    row: (index + offset) % 7,
    column: Math.floor((index + offset) / 7),
  }))
  const months = cells.filter(({ date }, index) => index === 0 || date.endsWith('-01'))
    .map(({ date, column }) => ({ column, label: monthName.format(asDate(date)) }))
  return { cells, months, columns: Math.ceil((dates.length + offset) / 7) }
}
