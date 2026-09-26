import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceArea, Cell,
} from 'recharts'
import { useTranslation } from 'react-i18next'
import { localeTag } from '../../utils/date'
import type { CycleLog } from '../../utils/cycles'

interface LengthPoint {
  label: string
  days: number
  regular: boolean
}

function computeLengths(logs: CycleLog[]): LengthPoint[] {
  const sorted = [...logs].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
  const points: LengthPoint[] = []
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].startDate)
    const curr = new Date(sorted[i].startDate)
    const days = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24))
    const prevLabel = prev.toLocaleDateString(localeTag(), { day: 'numeric', month: 'short' })
    const currLabel = curr.toLocaleDateString(localeTag(), { day: 'numeric', month: 'short' })
    points.push({
      label: `${prevLabel} – ${currLabel}`,
      days,
      regular: days >= 21 && days <= 35,
    })
  }
  return points
}

function CustomTooltip({
  active, payload, t,
}: {
  active?: boolean
  payload?: { payload: LengthPoint }[]
  t: (key: string, opts?: Record<string, unknown>) => string
}) {
  if (!active || !payload || !payload.length) return null
  const p = payload[0].payload
  return (
    <div className="bg-base-100 border border-base-300 rounded-lg shadow-md px-3 py-2 text-sm">
      <p className="font-semibold text-base-content">{t('cycleTracker.chart.tooltipDays', { count: p.days })}</p>
      <p className="text-xs text-base-content/60">
        {t('cycleTracker.chart.tooltipCycleEnding', {
          label: p.label,
          status: p.regular ? t('cycleTracker.trend.regular') : t('cycleTracker.trend.irregular'),
        })}
      </p>
    </div>
  )
}

export default function CycleLengthChart({ logs }: { logs: CycleLog[] }) {
  const { t } = useTranslation()
  const data = computeLengths(logs)

  if (logs.length < 2) {
    return (
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="text-sm font-semibold text-base-content/70">{t('cycleTracker.chart.title')}</h2>
          <p className="text-sm text-base-content/60 mt-2">
            {t('cycleTracker.chart.needTwoCycles')}
          </p>
        </div>
      </div>
    )
  }

  const maxDays = Math.max(40, ...data.map((d) => d.days))

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body">
        <h2 className="text-sm font-semibold text-base-content/70">{t('cycleTracker.chart.title')}</h2>
        <p className="text-xs text-base-content/50 mb-2">{t('cycleTracker.chart.bandLegend')}</p>
        <div className="h-56 mt-1 -ml-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
              <ReferenceArea y1={21} y2={35} fill="var(--color-success)" fillOpacity={0.1} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12 }}
                className="fill-base-content/60"
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, maxDays]}
                tick={{ fontSize: 12 }}
                className="fill-base-content/60"
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <Tooltip content={<CustomTooltip t={t} />} />
              <Bar dataKey="days" radius={[4, 4, 0, 0]}>
                {data.map((point, i) => (
                  <Cell key={i} fill={point.regular ? 'var(--color-success)' : 'var(--color-warning)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}