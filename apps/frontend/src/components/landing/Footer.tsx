export default function Footer() {
  return (
    <footer className="footer footer-center bg-base-200 text-base-content/70 px-4 sm:px-8 py-10 border-t border-base-300">
      <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
        <a href="#how-it-works" className="link link-hover">How it works</a>
        <a href="#privacy" className="link link-hover">Privacy</a>
        <a href="/terms" className="link link-hover">Terms</a>
        <a href="/disclaimer" className="link link-hover">Medical disclaimer</a>
      </nav>
      <p className="text-xs mt-2">
        RutuChakra does not diagnose medical conditions. Results are informational
        and should be discussed with a qualified healthcare provider.
      </p>
      <p className="text-xs opacity-60">© {new Date().getFullYear()} RutuChakra</p>
    </footer>
  )
}