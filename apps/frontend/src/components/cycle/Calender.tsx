import { useState } from 'react'
import {
  getMonthGrid, isInCurrentMonth, isToday, isDateInRange, monthLabel, toISODate,
} from '../../utils/date'
import type { CycleLog } from '../../utils/cycles'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function findLogForDate(date: Date, logs: CycleLog[]): CycleLog | null {
  for (const log of logs) {
    const start = new Date(log.startDate)
    const end = log.endDate ? new Date(log.endDate) : start
    if (isDateInRange(date, start, end)) return log
  }
  return null
}

export default function Calendar({
  logs,
  onSelectDate,
}: {
  logs: CycleLog[]
  onSelectDate: (date: Date, existingLog: CycleLog | null) => void
}) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const grid = getMonthGrid(year, month)
  const isCurrentMonthView = year === today.getFullYear() && month === today.getMonth()

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11) } else { setMonth((m) => m - 1) }
  }
  function nextMonth() {
    if (isCurrentMonthView) return // can't navigate past the current month
    if (month === 11) { setYear((y) => y + 1); setMonth(0) } else { setMonth((m) => m + 1) }
  }

  function isFuture(date: Date) {
    return toISODate(date) > toISODate(today)
  }

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body">
        <div className="flex items-center justify-between mb-4">
          <button type="button" onClick={prevMonth} className="btn btn-ghost btn-sm">‹</button>
          <h2 className="font-semibold text-base-content">{monthLabel(year, month)}</h2>
          <button
            type="button"
            onClick={nextMonth}
            disabled={isCurrentMonthView}
            className="btn btn-ghost btn-sm disabled:opacity-30"
          >
            ›
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-base-content/50 mb-1">
          {WEEKDAYS.map((d, i) => <div key={i}>{d}</div>)}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {grid.map((date) => {
            const inMonth = isInCurrentMonth(date, year, month)
            const log = findLogForDate(date, logs)
            const todayCell = isToday(date)
            const future = isFuture(date)

            return (
              <button
                key={toISODate(date)}
                type="button"
                disabled={future}
                onClick={() => onSelectDate(date, log)}
                className={`aspect-square rounded-lg text-sm flex items-center justify-center transition-colors
                  ${!inMonth ? 'text-base-content/25' : 'text-base-content'}
                  ${log ? 'bg-accent/40 font-semibold' : future ? '' : 'hover:bg-base-200'}
                  ${todayCell ? 'ring-2 ring-primary ring-offset-1 ring-offset-base-100' : ''}
                  ${future ? 'text-base-content/20 cursor-not-allowed' : ''}`}
              >
                {date.getDate()}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}