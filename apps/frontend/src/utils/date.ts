export function toISODate(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isSameDay(a: Date, b: Date): boolean {
  return toISODate(a) === toISODate(b)
}

export function isToday(d: Date): boolean {
  return isSameDay(d, new Date())
}

// Returns a 6x7 grid of Date objects covering the full month plus leading/trailing
// days from adjacent months, so the grid always has complete weeks.
export function getMonthGrid(year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month, 1)
  const startOffset = firstOfMonth.getDay() // 0 = Sunday
  const gridStart = new Date(year, month, 1 - startOffset)

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    return d
  })
}

export function isInCurrentMonth(d: Date, year: number, month: number): boolean {
  return d.getFullYear() === year && d.getMonth() === month
}

export function isDateInRange(d: Date, start: Date, end: Date): boolean {
  const day = toISODate(d)
  return day >= toISODate(start) && day <= toISODate(end)
}

export function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}