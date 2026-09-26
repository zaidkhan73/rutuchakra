import { useTranslation } from 'react-i18next'

export default function TypingIndicator() {
  const { t } = useTranslation()
  return (
    <div className="chat chat-start" aria-live="polite" aria-label={t('aiAssistant.typingAria')}>
      <div className="chat-bubble bg-primary text-primary-content flex items-center gap-1 py-3">
        <span className="w-1.5 h-1.5 rounded-full bg-primary-content/70 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-primary-content/70 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-primary-content/70 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )
}