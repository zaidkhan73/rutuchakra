import { motion, useReducedMotion } from 'framer-motion'

export default function SuggestedPrompts({
  prompts,
  onSelect,
}: {
  prompts: string[]
  onSelect: (prompt: string) => void
}) {
  const shouldReduceMotion = useReducedMotion()

  if (prompts.length === 0) return null

  return (
    <motion.div
      className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1"
      role="list"
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: shouldReduceMotion ? 0 : 0.06 } } }}
    >
      {prompts.map((prompt) => (
        <motion.button
          key={prompt}
          type="button"
          role="listitem"
          onClick={() => onSelect(prompt)}
          className="btn btn-outline btn-sm rounded-full shrink-0 whitespace-nowrap"
          variants={{
            hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 8 },
            visible: { opacity: 1, y: 0, transition: { duration: shouldReduceMotion ? 0.01 : 0.3 } },
          }}
        >
          {prompt}
        </motion.button>
      ))}
    </motion.div>
  )
}