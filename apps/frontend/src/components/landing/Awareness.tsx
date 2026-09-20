import { useTranslation } from 'react-i18next'

export default function Awareness() {
  const { t } = useTranslation()

  return (
    <section className="px-4 sm:px-8 py-16 bg-base-200">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-base-content">{t('awareness.title')}</h2>
        <div className="mt-6 space-y-4 text-base-content/80 text-left sm:text-center">
          <p>{t('awareness.paragraph1')}</p>
          <p>{t('awareness.paragraph2')}</p>
        </div>
      </div>
    </section>
  )
}