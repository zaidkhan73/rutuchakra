export default function AIAssistantPreview() {
  return (
    <section className="px-4 sm:px-8 py-16 bg-base-200">
      <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-base-content">
            Ask questions in your own words
          </h2>
          <p className="mt-4 text-base-content/70">
            Confused about what a result means, or what to eat before a
            checkup? Ask the assistant directly — every answer is grounded in
            your own tracked data and reliable sources, not generic advice.
          </p>
        </div>

        <div className="card bg-base-100 shadow-md">
          <div className="card-body gap-3">
            <div className="chat chat-start">
              <div className="chat-bubble chat-bubble-secondary text-sm">
                My cycle's been 40 days for the last two months — should I be worried?
              </div>
            </div>
            <div className="chat chat-end">
              <div className="chat-bubble bg-primary text-primary-content text-sm">
                Two 40-day cycles in a row does count as irregular, based on your
                logged history. It's one of the factors in your last result too —
                worth mentioning to a gynaecologist at your next visit.
              </div>
              <div className="chat-footer opacity-60 text-xs mt-1">
                <span className="badge badge-outline badge-xs">Grounded in your cycle log</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}