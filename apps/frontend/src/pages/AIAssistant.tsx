import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@clerk/react'
import ChatBubble from '../components/chat/ChatBubble'
import TypingIndicator from '../components/chat/TypingIndicator'
import SuggestedPrompts from '../components/chat/SuggestedPrompts'
import ChatComposer from '../components/chat/ChatComposer'
import ContextChip from '../components/chat/ContextChip'
import AIDisclaimerStrip from '../components/chat/AIDisclaimerStrip'
import { sendChatMessage, isBlockedCategory, getRedirectPrompts, RateLimitError } from '../utils/chat'
import type { ChatMessage, PredictionContext } from '../utils/chat'

const COLD_START_PROMPTS = [
  'What is PCOD?',
  'What foods should I avoid?',
  'Is my cycle length normal?',
]

let idCounter = 0
function nextId() {
  idCounter += 1
  return `msg-${idCounter}`
}

export default function AIAssistant() {
  const { getToken } = useAuth()
  const location = useLocation()
  const predictionContext = (location.state as { context?: PredictionContext } | null)?.context

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sending, setSending] = useState(false)
  const [rateLimited, setRateLimited] = useState(false)
  const [contextDrawerOpen, setContextDrawerOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const initialPrompts = predictionContext
    ? predictionContext.topFactors.slice(0, 3).map((f) => `Why is ${f.factor.toLowerCase()} a factor for me?`)
    : COLD_START_PROMPTS

  const [suggestedPrompts, setSuggestedPrompts] = useState(initialPrompts)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  async function handleSend(text: string) {
    const userMessage: ChatMessage = {
      id: nextId(),
      role: 'user',
      content: text,
      groundedInKB: false,
      category: '',
      isBlocked: false,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMessage])
    setSuggestedPrompts([])
    setSending(true)
    setRateLimited(false)

    try {
      const result = await sendChatMessage(text, getToken)
      const assistantMessage: ChatMessage = {
        id: nextId(),
        role: 'assistant',
        content: result.answer,
        groundedInKB: result.groundedInKB,
        category: result.category,
        isBlocked: isBlockedCategory(result.category),
        createdAt: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, assistantMessage])

      if (isBlockedCategory(result.category)) {
        setSuggestedPrompts(getRedirectPrompts())
      }
    } catch (err) {
      if (err instanceof RateLimitError) {
        setRateLimited(true)
      } else {
        setMessages((prev) => [...prev, {
          id: nextId(),
          role: 'assistant',
          content: err instanceof Error ? err.message : 'Something went wrong.',
          groundedInKB: false,
          category: 'error',
          isBlocked: false,
          createdAt: new Date().toISOString(),
        }])
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-base-100 flex flex-col md:flex-row">
      {predictionContext && (
        <>
          {/* Desktop: persistent side rail */}
          <div className="hidden md:block md:w-[25%] bg-base-200/50 border-r border-base-300 p-4">
            <ContextChip context={predictionContext} />
          </div>

          {/* Mobile: collapsible top drawer */}
          <div className="md:hidden bg-base-200/50 border-b border-base-300">
            <button
              type="button"
              onClick={() => setContextDrawerOpen((v) => !v)}
              className="w-full text-left px-4 py-2.5 text-xs text-base-content/60 flex items-center justify-between"
            >
              <span className="flex items-center gap-1.5">
                <span className="text-secondary">✦</span> Result context loaded
              </span>
              <span>{contextDrawerOpen ? '▲' : '▼'}</span>
            </button>
            {contextDrawerOpen && (
              <div className="px-4 pb-3">
                <ContextChip context={predictionContext} />
              </div>
            )}
          </div>
        </>
      )}

      <div className="flex-1 flex flex-col max-w-[720px] mx-auto w-full">
        <div className="sticky top-0 z-10 bg-base-100/90 backdrop-blur-sm border-b border-base-300 px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-content shrink-0">
            ✦
          </div>
          <div>
            <h1 className="font-semibold text-base-content text-sm leading-tight">AI Assistant</h1>
            <p className="text-xs text-base-content/50 leading-tight">Grounded in verified PCOD/PCOS information</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-3">
          {messages.length === 0 && (
            <div className="text-center mt-14">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-2xl mx-auto mb-3">
                ✦
              </div>
              <p className="text-sm text-base-content/50 max-w-[280px] mx-auto">
                Ask me anything about PCOD/PCOS, your result, or your tracking.
              </p>
            </div>
          )}
          {messages.map((m) => <ChatBubble key={m.id} message={m} />)}
          {sending && <TypingIndicator />}
          {rateLimited && (
            <div className="chat chat-start">
              <div className="chat-bubble bg-warning/20 text-warning-content text-sm">
                You're sending messages a bit fast — give it a moment before trying again.
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="px-4">
          <SuggestedPrompts prompts={suggestedPrompts} onSelect={handleSend} />
        </div>

        <div className="px-4 pb-2">
          <ChatComposer onSend={handleSend} disabled={sending} />
        </div>
        <AIDisclaimerStrip />
      </div>
    </div>
  )
}