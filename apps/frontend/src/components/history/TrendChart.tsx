import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { HistoryEntry } from '../../utils/pcos'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: HistoryEntry }[] }) {
  if (!active || !payload || !payload.length) return null
  const entry = payload[0].payload
  return (
    <div className="bg-base-100 border border-base-300 rounded-lg shadow-md px-3 py-2 text-sm">
      <p className="font-semibold text-base-content">{Math.round(entry.probability * 100)}%</p>
      <p className="text-xs text-base-content/60">{formatDate(entry.createdAt)} — {entry.risk_level} risk</p>
    </div>
  )
}

export default function TrendChart({ entries }: { entries: HistoryEntry[] }) {
  const chartData = [...entries].reverse()

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body">
        <h2 className="text-sm font-semibold text-base-content/70">Your risk over time</h2>
        <div className="h-64 mt-2 -ml-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-base-300" vertical={false} />
              <XAxis
                dataKey="createdAt"
                tickFormatter={formatDate}
                tick={{ fontSize: 12 }}
                className="fill-base-content/60"
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 1]}
                tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
                tick={{ fontSize: 12 }}
                className="fill-base-content/60"
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="probability"
                stroke="var(--color-primary)"
                strokeWidth={2.5}
                dot={{ r: 4, fill: 'var(--color-primary)' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}