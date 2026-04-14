/** Returns today's date as YYYY-MM-DD (UTC). */
export function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Converts any Date to YYYY-MM-DD (UTC). */
export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function startOfWeekKey(date: Date = new Date()): string {
  const utcDate = new Date(date)
  const day = utcDate.getDay()
  const diff = utcDate.getDate() - day + (day === 0 ? -6 : 1)
  utcDate.setDate(diff)
  return toDateKey(utcDate)
}

export function endOfWeekKey(date: Date = new Date()): string {
  const startKey = startOfWeekKey(date)
  const startDate = new Date(startKey)
  startDate.setDate(startDate.getDate() + 6)
  return toDateKey(startDate)
}
