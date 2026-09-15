import { useEffect, useRef, useState } from 'react'
import type { HabitToday } from '../../utils/habits'

const DEBOUNCE_MS = 700

export default function HabitCard({
  habit,
  onLog,
  onEdit,
  saving,
}: {
  habit: HabitToday
  onLog: (value: boolean | number) => void
  onEdit?: () => void
  saving?: boolean
}) {
  const [pulse, setPulse] = useState(false)
  const [localValue, setLocalValue] = useState<number>(
    typeof habit.valueToday === 'number' ? habit.valueToday : 0
  )

  // Refs so the unmount-cleanup effect (which only runs once) can always see
  // the latest value/callback instead of a stale one from its first render.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const localValueRef = useRef(localValue)
  const onLogRef = useRef(onLog)
  localValueRef.current = localValue
  onLogRef.current = onLog

  // Stay in sync with the server value when it changes from outside (e.g. a
  // fresh page load) — but never while a debounced save is still pending,
  // or we'd stomp the user's in-progress clicks.
  useEffect(() => {
    if (debounceRef.current) return
    setLocalValue(typeof habit.valueToday === 'number' ? habit.valueToday : 0)
  }, [habit.valueToday])

  // Flush any pending save if the component unmounts mid-debounce (e.g. user
  // navigates away right after clicking), so the last few clicks aren't lost.
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        onLogRef.current(localValueRef.current)
      }
    }
  }, [])

  function triggerPulse() {
    setPulse(true)
    setTimeout(() => setPulse(false), 400)
  }

  const isDone = habit.type === 'boolean'
    ? habit.valueToday === true
    : localValue >= (habit.target ?? Infinity)

  function toggleBoolean() {
    const next = !(habit.valueToday === true)
    if (next) triggerPulse()
    onLog(next)
  }

  function stepNumeric(delta: number) {
    const next = Math.max(0, localValue + delta)
    if (habit.target && next >= habit.target && localValue < habit.target) triggerPulse()
    setLocalValue(next)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onLog(next)
      debounceRef.current = null
    }, DEBOUNCE_MS)
  }

  return (
    <div
      className={`card border-2 transition-all duration-300
        ${isDone ? 'border-success bg-success/10' : 'border-base-300 bg-base-100'}
        ${pulse ? 'scale-[1.04]' : 'scale-100'}`}
    >
      <div className="card-body p-4 items-center text-center gap-2 relative">
        {habit.isCustom && onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="absolute top-1.5 right-1.5 btn btn-ghost btn-xs px-1.5 text-base-content/40 hover:text-base-content"
            aria-label="Edit habit"
          >
            ✎
          </button>
        )}
        <div className="flex items-center gap-1">
          <span className="text-2xl">{habit.icon ?? '⭐'}</span>
          {habit.isCustom && <span className="badge badge-ghost badge-xs">custom</span>}
        </div>
        <p className="text-sm font-medium text-base-content">{habit.label}</p>

        {habit.type === 'boolean' ? (
          <button
            type="button"
            onClick={toggleBoolean}
            disabled={saving}
            className={`btn btn-sm mt-1 ${isDone ? 'btn-success' : 'btn-outline'}`}
          >
            {isDone ? 'Done ✓' : 'Mark done'}
          </button>
        ) : (
          <div className="flex items-center gap-2 mt-1">
            <button
              type="button"
              onClick={() => stepNumeric(-1)}
              className="btn btn-circle btn-outline btn-xs"
            >
              −
            </button>
            <span className="text-lg font-bold tabular-nums w-10">
              {localValue}
            </span>
            <button
              type="button"
              onClick={() => stepNumeric(1)}
              className="btn btn-circle btn-outline btn-xs"
            >
              +
            </button>
          </div>
        )}
        {habit.type === 'numeric' && habit.target && (
          <p className="text-xs text-base-content/50">Goal: {habit.target} {habit.unit}</p>
        )}

        {habit.streak > 0 && (
          <span className="badge badge-secondary badge-sm mt-1">🔥 {habit.streak} day streak</span>
        )}
      </div>
    </div>
  )
}       