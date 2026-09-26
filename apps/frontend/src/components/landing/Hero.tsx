import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'

const OUTER_PETALS = [
  { angle: 0, color: 'var(--color-primary)' },
  { angle: 45, color: 'var(--color-secondary)' },
  { angle: 90, color: 'var(--color-primary)' },
  { angle: 135, color: 'var(--color-secondary)' },
  { angle: 180, color: 'var(--color-primary)' },
  { angle: 225, color: 'var(--color-secondary)' },
  { angle: 270, color: 'var(--color-primary)' },
  { angle: 315, color: 'var(--color-secondary)' },
]

const INNER_PETALS = [
  { angle: 30 }, { angle: 90 }, { angle: 150 }, { angle: 210 }, { angle: 270 }, { angle: 330 },
]

function BloomMotif({
  scrollYProgress,
  reduceMotion,
}: {
  scrollYProgress: ReturnType<typeof useScroll>['scrollYProgress']
  reduceMotion: boolean
}) {
  const outerY = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : -22])
  const innerY = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : 16])

  return (
    <svg
      viewBox="0 0 400 400"
      className="w-full max-w-sm mx-auto overflow-visible"
      role="img"
      aria-label="Illustration of a blooming flower, symbolizing care and renewal"
    >
      <circle cx="200" cy="200" r="150" fill="none" stroke="var(--color-base-300)" strokeWidth="1" />

      {/* Outer petal ring */}
      <motion.g style={{ y: outerY }}>
        {OUTER_PETALS.map((p, i) => (
          <motion.ellipse
            key={`outer-${p.angle}`}
            cx="200"
            cy="122"
            rx="26"
            ry="74"
            fill={p.color}
            fillOpacity="0.85"
            style={{
              rotate: p.angle,
              originX: 0.5,
              originY: 1,
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.7, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
          />
        ))}
      </motion.g>

      {/* Inner petal ring, layered on top, offset angle */}
      <motion.g style={{ y: innerY }}>
        {INNER_PETALS.map((p, i) => (
          <motion.ellipse
            key={`inner-${p.angle}`}
            cx="200"
            cy="150"
            rx="17"
            ry="46"
            fill="var(--color-accent)"
            fillOpacity="0.9"
            style={{
              rotate: p.angle,
              originX: 0.5,
              originY: 1,
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
          />
        ))}
      </motion.g>

      {/* Center */}
      <motion.circle
        cx="200"
        cy="200"
        r="16"
        fill="var(--color-primary)"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      />
      <circle cx="200" cy="200" r="26" fill="var(--color-primary)" opacity="0.12" />
    </svg>
  )
}

export default function Hero() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const sectionRef = useRef<HTMLElement>(null)
  const reduceMotion = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  })

  return (
    <section ref={sectionRef} className="px-4 sm:px-8 py-16 md:py-24 overflow-hidden">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        <div className="text-center md:text-left order-2 md:order-1">
          <motion.p
            initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="kicker mb-4"
          >
            {t('hero.kicker')}
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: reduceMotion ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-4xl sm:text-5xl font-semibold leading-tight text-base-content"
          >
            {t('hero.title')}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: reduceMotion ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-5 text-lg text-base-content/70 max-w-md mx-auto md:mx-0"
          >
            {t('hero.subtitle')}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: reduceMotion ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex flex-col sm:flex-row gap-3 justify-center md:justify-start"
          >
            <div className="aura bg-pink-400 p-0.5">
              <button onClick={() => navigate('/login')} className="btn btn-primary btn-lg rounded-full shadow-warm">
                {t('hero.checkRisk')}
              </button>
            </div>

            <a href="#how-it-works" className="btn btn-outline btn-lg rounded-full">
              {t('hero.learnMore')}
            </a>
          </motion.div>
        </div>

        <div className="order-1 md:order-2">
          <BloomMotif scrollYProgress={scrollYProgress} reduceMotion={!!reduceMotion} />
        </div>
      </div>
    </section>
  )
}