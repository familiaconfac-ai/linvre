/** Returns today's date as YYYY-MM-DD (UTC). */
export function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Converts any Date to YYYY-MM-DD (UTC). */
export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}
