import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { NAV_ITEMS } from './navConfig'

export default function Sidebar() {
  const { t } = useTranslation()

  return (
    <aside className="hidden md:flex md:flex-col w-60 shrink-0 border-r border-base-300 bg-base-100 h-screen sticky top-0 py-6 px-3">
      <div className="px-3 mb-8">
        <span className="text-lg font-bold text-primary">RutuChakra</span>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.key}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary'
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