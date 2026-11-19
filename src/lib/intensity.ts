export type Changes = Record<string, number>

export function contributionLevels(counts: readonly number[]) {
  const positive = counts.filter((count) => count > 0).sort((a, b) => a - b)
  const byCount = new Map<number, number>()
  // Rank ties at their shared midpoint, so identical counts always get identical levels.
  for (let start = 0; start < positive.length;) {
    let end = start + 1
    while (positive[end] === positive[start]) end++
    const quantile = (start + end) / (2 * positive.length)
    byCount.set(positive[start], positive.length === 1 ? 4 : 1 + Math.floor(4 * quantile))
    start = end
  }
  return counts.map((count) => byCount.get(count) ?? 0)
}

export function summarize(dates: readonly string[], changes: Changes) {
  const counts = dates.map((date) => changes[date] ?? 0)
  return {
    counts,
    levels: contributionLevels(counts),
    total: counts.reduce((total, count) => total + BigInt(count), 0n),
  }
}
