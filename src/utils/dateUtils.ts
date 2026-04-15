/** Returns today's date as YYYY-MM-DD (UTC). */
export function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Converts any Date to YYYY-MM-DD (UTC). */
export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function fromDateKey(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`)
}

export function addDays(date: Date, amount: number): Date {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + amount)
  return next
}

export function eachDateInRange(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = []
  let cursor = fromDateKey(toDateKey(startDate))
  const last = fromDateKey(toDateKey(endDate))

  while (cursor.getTime() <= last.getTime()) {
    dates.push(new Date(cursor))
    cursor = addDays(cursor, 1)
  }

  return dates
}

export function dateAtTime(dateKey: string, time: string): Date {
  return new Date(`${dateKey}T${time}:00.000Z`)
}

export function startOfWeekKey(date: Date = new Date()): string {
  const utcDate = new Date(date)
  const day = utcDate.getUTCDay()
  const diff = utcDate.getUTCDate() - day + (day === 0 ? -6 : 1)
  utcDate.setUTCDate(diff)
  return toDateKey(utcDate)
}

export function endOfWeekKey(date: Date = new Date()): string {
  const startKey = startOfWeekKey(date)
  const startDate = fromDateKey(startKey)
  return toDateKey(addDays(startDate, 6))
}

export function startOfMonthKey(date: Date = new Date()): string {
  return toDateKey(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)))
}

export function endOfMonthKey(date: Date = new Date()): string {
  return toDateKey(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)))
}
