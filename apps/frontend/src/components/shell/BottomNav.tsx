import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { NAV_ITEMS } from './navConfig'

export default function BottomNav() {
  const { t } = useTranslation()

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-base-100 border-t border-base-300 overflow-x-auto"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex min-w-max">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.key}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 px-4 py-2 min-w-[72px] text-[11px] font-medium ${
                isActive ? 'text-primary' : 'text-base-content/60'
              }`
            }
          >
            {item.icon}
            <span className="whitespace-nowrap">{t(item.labelKey)}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}