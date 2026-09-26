import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function ChatComposer({
  onSend,
  disabled,
}: {
  onSend: (message: string) => void
  disabled?: boolean
}) {
  const { t, i18n } = useTranslation()
  const [value, setValue] = useState('')

  function handleSend() {
    if (!value.trim() || disabled) return
    onSend(value.trim())
    setValue('')
  }

  return (
    <div className="flex items-center gap-2 bg-base-100 shadow-md border border-base-300 rounded-full px-3 py-1.5 focus-within:border-primary/50 transition-colors">
      <span className="badge badge-ghost badge-xs shrink-0">{i18n.language.toUpperCase()}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        placeholder={t('aiAssistant.composer.placeholder')}
        className="flex-1 bg-transparent outline-none text-sm py-2.5"
        disabled={disabled}
      />
      <button
        type="button"
        disabled
        aria-label={t('aiAssistant.composer.voiceInputAria')}
        title={t('aiAssistant.composer.voiceInputTitle')}
        className="btn btn-ghost btn-circle btn-sm text-base-content/30"
      >
        🎤
      </button>
      <button
        type="button"
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        aria-label={t('aiAssistant.composer.sendAria')}
        className="btn btn-primary btn-circle btn-sm shadow-sm disabled:shadow-none"
      >
        ➤
      </button>
    </div>
  )
}