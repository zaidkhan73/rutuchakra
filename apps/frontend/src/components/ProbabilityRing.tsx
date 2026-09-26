import { useTranslation } from 'react-i18next'

export const RISK_RING_STYLES = {
  Low: { ring: 'stroke-success' },
  Moderate: { ring: 'stroke-warning' },
  High: { ring: 'stroke-error' },
} as const

export function ProbabilityRing({
  probability,
  risk,
  size = 'lg',
}: {
  probability: number
  risk: keyof typeof RISK_RING_STYLES
  size?: 'lg' | 'md'
}) {
  const { t } = useTranslation()
  const pct = Math.round(probability * 100)
  const radius = 70
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - probability)
  const styles = RISK_RING_STYLES[risk]
  const dimension = size === 'lg' ? 'w-44 h-44' : 'w-28 h-28'

  return (
    <div className={`relative ${dimension} mx-auto shrink-0`}>
      <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
        <circle cx="80" cy="80" r={radius} fill="none" strokeWidth="12" className="stroke-base-300" />
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          strokeWidth="12"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`${styles.ring} transition-all duration-700`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-display font-semibold text-base-content tabular-nums ${size === 'lg' ? 'text-3xl' : 'text-xl'}`}>
          {pct}%
        </span>
        {size === 'lg' && <span className="text-xs text-base-content/60">{t('result.probability')}</span>}
      </div>
    </div>
  )
}