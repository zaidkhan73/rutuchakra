import { useNavigate } from 'react-router-dom'

function CycleMotif() {
  return (
    <svg
      viewBox="0 0 400 400"
      className="w-full max-w-sm mx-auto"
      role="img"
      aria-label="Abstract illustration of overlapping circular arcs"
    >
      <circle cx="200" cy="200" r="150" fill="none" stroke="var(--color-base-300)" strokeWidth="1" />

      <circle
        cx="200"
        cy="200"
        r="130"
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray="620 200"
        transform="rotate(-90 200 200)"
      >
        <animate attributeName="stroke-dasharray" from="0 820" to="620 200" dur="1.4s" fill="freeze" />
      </circle>

      <circle
        cx="200"
        cy="200"
        r="95"
        fill="none"
        stroke="var(--color-secondary)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray="410 300"
        transform="rotate(40 200 200)"
        opacity="0.85"
      >
        <animate attributeName="stroke-dasharray" from="0 710" to="410 300" dur="1.4s" begin="0.15s" fill="freeze" />
      </circle>

      <circle
        cx="200"
        cy="200"
        r="60"
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray="220 180"
        transform="rotate(160 200 200)"
        opacity="0.9"
      >
        <animate attributeName="stroke-dasharray" from="0 400" to="220 180" dur="1.4s" begin="0.3s" fill="freeze" />
      </circle>

      <circle cx="200" cy="200" r="18" fill="var(--color-primary)" opacity="0.15" />
    </svg>
  )
}

export default function Hero() {
  const navigate = useNavigate()

  return (
    <section className="px-4 sm:px-8 py-16 md:py-24">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        <div className="text-center md:text-left order-2 md:order-1">
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight text-base-content">
            Know your PCOD risk before it becomes a question mark
          </h1>
          <p className="mt-5 text-lg text-base-content/70 max-w-md mx-auto md:mx-0">
            Answer a few questions about your cycle and symptoms. Get a clear,
            explained result in minutes — not a diagnosis, but a well-informed
            starting point for your next conversation with a doctor.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
            <div className="aura bg-pink-400 p-0.5 ">
                <button onClick={() => navigate('/login')} className="btn btn-primary btn-lg">
              Check your risk
            </button>
            </div>
            
            <a href="#how-it-works" className="btn btn-outline btn-lg">
              Learn how it works
            </a>
          </div>
        </div>

        <div className="order-1 md:order-2">
          <CycleMotif />
        </div>
      </div>
    </section>
  )
}