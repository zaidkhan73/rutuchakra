import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'

const OUTER_PETALS = [
  { angle: 0 }, { angle: 45 }, { angle: 90 }, { angle: 135 },
  { angle: 180 }, { angle: 225 }, { angle: 270 }, { angle: 315 },
]

const INNER_PETALS = [
  { angle: 30 }, { angle: 90 }, { angle: 150 }, { angle: 210 }, { angle: 270 }, { angle: 330 },
]

const STAMEN_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315]

// Delicate sakura-style petal: rounded sides + a soft notch at the tip
function petalPath(rx: number, ry: number) {
  return `M0,0
    C -${rx} -${ry * 0.35}, -${rx * 0.72} -${ry * 0.88}, -${rx * 0.22} -${ry}
    Q 0 -${ry * 0.86}, ${rx * 0.22} -${ry}
    C ${rx * 0.72} -${ry * 0.88}, ${rx} -${ry * 0.35}, 0 0
    Z`
}

// Small 4-point sparkle/twinkle shape centered at (x, y)
function sparklePath(x: number, y: number, s: number) {
  return `M ${x} ${y - s}
    Q ${x + s * 0.22} ${y - s * 0.22}, ${x + s} ${y}
    Q ${x + s * 0.22} ${y + s * 0.22}, ${x} ${y + s}
    Q ${x - s * 0.22} ${y + s * 0.22}, ${x - s} ${y}
    Q ${x - s * 0.22} ${y - s * 0.22}, ${x} ${y - s}
    Z`
}

const SPARKLES = [
  { x: 55, y: 80, size: 9, delay: 0, duration: 2.2, tone: 'pink' },
  { x: 335, y: 70, size: 7, delay: 0.5, duration: 1.8, tone: 'gold' },
  { x: 45, y: 250, size: 6, delay: 1.1, duration: 2.4, tone: 'white' },
  { x: 350, y: 260, size: 8, delay: 0.3, duration: 2.0, tone: 'pink' },
  { x: 200, y: 22, size: 6, delay: 0.8, duration: 2.6, tone: 'gold' },
  { x: 95, y: 345, size: 7, delay: 1.4, duration: 2.1, tone: 'pink' },
  { x: 300, y: 348, size: 6, delay: 0.2, duration: 2.3, tone: 'white' },
  { x: 18, y: 165, size: 5, delay: 1.7, duration: 1.9, tone: 'gold' },
  { x: 382, y: 175, size: 5, delay: 0.9, duration: 2.5, tone: 'pink' },
]

const SPARKLE_COLORS: Record<string, string> = {
  pink: '#f9a8d4',
  gold: '#ffd76a',
  white: '#fff5fa',
}

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
      className="w-full max-w-lg mx-auto overflow-visible"
      role="img"
      aria-label="Illustration of a blooming flower with twinkling sparkles, symbolizing care and renewal"
    >
      <defs>
        <radialGradient id="outerPetalGrad" cx="50%" cy="12%" r="95%">
          <stop offset="0%" stopColor="#ffe8f3" />
          <stop offset="55%" stopColor="#f9a8d4" />
          <stop offset="100%" stopColor="var(--color-primary)" />
        </radialGradient>
        <radialGradient id="innerPetalGrad" cx="50%" cy="18%" r="95%">
          <stop offset="0%" stopColor="#fff2f8" />
          <stop offset="60%" stopColor="#fbcfe8" />
          <stop offset="100%" stopColor="var(--color-accent)" />
        </radialGradient>
        <radialGradient id="centerGrad" cx="35%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#fff0f6" />
          <stop offset="45%" stopColor="#f472b6" />
          <stop offset="100%" stopColor="var(--color-primary)" />
        </radialGradient>
      </defs>

      <circle cx="200" cy="200" r="150" fill="none" stroke="var(--color-base-700)" strokeWidth="1" />

      {/* Twinkling sparkles around the bloom */}
      <g>
        {SPARKLES.map((s, i) => (
          <motion.path
            key={`sparkle-${i}`}
            d={sparklePath(s.x, s.y, s.size)}
            fill={SPARKLE_COLORS[s.tone]}
            initial={{ opacity: 0.15, scale: 0.5 }}
            animate={
              reduceMotion
                ? { opacity: 0.7, scale: 1 }
                : { opacity: [0.15, 1, 0.15], scale: [0.5, 1.15, 0.5] }
            }
            transition={{
              duration: s.duration,
              delay: s.delay,
              repeat: reduceMotion ? 0 : Infinity,
              repeatType: 'loop',
              ease: 'easeInOut',
            }}
            style={{ transformOrigin: `${s.x}px ${s.y}px` }}
          />
        ))}
      </g>

      {/* Outer petal ring — sakura-style notched petals */}
      <motion.g style={{ y: outerY }}>
        {OUTER_PETALS.map((p, i) => (
          <g key={`outer-${p.angle}`} transform={`translate(200,200) rotate(${p.angle})`}>
            <motion.path
              d={petalPath(34, 150)}
              fill="url(#outerPetalGrad)"
              fillOpacity="0.92"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.7, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformOrigin: '0px 0px' }}
            />
          </g>
        ))}
      </motion.g>

      {/* Inner petal ring, layered on top */}
      <motion.g style={{ y: innerY }}>
        {INNER_PETALS.map((p, i) => (
          <g key={`inner-${p.angle}`} transform={`translate(200,200) rotate(${p.angle})`}>
            <motion.path
              d={petalPath(22, 92)}
              fill="url(#innerPetalGrad)"
              fillOpacity="0.95"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformOrigin: '0px 0px' }}
            />
          </g>
        ))}
      </motion.g>

      {/* Center with tiny gold stamens */}
      <motion.circle
        cx="200"
        cy="200"
        r="16"
        fill="url(#centerGrad)"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      />
      <circle cx="200" cy="200" r="26" fill="var(--color-primary)" opacity="0.12" />

      {STAMEN_ANGLES.map((angle, i) => (
        <motion.circle
          key={`stamen-${angle}`}
          cx={200 + 21 * Math.cos((angle * Math.PI) / 180)}
          cy={200 + 21 * Math.sin((angle * Math.PI) / 180)}
          r="2.4"
          fill="#f9a8d4"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.95 }}
          transition={{ duration: 0.4, delay: 0.95 + i * 0.03 }}
        />
      ))}
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
    <section ref={sectionRef} className="px-4 sm:px-8 py-2 md:py-2 overflow-hidden">
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
            <button onClick={() => navigate('/login')} className="btn btn-primary btn-lg rounded-full shadow-warm">
              {t('hero.checkRisk')}
            </button>

            <a href="#how-it-works" className="group inline-flex items-center gap-2 px-6 py-3 rounded-full border border-base-content/15 bg-base-100/50 backdrop-blur-sm shadow-sm text-base font-semibold text-base-content/80 hover:text-primary hover:border-primary/30 hover:shadow-md transition-all duration-300">
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