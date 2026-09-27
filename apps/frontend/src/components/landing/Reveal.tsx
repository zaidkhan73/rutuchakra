import { motion, useReducedMotion, type Variants } from 'framer-motion'
import type { ReactNode } from 'react'

export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
}: {
  children: ReactNode
  delay?: number
  y?: number
  className?: string
}) {
  const shouldReduceMotion = useReducedMotion()

  const variants: Variants = {
    hidden: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : y,
      scale: shouldReduceMotion ? 1 : 0.97,
      filter: shouldReduceMotion ? 'blur(0px)' : 'blur(10px)',
      transition: { duration: shouldReduceMotion ? 0.01 : 0.7, ease: [0.4, 0, 1, 1] },
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: 'blur(0px)',
      transition: { duration: shouldReduceMotion ? 0.01 : 1.15, delay, ease: [0.16, 1, 0.3, 1] },
    },
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false, amount: 0.3 }}
      variants={variants}
    >
      {children}
    </motion.div>
  )
}

/** Stagger container — wrap a list of children, each becomes a Reveal-style child via `RevealItem`. */
export function RevealGroup({
  children,
  className,
  staggerDelay = 0.1,
}: {
  children: ReactNode
  className?: string
  staggerDelay?: number
}) {
  const shouldReduceMotion = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false, amount: 0.2 }}
      variants={{
        visible: {
          transition: { staggerChildren: shouldReduceMotion ? 0 : staggerDelay, staggerDirection: 1 },
        },
        hidden: {
          transition: { staggerChildren: shouldReduceMotion ? 0 : staggerDelay * 0.6, staggerDirection: -1 },
        },
      }}
    >
      {children}
    </motion.div>
  )
}

export function RevealItem({ children, className, y = 20 }: { children: ReactNode; className?: string; y?: number }) {
  const shouldReduceMotion = useReducedMotion()
  const variants: Variants = {
    hidden: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : y,
      scale: shouldReduceMotion ? 1 : 0.97,
      filter: shouldReduceMotion ? 'blur(0px)' : 'blur(8px)',
      transition: { duration: shouldReduceMotion ? 0.01 : 0.6, ease: [0.4, 0, 1, 1] },
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: 'blur(0px)',
      transition: { duration: shouldReduceMotion ? 0.01 : 0.9, ease: [0.16, 1, 0.3, 1] },
    },
  }
  return (
    <motion.div className={className} variants={variants}>
      {children}
    </motion.div>
  )
}