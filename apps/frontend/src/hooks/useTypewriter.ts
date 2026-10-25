import { useEffect, useMemo, useRef, useState } from 'react'

const TICK_MS = 35
const MAX_DURATION_MS = 4500

/**
 * Splits text into words with their trailing whitespace attached, so
 * parts.join('') gives back the exact original string. Word-level (not
 * character-level) on purpose: slicing Devanagari by character can cut a
 * conjunct or vowel sign in half and flash broken glyphs.
 */
export function splitWords(text: string): string[] {
  return text.match(/\S+\s*|\s+/g) ?? []
}

/** Words revealed per tick so even a very long answer finishes within MAX_DURATION_MS. */
export function stepFor(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / (MAX_DURATION_MS / TICK_MS)))
}

/**
 * Reveals an already complete (and server-validated) answer word by word.
 * This is presentation only: the whole answer exists before the animation
 * starts, so nothing unvalidated is ever shown.
 */
export function useTypewriter(text: string, enabled: boolean, onTick?: () => void) {
  const parts = useMemo(() => splitWords(text), [text])
  const [shown, setShown] = useState(enabled ? 0 : parts.length)
  const onTickRef = useRef(onTick)
  onTickRef.current = onTick

  const done = shown >= parts.length

  useEffect(() => {
    if (!enabled || done) return
    const step = stepFor(parts.length)
    const id = window.setInterval(() => {
      setShown((n) => Math.min(parts.length, n + step))
    }, TICK_MS)
    return () => window.clearInterval(id)
  }, [enabled, done, parts.length])

  // Keep the newest words in view while the bubble grows.
  useEffect(() => {
    if (enabled && shown > 0) onTickRef.current?.()
  }, [enabled, shown])

  return {
    text: parts.slice(0, shown).join(''),
    done,
    skip: () => setShown(parts.length),
  }
}