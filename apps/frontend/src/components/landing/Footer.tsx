import { useTranslation } from 'react-i18next'

export default function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="footer footer-center bg-base-200 text-base-content/70 px-4 sm:px-8 py-10 border-t border-base-300">
      <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
        <a href="#how-it-works" className="link link-hover">{t('footer.howItWorks')}</a>
        <a href="#privacy" className="link link-hover">{t('footer.privacy')}</a>
        <a href="/terms" className="link link-hover">{t('footer.terms')}</a>
        <a href="/disclaimer" className="link link-hover">{t('footer.disclaimer')}</a>
      </nav>
      <p className="text-xs mt-2">{t('footer.disclaimerText')}</p>
      <p className="font-display italic text-xs opacity-60">© {new Date().getFullYear()} {t('footer.copyright')}</p>
    </footer>
  )
}