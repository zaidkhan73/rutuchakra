import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const NAV_LINKS = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Explainable AI', href: '#explainable-ai' },
  { label: 'Privacy', href: '#privacy' },
]

export default function Header() {
  const navigate = useNavigate()
  const [lang, setLang] = useState('EN')

  return (
    <header className="navbar bg-base-100/80 backdrop-blur-sm border-b border-base-300 px-4 sm:px-8 sticky top-0 z-40">
      <div className="flex-1">
        <span className="text-lg font-bold text-primary">RutuChakra</span>
      </div>

      <nav className="hidden md:flex items-center gap-6 mr-6">
        {NAV_LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="text-sm text-base-content/70 hover:text-base-content transition-colors"
          >
            {link.label}
          </a>
        ))}
      </nav>

      <div className="flex items-center gap-3">
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          className="select select-sm select-ghost w-20"
          aria-label="Language"
        >
          <option value="EN">EN</option>
          <option value="HI">हिं</option>
          <option value="MR">मर</option>
        </select>
        <button onClick={() => navigate('/login')} className="btn btn-primary btn-sm">
          Log in
        </button>
      </div>
    </header>
  )
}   