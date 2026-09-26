import { UserButton } from '@clerk/react'
import LanguageSwitcher from './LanguageSwitcher'

export default function TopBar() {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 h-16 px-4 sm:px-6 bg-base-100/80 backdrop-blur-sm border-b border-base-300">
      <span className="md:hidden font-display text-lg font-semibold italic text-primary">RutuChakra</span>
      <span className="hidden md:block" />
      <div className="flex items-center gap-3">
        <LanguageSwitcher />
        <UserButton />
      </div>
    </header>
  )
}