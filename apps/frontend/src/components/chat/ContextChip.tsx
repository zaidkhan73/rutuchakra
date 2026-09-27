import { useTranslation } from 'react-i18next'
import type { PredictionContext } from '../../utils/chat'

const RISK_BADGE = {
  Low: 'badge-success',
  Moderate: 'badge-warning',
  High: 'badge-error',
} as const

export default function ContextChip({ context }: { context: PredictionContext }) {
  const { t } = useTranslation()
  const riskKey = context.riskLevel.toLowerCase() as 'low' | 'moderate' | 'high'

  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm">
      <div className="card-body p-4 gap-3">
        <div className="flex items-center gap-2 text-secondary">
          <span className="text-base">✦</span>
          <span className="text-xs font-semibold uppercase tracking-wide">{t('aiAssistant.loadedContext')}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className={`badge ${RISK_BADGE[context.riskLevel]} badge-sm`}>
            {t(`riskLevels.${riskKey}`)} {t('result.riskSuffix')}
          </span>
          <span className="font-display text-lg font-semibold text-base-content tabular-nums">
            {Math.round(context.probability * 100)}%
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          {context.topFactors.map((f) => (
            <span
              key={f.factor}
              className={`text-xs px-2.5 py-1.5 rounded-full border
                ${f.impact === 'increases'
                  ? 'border-error/30 bg-error/10 text-error'
                  : 'border-success/30 bg-success/10 text-success'}`}
            >
              {f.impact === 'increases' ? '↑' : '↓'} {t(`resultFactors.${f.factor}`, { defaultValue: f.factor })}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}