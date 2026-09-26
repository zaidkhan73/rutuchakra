import type { ReactNode } from 'react'

export interface NavItem {
  key: string
  path: string
  labelKey: string
  icon: ReactNode
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-5 h-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export const NAV_ITEMS: NavItem[] = [
  {
    key: 'overview',
    path: '/dashboard',
    labelKey: 'appShell.nav.overview',
    icon: (
      <Icon>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="2.5" />
      </Icon>
    ),
  },
  {
    key: 'predict',
    path: '/predict',
    labelKey: 'appShell.nav.predict',
    icon: (
      <Icon>
        <path d="M12 4v16M4 12h16" />
      </Icon>
    ),
  },
  {
    key: 'history',
    path: '/history',
    labelKey: 'appShell.nav.history',
    icon: (
      <Icon>
        <path d="M4 4v6h6" />
        <path d="M4.5 14a8 8 0 1 0 2-8.5L4 10" />
      </Icon>
    ),
  },
  {
    key: 'cycle',
    path: '/cycle',
    labelKey: 'appShell.nav.cycle',
    icon: (
      <Icon>
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M4 10h16M8 3v4M16 3v4" />
      </Icon>
    ),
  },
  {
    key: 'habits',
    path: '/habits',
    labelKey: 'appShell.nav.habits',
    icon: (
      <Icon>
        <path d="M5 13l4 4L19 7" />
      </Icon>
    ),
  },
  {
    key: 'assistant',
    path: '/assistant',
    labelKey: 'appShell.nav.assistant',
    icon: (
      <Icon>
        <path d="M12 3a6 6 0 0 0-6 6c0 2.5 1.4 4 2 5l.5 3h7l.5-3c.6-1 2-2.5 2-5a6 6 0 0 0-6-6Z" />
        <path d="M9.5 21h5" />
      </Icon>
    ),
  },
]