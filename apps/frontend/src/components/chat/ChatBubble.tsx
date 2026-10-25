import { motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import type { ChatMessage } from '../../utils/chat'
import { useTypewriter } from '../../hooks/useTypewriter'

export default function ChatBubble({ message, onTick }: { message: ChatMessage; onTick?: () => void }) {
  const { t } = useTranslation()
  const isUser = message.role === 'user'
  const shouldReduceMotion = useReducedMotion()
  const typing = !isUser && !!message.animate && !shouldReduceMotion
  const tw = useTypewriter(message.content, typing, onTick)
  const revealing = typing && !tw.done

  return (
    <motion.div
      className={`chat ${isUser ? 'chat-end' : 'chat-start'}`}
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: shouldReduceMotion ? 0.01 : 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {!isUser && (
        <div className="chat-image avatar">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary text-primary-content flex items-center justify-center text-sm">
            ✦
          </div>
        </div>
      )}
      <div
        className={`chat-bubble text-sm whitespace-pre-line shadow-sm
          ${isUser
            ? 'bg-secondary text-secondary-content'
            : message.isBlocked
            ? 'bg-base-200 text-base-content/80 border border-base-300'
            : 'bg-gradient-to-br from-primary to-primary/85 text-primary-content'}`}
        onClick={revealing ? tw.skip : undefined}
      >
        {revealing ? (
          <>
            {/* screen readers get the full text once, not word-by-word updates */}
            <span className="sr-only">{message.content}</span>
            <span aria-hidden="true">{tw.text}</span>
          </>
        ) : (
          message.content
        )}
      </div>
      {!isUser && !revealing && message.groundedInKB && (
        <div className="chat-footer opacity-70 text-xs mt-1">
          <span className="badge badge-outline badge-xs gap-1">
            <span className="text-[10px]">✓</span> {t('aiAssistant.basedOnVerifiedSources')}
          </span>
        </div>
      )}
      {!isUser && !revealing && message.isBlocked && (
        <div className="chat-footer opacity-50 text-xs mt-1">{t('aiAssistant.scopeRedirectFooter')}</div>
      )}
    </motion.div>
  )
}