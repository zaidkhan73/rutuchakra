import { useTranslation } from 'react-i18next'
import { Reveal } from './Reveal'

export default function Awareness() {
  const { t } = useTranslation()

  return (
    <section className="px-4 sm:px-8 py-16 bg-base-200">
      <div className="max-w-3xl mx-auto text-center">
        <Reveal>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-base-content">
            {t('awareness.title')}
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-6 text-base-content/80 text-left sm:text-center">{t('awareness.paragraph1')}</p>
        </Reveal>
        <Reveal delay={0.2}>
          <p className="mt-6 font-display italic text-xl text-base-content border-l-4 sm:border-l-0 sm:border-none border-primary/40 pl-4 sm:pl-0 text-left sm:text-center">
            {t('awareness.paragraph2')}
          </p>
        </Reveal>
      </div>
    </section>
  )
}