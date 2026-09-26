import { useTranslation } from 'react-i18next'

export default function AIDisclaimerStrip() {
  const { t } = useTranslation()
  return (
    <p className="text-center text-xs text-base-content/40 py-1.5">
      {t('aiAssistant.disclaimer')}
    </p>
  )
}