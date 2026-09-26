import { useTranslation } from 'react-i18next'
import { Reveal, RevealGroup, RevealItem } from './Reveal'

export default function AIAssistantPreview() {
  const { t } = useTranslation()

  return (
    <section className="px-4 sm:px-8 py-16 bg-base-200">
      <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-10 items-center">
        <Reveal>
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-base-content">{t('aiPreview.title')}</h2>
            <p className="mt-4 text-base-content/70">{t('aiPreview.paragraph')}</p>
          </div>
        </Reveal>

        <Reveal delay={0.15} y={32}>
          <div className="card bg-base-100 shadow-warm">
            <RevealGroup className="card-body gap-3" staggerDelay={0.25}>
              <RevealItem>
                <div className="chat chat-start">
                  <div className="chat-bubble chat-bubble-secondary text-sm">{t('aiPreview.userMessage')}</div>
                </div>
              </RevealItem>
              <RevealItem>
                <div className="chat chat-end">
                  <div className="chat-bubble bg-primary text-primary-content text-sm">
                    {t('aiPreview.assistantMessage')}
                  </div>
                  <div className="chat-footer opacity-60 text-xs mt-1">
                    <span className="badge badge-outline badge-xs">{t('aiPreview.grounded')}</span>
                  </div>
                </div>
              </RevealItem>
            </RevealGroup>
          </div>
        </Reveal>
      </div>
    </section>
  )
}