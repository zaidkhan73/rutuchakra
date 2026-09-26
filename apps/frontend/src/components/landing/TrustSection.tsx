import { useTranslation } from 'react-i18next'
import { RevealGroup, RevealItem } from './Reveal'

const TRUST_POINT_IDS = ['private', 'notDiagnosis', 'transparent'] as const

const ICONS = {
  private: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l7 3v6c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V5l7-3z" />
    </svg>
  ),
  notDiagnosis: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M12 8v5M12 16h.01" />
    </svg>
  ),
  transparent: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h13" />
    </svg>
  ),
}

export default function TrustSection() {
  const { t } = useTranslation()

  return (
    <section id="privacy" className="px-4 sm:px-8 py-16">
      <RevealGroup className="max-w-4xl mx-auto grid sm:grid-cols-3 gap-8" staggerDelay={0.12}>
        {TRUST_POINT_IDS.map((id) => (
          <RevealItem key={id} className="text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              {ICONS[id]}
            </div>
            <h3 className="font-semibold mt-4 text-base-content">{t(`trust.${id}.label`)}</h3>
            <p className="text-sm text-base-content/70 mt-2">{t(`trust.${id}.desc`)}</p>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  )
}