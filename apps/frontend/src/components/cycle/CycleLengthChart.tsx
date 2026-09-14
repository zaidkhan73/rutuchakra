import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceArea, Cell,
} from 'recharts'
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
    const prevLabel = prev.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    const currLabel = curr.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    points.push({
      label: `${prevLabel} – ${currLabel}`,
      days,
      regular: days >= 21 && days <= 35,
    })
  }
  return points
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: LengthPoint }[] }) {
  if (!active || !payload || !payload.length) return null
  const p = payload[0].payload
  return (
    <div className="bg-base-100 border border-base-300 rounded-lg shadow-md px-3 py-2 text-sm">
      <p className="font-semibold text-base-content">{p.days} days</p>
      <p className="text-xs text-base-content/60">
        cycle ending {p.label} — {p.regular ? 'regular' : 'irregular'}
      </p>
    </div>
  )
}

export default function CycleLengthChart({ logs }: { logs: CycleLog[] }) {
  const data = computeLengths(logs)

  if (logs.length < 2) {
    return (
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="text-sm font-semibold text-base-content/70">Cycle length trend</h2>
          <p className="text-sm text-base-content/60 mt-2">
            Log at least two cycles to see this chart.
          </p>
        </div>
      </div>
    )
  }

  const maxDays = Math.max(40, ...data.map((d) => d.days))

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body">
        <h2 className="text-sm font-semibold text-base-content/70">Cycle length trend</h2>
        <p className="text-xs text-base-content/50 mb-2">Shaded band = typical regular range (21–35 days)</p>
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
              <Tooltip content={<CustomTooltip />} />
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