import { motion, useReducedMotion } from 'framer-motion'

export default function AmbientBackground() {
  const reduceMotion = useReducedMotion()

  return (
    <div aria-hidden="true" className="fixed inset-0 -z-20 overflow-hidden pointer-events-none bg-base-100">
      <motion.div
        className="absolute -inset-[25%]"
        style={{
          background:
            'radial-gradient(45% 35% at 20% 20%, var(--color-accent) 0%, transparent 70%),' +
            'radial-gradient(40% 40% at 80% 30%, var(--color-secondary) 0%, transparent 70%),' +
            'radial-gradient(50% 40% at 50% 85%, var(--color-primary) 0%, transparent 70%)',
          opacity: 0.14,
          filter: 'blur(70px)',
          mixBlendMode: 'multiply',
        }}
        animate={reduceMotion ? undefined : { x: [0, 30, -24, 0], y: [0, -22, 26, 0] }}
        transition={reduceMotion ? undefined : { duration: 30, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}