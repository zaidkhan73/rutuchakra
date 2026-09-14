import { useState } from 'react'
import type { CycleLog } from '../../utils/cycles'

function monthKey(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabelFromKey(key: string) {
  const [year, month] = key.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

function formatRange(log: CycleLog) {
  const start = new Date(log.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  if (!log.endDate) return `${start} — Ongoing`
  const end = new Date(log.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  return `${start} — ${end}`
}

export default function CycleHistoryTabs({
  logs,
  onEdit,
}: {
  logs: CycleLog[]
  onEdit: (log: CycleLog) => void
}) {
  // Group logs by month, most recent month first, most recent entry first within each.
  const grouped = new Map<string, CycleLog[]>()
  for (const log of [...logs].reverse()) {
    const key = monthKey(log.startDate)
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(log)
  }
  const monthKeys = Array.from(grouped.keys()).sort().reverse()
  const [activeTab, setActiveTab] = useState(monthKeys[0] ?? '')

  if (monthKeys.length === 0) return null

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body">
        <h2 className="text-sm font-semibold text-base-content/70 mb-3">Logged cycles</h2>

        <div role="tablist" className="tabs tabs-boxed mb-4 flex-wrap">
          {monthKeys.map((key) => (
            <button
              key={key}
              role="tab"
              type="button"
              onClick={() => setActiveTab(key)}
              className={`tab ${activeTab === key ? 'tab-active' : ''}`}
            >
              {monthLabelFromKey(key)}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          {(grouped.get(activeTab) ?? []).map((log) => (
            <button
              key={log.id}
              type="button"
              onClick={() => onEdit(log)}
              className="flex items-center justify-between px-4 py-3 rounded-lg bg-base-200 hover:bg-base-300 transition-colors text-left"
            >
              <span className="text-sm text-base-content">{formatRange(log)}</span>
              <span className="text-xs text-base-content/50">Edit</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}