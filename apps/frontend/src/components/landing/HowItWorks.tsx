const STEPS = [
  { n: 1, label: 'Share', desc: 'Tell us about your cycle, symptoms, and lifestyle.' },
  { n: 2, label: 'Analyze', desc: 'Our model compares your answers against thousands of cases.' },
  { n: 3, label: 'Score', desc: 'You get a probability, not a vague label.' },
  { n: 4, label: 'Explain', desc: 'See exactly which factors moved your score, and by how much.' },
  { n: 5, label: 'Guide', desc: 'Get plain-language next steps suited to your situation.' },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="px-4 sm:px-8 py-16">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-base-content">How it works</h2>

        <div className="mt-12 flex flex-col md:flex-row md:items-start gap-8 md:gap-4">
          {STEPS.map((step, i) => (
            <div key={step.n} className="flex md:flex-col items-start md:items-center gap-4 md:gap-3 flex-1 relative">
              {i < STEPS.length - 1 && (
                <div
                  className="hidden md:block absolute top-6 left-[calc(50%+28px)] w-[calc(100%-56px)] h-px bg-base-300"
                  aria-hidden="true"
                />
              )}
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-content font-bold text-lg shrink-0 z-10">
                {step.n}
              </div>
              <div className="md:text-center">
                <h3 className="font-semibold text-base-content">{step.label}</h3>
                <p className="text-sm text-base-content/70 mt-1 md:max-w-[160px]">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}