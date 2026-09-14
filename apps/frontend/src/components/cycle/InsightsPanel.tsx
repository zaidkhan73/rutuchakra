import type { CycleInsights } from '../../utils/cycles'

const TREND_LABEL: Record<CycleInsights['regularityTrend'], string> = {
  regular: 'Regular',
  irregular: 'Irregular',
  mixed: 'Mixed',
  not_enough_data: 'Not enough data yet',
}

const TREND_CLASS: Record<CycleInsights['regularityTrend'], string> = {
  regular: 'text-success',
  irregular: 'text-error',
  mixed: 'text-warning',
  not_enough_data: 'text-base-content/50',
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function InsightsPanel({ insights }: { insights: CycleInsights }) {
  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body">
        <h2 className="text-sm font-semibold text-base-content/70 mb-2">Your tracking summary</h2>

        {insights.regularityTrend === 'not_enough_data' ? (
          <p className="text-sm text-base-content/60">
            Log a couple more cycles to start seeing patterns here.
          </p>
        ) : (
          <div className="stats stats-vertical bg-transparent shadow-none">
            <div className="stat px-0 py-3">
              <div className="stat-title text-xs">Average cycle length</div>
              <div className="stat-value text-2xl text-base-content">
                {insights.avgCycleLength ?? '—'} <span className="text-sm font-normal">days</span>
              </div>
            </div>
            <div className="stat px-0 py-3">
              <div className="stat-title text-xs">Regularity trend</div>
              <div className={`stat-value text-2xl ${TREND_CLASS[insights.regularityTrend]}`}>
                {TREND_LABEL[insights.regularityTrend]}
              </div>
            </div>
            <div className="stat px-0 py-3">
              <div className="stat-title text-xs">Most recent cycle</div>
              <div className="stat-value text-lg text-base-content">
                {formatDate(insights.mostRecentStart)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}