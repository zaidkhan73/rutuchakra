import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '../shell/LanguageSwitcher'

const NAV_LINK_IDS = ['howItWorks', 'explainableAI', 'privacy'] as const

const NAV_HREFS: Record<(typeof NAV_LINK_IDS)[number], string> = {
  howItWorks: '#how-it-works',
  explainableAI: '#explainable-ai',
  privacy: '#privacy',
}


export default function Header() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <header className="navbar bg-base-100/80 backdrop-blur-sm border-b border-base-300 px-4 sm:px-8 sticky top-0 z-40">
      <div className="flex-1">
        <span className="text-lg font-bold text-primary">
          RutuChakra
        </span>
      </div>

      <nav className="hidden md:flex items-center gap-6 mr-6">
        {NAV_LINK_IDS.map((id) => (
          <a
            key={id}
            href={NAV_HREFS[id]}
            className="text-sm text-base-content/70 hover:text-base-content transition-colors"
          >
            {t(`nav.${id}`)}
          </a>
        ))}
      </nav>

      <div className="flex items-center gap-3">
        <LanguageSwitcher/>

        <button
          onClick={() => navigate('/login')}
          className="btn btn-primary btn-sm"
        >
          {t('nav.login')}
        </button>
      </div>
    </header>
  )
}