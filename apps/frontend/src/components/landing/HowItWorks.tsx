import { useTranslation } from 'react-i18next'

const STEP_IDS = ['share', 'analyze', 'score', 'explain', 'guide'] as const

export default function HowItWorks() {
  const { t } = useTranslation()

  return (
    <section id="how-it-works" className="px-4 sm:px-8 py-16">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-base-content">{t('howItWorks.title')}</h2>

        <div className="mt-12 flex flex-col md:flex-row md:items-start gap-8 md:gap-4">
          {STEP_IDS.map((id, i) => (
            <div key={id} className="flex md:flex-col items-start md:items-center gap-4 md:gap-3 flex-1 relative">
              {i < STEP_IDS.length - 1 && (
                <div
                  className="hidden md:block absolute top-6 left-[calc(50%+28px)] w-[calc(100%-56px)] h-px bg-base-300"
                  aria-hidden="true"
                />
              )}
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-content font-bold text-lg shrink-0 z-10">
                {i + 1}
              </div>
              <div className="md:text-center">
                <h3 className="font-semibold text-base-content">{t(`howItWorks.steps.${id}.label`)}</h3>
                <p className="text-sm text-base-content/70 mt-1 md:max-w-[160px]">
                  {t(`howItWorks.steps.${id}.desc`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}