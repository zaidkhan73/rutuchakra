import { useTranslation } from 'react-i18next'

const MOCK_DAYS = Array.from({ length: 28 }, (_, i) => ({
  day: i + 1,
  period: [1, 2, 3, 4, 5].includes(i + 1),
  logged: [8, 9, 10, 15, 16, 17, 22, 23].includes(i + 1),
}))

const HABITS = [
  { id: 'water', streak: 6 },
  { id: 'exercise', streak: 3 },
  { id: 'sleep', streak: 9 },
] as const

export default function TrackingPreview() {
  const { t } = useTranslation()

  return (
    <section className="px-4 sm:px-8 py-16">
      <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-10 items-center">
        <div className="card bg-base-100 shadow-md order-2 md:order-1">
          <div className="card-body">
            <h3 className="font-semibold text-sm text-base-content/70">{t('tracking.thisMonth')}</h3>
            <div className="grid grid-cols-7 gap-1.5 mt-2">
              {MOCK_DAYS.map((d) => (
                <div
                  key={d.day}
                  className={`aspect-square rounded-md flex items-center justify-center text-xs
                    ${d.period ? 'bg-primary text-primary-content' : d.logged ? 'bg-accent/40 text-base-content' : 'bg-base-200 text-base-content/50'}`}
                >
                  {d.day}
                </div>
              ))}
            </div>

            <div className="divider my-4"></div>

            <div className="space-y-3">
              {HABITS.map((h) => (
                <div key={h.id} className="flex items-center justify-between text-sm">
                  <span className="text-base-content/80">{t(`tracking.habits.${h.id}`)}</span>
                  <span className="badge badge-secondary badge-sm">
                    {h.streak} {t('tracking.dayStreak')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="order-1 md:order-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-base-content">{t('tracking.title')}</h2>
          <p className="mt-4 text-base-content/70">{t('tracking.paragraph')}</p>
        </div>
      </div>
    </section>
  )
}