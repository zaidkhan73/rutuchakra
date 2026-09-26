import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Reveal, RevealGroup, RevealItem } from './Reveal'

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
        <Reveal>
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-base-content">
              {t('explainableAI.title')}
            </h2>
            <p className="mt-4 text-base-content/70">{t('explainableAI.paragraph')}</p>
          </div>
        </Reveal>

        <Reveal delay={0.15} y={32}>
          <div className="card bg-base-100 shadow-warm">
            <div className="card-body">
              <span className="badge badge-info badge-sm self-start">{t('explainableAI.illustrativeExample')}</span>
              <RevealGroup className="mt-3 space-y-3" staggerDelay={0.15}>
                {EXAMPLE_FACTORS.map((f) => (
                  <RevealItem key={f.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-base-content/80">{t(`explainableAI.factors.${f.id}`)}</span>
                      <span className={f.impact === 'increases' ? 'text-error' : 'text-success'}>
                        {f.impact === 'increases' ? '↑' : '↓'}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-base-300 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${f.weight * 100}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className={`h-full rounded-full ${f.impact === 'increases' ? 'bg-error' : 'bg-success'}`}
                      />
                    </div>
                  </RevealItem>
                ))}
              </RevealGroup>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}