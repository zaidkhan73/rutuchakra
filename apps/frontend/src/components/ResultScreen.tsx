import type { PredictionResult } from '../utils/pcos'

const RISK_STYLES = {
  Low: { ring: 'stroke-success', badge: 'badge-success', text: 'text-success' },
  Moderate: { ring: 'stroke-warning', badge: 'badge-warning', text: 'text-warning' },
  High: { ring: 'stroke-error', badge: 'badge-error', text: 'text-error' },
} as const

const ADVICE_HEADINGS = ['Your Summary', 'What You Can Do', 'When to See a Doctor']

function parseAdvice(text: string) {
  const sections: { heading: string; body: string }[] = []
  let remaining = text
  for (let i = 0; i < ADVICE_HEADINGS.length; i++) {
    const heading = ADVICE_HEADINGS[i]
    const nextHeading = ADVICE_HEADINGS[i + 1]
    const start = remaining.indexOf(heading)
    if (start === -1) continue
    const afterHeading = start + heading.length
    const end = nextHeading ? remaining.indexOf(nextHeading, afterHeading) : remaining.length
    const body = remaining.slice(afterHeading, end === -1 ? undefined : end).trim()
    sections.push({ heading, body })
  }
  return sections.length > 0 ? sections : null
}

function ProbabilityRing({ probability, risk }: { probability: number; risk: keyof typeof RISK_STYLES }) {
  const pct = Math.round(probability * 100)
  const radius = 70
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - probability)
  const styles = RISK_STYLES[risk]

  return (
    <div className="relative w-44 h-44 mx-auto">
      <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
        <circle cx="80" cy="80" r={radius} fill="none" strokeWidth="12" className="stroke-base-300" />
        <circle
          cx="80" cy="80" r={radius} fill="none" strokeWidth="12"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`${styles.ring} transition-all duration-700`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold text-base-content tabular-nums">{pct}%</span>
        <span className="text-xs text-base-content/60">probability</span>
      </div>
    </div>
  )
}

export default function ResultScreen({
  result,
  onRestart,
}: {
  result: PredictionResult
  onRestart: () => void
}) {
  const styles = RISK_STYLES[result.risk_level]
  const adviceSections = parseAdvice(result.ai_advice)

  return (
    <div className="animate-fade-up">
      <div className="text-center mb-6">
        <span className={`badge ${styles.badge} badge-lg mb-4`}>{result.risk_level} risk</span>
        <ProbabilityRing probability={result.probability} risk={result.risk_level} />
      </div>

      <div className="bg-base-200 rounded-xl p-4 mb-6">
        <p className="text-sm text-base-content/80">{result.advice}</p>
      </div>

      {result.top_factors.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-base-content/70 mb-3">
            What influenced this result
          </h3>
          <div className="space-y-3">
            {result.top_factors.map((f) => (
              <div key={f.factor}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-base-content/80">{f.factor}</span>
                  <span className={f.impact === 'increases' ? 'text-error' : 'text-success'}>
                    {f.impact === 'increases' ? '↑' : '↓'}
                  </span>
                </div>
                <progress
                  className={`progress w-full ${f.impact === 'increases' ? 'progress-error' : 'progress-success'}`}
                  value={f.weight * 100}
                  max={100}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-sm font-semibold text-base-content/70 mb-3">Personalised guidance</h3>
        {adviceSections ? (
          <div className="space-y-4">
            {adviceSections.map((s) => (
              <div key={s.heading}>
                <p className="text-sm font-semibold text-primary">{s.heading}</p>
                <p className="text-sm text-base-content/80 mt-1 whitespace-pre-line">{s.body}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-base-content/80 whitespace-pre-line">{result.ai_advice}</p>
        )}
      </div>

      <div className="alert bg-base-200 border-base-300 text-xs text-base-content/60 mb-6">
        <span>
          This is not a medical diagnosis. Please discuss this result with a qualified
          gynaecologist or endocrinologist.
        </span>
      </div>

      <button type="button" onClick={onRestart} className="btn btn-outline w-full">
        Take the assessment again
      </button>
    </div>
  )
}