import { useNavigate } from 'react-router-dom'
import type { HistoryEntry } from '../../utils/pcos'

const BADGE_CLASS = {
  Low: 'badge-success',
  Moderate: 'badge-warning',
  High: 'badge-error',
} as const

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function HistoryListItem({ entry }: { entry: HistoryEntry }) {
  const navigate = useNavigate()
  const pct = Math.round(entry.probability * 100)

  return (
    <div className="card bg-base-100 shadow-sm border border-base-300">
      <div className="card-body p-4 flex-row items-center justify-between">
        <div>
          <p className="text-sm text-base-content/60">{formatDate(entry.createdAt)}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-lg font-bold text-base-content tabular-nums">{pct}%</span>
            <span className={`badge badge-sm ${BADGE_CLASS[entry.risk_level]}`}>{entry.risk_level}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/history/${entry.id}`)}
          className="btn btn-outline btn-sm"
        >
          View
        </button>
      </div>
    </div>
  )
}