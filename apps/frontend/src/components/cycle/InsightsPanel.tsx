import { useTranslation } from 'react-i18next'
import { localeTag } from '../../utils/date'
import type { CycleInsights } from '../../utils/cycles'

const TREND_KEY: Record<CycleInsights['regularityTrend'], string> = {
  regular: 'cycleTracker.trend.regular',
  irregular: 'cycleTracker.trend.irregular',
  mixed: 'cycleTracker.trend.mixed',
  not_enough_data: 'cycleTracker.trend.notEnoughData',
}

const TREND_CLASS: Record<CycleInsights['regularityTrend'], string> = {
  regular: 'text-success',
  irregular: 'text-error',
  mixed: 'text-warning',
  not_enough_data: 'text-base-content/50',
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(localeTag(), { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function InsightsPanel({ insights }: { insights: CycleInsights }) {
  const { t } = useTranslation()
  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body">
        <h2 className="text-sm font-semibold text-base-content/70 mb-2">{t('cycleTracker.insights.summaryTitle')}</h2>

        {insights.regularityTrend === 'not_enough_data' ? (
          <p className="text-sm text-base-content/60">
            {t('cycleTracker.insights.needMoreData')}
          </p>
        ) : (
          <div className="stats stats-vertical bg-transparent shadow-none">
            <div className="stat px-0 py-3">
              <div className="stat-title text-xs">{t('cycleTracker.insights.avgCycleLength')}</div>
              <div className="stat-value text-2xl text-base-content">
                {insights.avgCycleLength ?? '—'} <span className="text-sm font-normal">{t('cycleTracker.insights.days')}</span>
              </div>
            </div>
            <div className="stat px-0 py-3">
              <div className="stat-title text-xs">{t('cycleTracker.insights.regularityTrend')}</div>
              <div className={`stat-value text-2xl ${TREND_CLASS[insights.regularityTrend]}`}>
                {t(TREND_KEY[insights.regularityTrend])}
              </div>
            </div>
            <div className="stat px-0 py-3">
              <div className="stat-title text-xs">{t('cycleTracker.insights.mostRecentCycle')}</div>
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