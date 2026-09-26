import { useTranslation } from 'react-i18next'
import { Reveal, RevealGroup, RevealItem } from './Reveal'

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
        <Reveal className="order-2 md:order-1" y={32}>
          <div className="card bg-base-100 shadow-warm">
            <div className="card-body">
              <h3 className="font-semibold text-sm text-base-content/70">{t('tracking.thisMonth')}</h3>
              <RevealGroup className="grid grid-cols-7 gap-1.5 mt-2" staggerDelay={0.015}>
                {MOCK_DAYS.map((d) => (
                  <RevealItem key={d.day} y={8}>
                    <div
                      className={`aspect-square rounded-md flex items-center justify-center text-xs
                        ${d.period ? 'bg-primary text-primary-content' : d.logged ? 'bg-accent/40 text-base-content' : 'bg-base-200 text-base-content/50'}`}
                    >
                      {d.day}
                    </div>
                  </RevealItem>
                ))}
              </RevealGroup>

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
        </Reveal>

        <Reveal className="order-1 md:order-2" delay={0.1}>
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-base-content">{t('tracking.title')}</h2>
            <p className="mt-4 text-base-content/70">{t('tracking.paragraph')}</p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}