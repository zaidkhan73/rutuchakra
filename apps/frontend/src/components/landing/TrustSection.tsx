const TRUST_POINTS = [
  {
    label: 'Private by default',
    desc: 'Your answers are yours. We never sell data or share it with advertisers.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l7 3v6c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V5l7-3z" />
      </svg>
    ),
  },
  {
    label: 'Not a diagnosis',
    desc: "A result here is a starting point for a conversation with a doctor, not a medical conclusion.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" d="M12 8v5M12 16h.01" />
      </svg>
    ),
  },
  {
    label: 'Transparent explanations',
    desc: 'Every result shows the factors behind it. No black-box scores.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h13" />
      </svg>
    ),
  },
]

export default function TrustSection() {
  return (
    <section id="privacy" className="px-4 sm:px-8 py-16">
      <div className="max-w-4xl mx-auto grid sm:grid-cols-3 gap-8">
        {TRUST_POINTS.map((p) => (
          <div key={p.label} className="text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              {p.icon}
            </div>
            <h3 className="font-semibold mt-4 text-base-content">{p.label}</h3>
            <p className="text-sm text-base-content/70 mt-2">{p.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}