import { useTranslation } from 'react-i18next'

export default function AIAssistantPreview() {
  const { t } = useTranslation()

  return (
    <section className="px-4 sm:px-8 py-16 bg-base-200">
      <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-base-content">{t('aiPreview.title')}</h2>
          <p className="mt-4 text-base-content/70">{t('aiPreview.paragraph')}</p>
        </div>

        <div className="card bg-base-100 shadow-md">
          <div className="card-body gap-3">
            <div className="chat chat-start">
              <div className="chat-bubble chat-bubble-secondary text-sm">{t('aiPreview.userMessage')}</div>
            </div>
            <div className="chat chat-end">
              <div className="chat-bubble bg-primary text-primary-content text-sm">
                {t('aiPreview.assistantMessage')}
              </div>
              <div className="chat-footer opacity-60 text-xs mt-1">
                <span className="badge badge-outline badge-xs">{t('aiPreview.grounded')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}