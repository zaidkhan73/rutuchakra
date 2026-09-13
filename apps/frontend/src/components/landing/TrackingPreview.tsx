const MOCK_DAYS = Array.from({ length: 28 }, (_, i) => ({
  day: i + 1,
  period: [1, 2, 3, 4, 5].includes(i + 1),
  logged: [8, 9, 10, 15, 16, 17, 22, 23].includes(i + 1),
}))

const HABITS = [
  { label: 'Water intake', streak: 6 },
  { label: 'Exercise', streak: 3 },
  { label: 'Sleep 7h+', streak: 9 },
]

export default function TrackingPreview() {
  return (
    <section className="px-4 sm:px-8 py-16">
      <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-10 items-center">
        <div className="card bg-base-100 shadow-md order-2 md:order-1">
          <div className="card-body">
            <h3 className="font-semibold text-sm text-base-content/70">This month</h3>
            <div className="grid grid-cols-7 gap-1.5 mt-2">
              {MOCK_DAYS.map((d) => (
                <div
                  key={d.day}
                  className={`aspect-square rounded-md flex items-center justify-center text-xs
                    ${d.period ? 'bg-primary text-primary-content' : d.logged ? 'bg-accent/40 text-base-content' : 'bg-base-200 text-base-content/50'}`}
                >
                  {d.day}
                </div>
              ))}
            </div>

            <div className="divider my-4"></div>

            <div className="space-y-3">
              {HABITS.map((h) => (
                <div key={h.label} className="flex items-center justify-between text-sm">
                  <span className="text-base-content/80">{h.label}</span>
                  <span className="badge badge-secondary badge-sm">{h.streak} day streak</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="order-1 md:order-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-base-content">
            Track more than one result
          </h2>
          <p className="mt-4 text-base-content/70">
            Log your cycle and daily habits between check-ins. Patterns over
            weeks tell you more than any single answer — and they carry
            forward into your next risk assessment.
          </p>
        </div>
      </div>
    </section>
  )
}