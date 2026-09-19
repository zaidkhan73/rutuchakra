import type { ChatMessage } from '../../utils/chat'

export default function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  return (
    <div className={`chat ${isUser ? 'chat-end' : 'chat-start'}`}>
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
      >
        {message.content}
      </div>
      {!isUser && message.groundedInKB && (
        <div className="chat-footer opacity-70 text-xs mt-1">
          <span className="badge badge-outline badge-xs gap-1">
            <span className="text-[10px]">✓</span> based on verified sources
          </span>
        </div>
      )}
      {!isUser && message.isBlocked && (
        <div className="chat-footer opacity-50 text-xs mt-1">Let's keep to PCOD/PCOS topics</div>
      )}
    </div>
  )
}