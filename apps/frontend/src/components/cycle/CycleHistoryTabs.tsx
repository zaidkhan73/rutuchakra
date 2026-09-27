import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { localeTag } from '../../utils/date'
import type { CycleLog } from '../../utils/cycles'

function monthKey(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabelFromKey(key: string) {
  const [year, month] = key.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString(localeTag(), { month: 'long', year: 'numeric' })
}

function formatRange(log: CycleLog, t: (key: string) => string) {
  const start = new Date(log.startDate).toLocaleDateString(localeTag(), { day: 'numeric', month: 'short' })
  if (!log.endDate) return `${start} — ${t('cycleTracker.history.ongoing')}`
  const end = new Date(log.endDate).toLocaleDateString(localeTag(), { day: 'numeric', month: 'short' })
  return `${start} — ${end}`
}

export default function CycleHistoryTabs({
  logs,
  onEdit,
}: {
  logs: CycleLog[]
  onEdit: (log: CycleLog) => void
}) {
  const { t } = useTranslation()
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
    <div className="card bg-base-100 shadow-sm border border-base-300">
      <div className="card-body">
        <h2 className="kicker mb-3">{t('cycleTracker.history.title')}</h2>

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
              className="flex items-center justify-between px-4 py-3 rounded-xl bg-base-200 hover:bg-base-300 transition-colors text-left"
            >
              <span className="text-sm text-base-content">{formatRange(log, t)}</span>
              <span className="text-xs text-base-content/50">{t('cycleTracker.history.edit')}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}