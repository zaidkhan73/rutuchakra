import type { WeeklyData } from '../../utils/habits'

function shortDay(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { weekday: 'narrow' })
}

export default function WeeklyGrid({ data, isNewUser }: { data: WeeklyData; isNewUser: boolean }) {
  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body">
        <h2 className="text-sm font-semibold text-base-content/70">This week</h2>
        {isNewUser && (
          <p className="text-xs text-base-content/50 mb-2">
            Building your history — patterns will show up more clearly after a week or two.
          </p>
        )}

        <div className="overflow-x-auto mt-2">
          <table className="w-full text-center">
            <thead>
              <tr>
                <th className="text-left text-xs font-normal text-base-content/50 pb-2">Habit</th>
                {data.days.map((d) => (
                  <th key={d} className="text-xs font-normal text-base-content/50 pb-2 w-8">{shortDay(d)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.grid.map((row) => (
                <tr key={row.name}>
                  <td className="text-left text-sm text-base-content py-1.5 pr-2 whitespace-nowrap">{row.label}</td>
                  {row.days.map((day) => (
                    <td key={day.date} className="py-1.5">
                      <span
                        className={`inline-block w-4 h-4 rounded-full mx-auto
                          ${day.completed ? 'bg-success' : day.logged ? 'bg-warning/60' : 'bg-base-300'}`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}