export default function SuggestedPrompts({
  prompts,
  onSelect,
}: {
  prompts: string[]
  onSelect: (prompt: string) => void
}) {
  if (prompts.length === 0) return null

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1" role="list">
      {prompts.map((prompt) => (
        <button
          key={prompt}
          type="button"
          role="listitem"
          onClick={() => onSelect(prompt)}
          className="btn btn-outline btn-sm shrink-0 whitespace-nowrap"
        >
          {prompt}
        </button>
      ))}
    </div>
  )
}