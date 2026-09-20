import { useTranslation } from 'react-i18next'

const EXAMPLE_FACTORS = [
  { id: 'irregularCycle', impact: 'increases', weight: 0.72 },
  { id: 'weightGain', impact: 'increases', weight: 0.58 },
  { id: 'regularExercise', impact: 'decreases', weight: 0.41 },
  { id: 'acne', impact: 'increases', weight: 0.33 },
] as const

export default function ExplainableAIPreview() {
  const { t } = useTranslation()

  return (
    <section id="explainable-ai" className="px-4 sm:px-8 py-16 bg-base-200">
      <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-base-content">{t('explainableAI.title')}</h2>
          <p className="mt-4 text-base-content/70">{t('explainableAI.paragraph')}</p>
        </div>

        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <span className="badge badge-info badge-sm self-start">{t('explainableAI.illustrativeExample')}</span>
            <div className="mt-3 space-y-3">
              {EXAMPLE_FACTORS.map((f) => (
                <div key={f.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-base-content/80">{t(`explainableAI.factors.${f.id}`)}</span>
                    <span className={f.impact === 'increases' ? 'text-error' : 'text-success'}>
                      {f.impact === 'increases' ? '↑' : '↓'}
                    </span>
                  </div>
                  <progress
                    className={`progress w-full ${f.impact === 'increases' ? 'progress-error' : 'progress-success'}`}
                    value={f.weight * 100}
                    max={100}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}