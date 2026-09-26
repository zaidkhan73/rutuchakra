import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { NAV_ITEMS } from './navConfig'

export default function Sidebar() {
  const { t } = useTranslation()

  return (
    <aside className="hidden md:flex md:flex-col w-64 shrink-0 border-r border-base-300 bg-base-100 h-screen sticky top-0 py-7 px-4">
      <div className="px-2 mb-10">
        <span className="font-display text-2xl font-semibold italic text-primary leading-none">
          RutuChakra
        </span>
        <p className="kicker mt-2">{t('appShell.tagline')}</p>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.key}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-full text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-content shadow-warm'
                  : 'text-base-content/70 hover:bg-base-200 hover:text-base-content'
              }`
            }
          >
            {item.icon}
            {t(item.labelKey)}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}