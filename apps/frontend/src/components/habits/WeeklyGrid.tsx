import { useTranslation } from 'react-i18next'
import { localeTag } from '../../utils/date'
import { BUILTIN_HABIT_NAMES } from '../../utils/habits'
import type { WeeklyData } from '../../utils/habits'

function shortDay(iso: string) {
  return new Date(iso).toLocaleDateString(localeTag(), { weekday: 'narrow' })
}

export default function WeeklyGrid({ data, isNewUser }: { data: WeeklyData; isNewUser: boolean }) {
  const { t } = useTranslation()
  return (
    <div className="card bg-base-100 shadow-sm border border-base-300">
      <div className="card-body">
        <h2 className="kicker">{t('habitTracker.weekly.title')}</h2>
        {isNewUser && (
          <p className="text-xs text-base-content/50 mb-2">
            {t('habitTracker.weekly.newUserNote')}
          </p>
        )}

        <div className="overflow-x-auto mt-2">
          <table className="w-full text-center">
            <thead>
              <tr>
                <th className="text-left text-xs font-normal text-base-content/50 pb-2">{t('habitTracker.weekly.habitColumn')}</th>
                {data.days.map((d) => (
                  <th key={d} className="text-xs font-normal text-base-content/50 pb-2 w-8">{shortDay(d)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.grid.map((row) => (
                <tr key={row.name}>
                  <td className="text-left text-sm text-base-content py-1.5 pr-2 whitespace-nowrap">
                    {BUILTIN_HABIT_NAMES.has(row.name) ? t(`habitTracker.builtins.${row.name}.label`) : row.label}
                  </td>
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