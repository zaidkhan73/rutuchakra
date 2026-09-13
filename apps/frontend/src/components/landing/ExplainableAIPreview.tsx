const EXAMPLE_FACTORS = [
  { factor: 'Irregular menstrual cycle', impact: 'increases', weight: 0.72 },
  { factor: 'Unexplained weight gain', impact: 'increases', weight: 0.58 },
  { factor: 'Regular exercise', impact: 'decreases', weight: 0.41 },
  { factor: 'Persistent acne', impact: 'increases', weight: 0.33 },
]

export default function ExplainableAIPreview() {
  return (
    <section id="explainable-ai" className="px-4 sm:px-8 py-16 bg-base-200">
      <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-base-content">
            See the "why," not just the number
          </h2>
          <p className="mt-4 text-base-content/70">
            Most risk tools give you a score and stop there. RutuChakra breaks
            down exactly which of your answers moved that score, and in which
            direction — so the result reads like an explanation, not a verdict.
          </p>
        </div>

        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <span className="badge badge-info badge-sm self-start">Illustrative example</span>
            <div className="mt-3 space-y-3">
              {EXAMPLE_FACTORS.map((f) => (
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
        </div>
      </div>
    </section>
  )
}