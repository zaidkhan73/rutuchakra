import { useState } from 'react'

export default function ChatComposer({
  onSend,
  disabled,
}: {
  onSend: (message: string) => void
  disabled?: boolean
}) {
  const [value, setValue] = useState('')

  function handleSend() {
    if (!value.trim() || disabled) return
    onSend(value.trim())
    setValue('')
  }

  return (
    <div className="flex items-center gap-2 bg-base-100 shadow-md border border-base-300 rounded-full px-3 py-1.5 focus-within:border-primary/50 transition-colors">
      <span className="badge badge-ghost badge-xs shrink-0">EN</span>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        placeholder="Ask about PCOD, your result, or your tracking..."
        className="flex-1 bg-transparent outline-none text-sm py-2.5"
        disabled={disabled}
      />
      <button
        type="button"
        disabled
        aria-label="Voice input (coming soon)"
        title="Voice input coming soon"
        className="btn btn-ghost btn-circle btn-sm text-base-content/30"
      >
        🎤
      </button>
      <button
        type="button"
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        aria-label="Send message"
        className="btn btn-primary btn-circle btn-sm shadow-sm disabled:shadow-none"
      >
        ➤
      </button>
    </div>
  )
}