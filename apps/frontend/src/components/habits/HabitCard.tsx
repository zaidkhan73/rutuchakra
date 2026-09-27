import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BUILTIN_HABIT_NAMES } from '../../utils/habits'
import type { HabitToday } from '../../utils/habits'

const DEBOUNCE_MS = 700

function MinusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-3.5 h-3.5">
      <path d="M5 12h14" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-3.5 h-3.5">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <path d="M5 12l4 4 10-10" />
    </svg>
  )
}

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
  const { t } = useTranslation()
  const isBuiltin = BUILTIN_HABIT_NAMES.has(habit.name)
  const displayLabel = isBuiltin ? t(`habitTracker.builtins.${habit.name}.label`) : habit.label
  const displayUnit = isBuiltin ? t(`habitTracker.builtins.${habit.name}.unit`, { defaultValue: habit.unit ?? '' }) : (habit.unit ?? '')

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
      className={`card border-2 transition-all duration-300 h-full
        ${isDone ? 'border-success bg-success/10' : 'border-base-300 bg-base-100'}
        ${pulse ? 'scale-[1.04]' : 'scale-100'}`}
    >
      <div className="card-body p-4 items-center text-center relative h-full flex flex-col justify-between">
        {habit.isCustom && onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="absolute top-1.5 right-1.5 btn btn-ghost btn-xs px-1.5 text-base-content/40 hover:text-base-content"
            aria-label={t('habitTracker.card.editAria')}
          >
            ✎
          </button>
        )}

        {/* Top group: icon + label — anchored to the top of every card */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="text-2xl">{habit.icon ?? '⭐'}</span>
            {habit.isCustom && <span className="badge badge-ghost badge-xs">custom</span>}
          </div>
          <p className="text-sm font-medium text-base-content">{displayLabel}</p>
        </div>

        {/* Bottom group: action control + goal/streak — anchored to the bottom of every card */}
        <div className="flex flex-col items-center gap-2 pt-3">
          {habit.type === 'boolean' ? (
            <button
              type="button"
              onClick={toggleBoolean}
              disabled={saving}
              className={`rounded-full px-4 py-1.5 text-sm font-medium inline-flex items-center gap-1.5 transition-all
                disabled:opacity-50 disabled:cursor-not-allowed
                ${isDone ? 'bg-success text-success-content' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
            >
              <CheckIcon />
              {isDone ? t('habitTracker.card.done') : t('habitTracker.card.markDone')}
            </button>
          ) : (
            <div className="flex items-center gap-2.5 bg-base-200 rounded-full px-1.5 py-1.5">
              <button
                type="button"
                onClick={() => stepNumeric(-1)}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-base-100 text-primary shadow-sm hover:bg-primary/10 active:scale-95 transition-all"
              >
                <MinusIcon />
              </button>
              <span className="font-display text-base font-semibold tabular-nums w-8 text-center">
                {localValue}
              </span>
              <button
                type="button"
                onClick={() => stepNumeric(1)}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-base-100 text-primary shadow-sm hover:bg-primary/10 active:scale-95 transition-all"
              >
                <PlusIcon />
              </button>
            </div>
          )}

          {habit.type === 'numeric' && habit.target && (
            <p className="text-xs text-base-content/50">{t('habitTracker.card.goal', { target: habit.target, unit: displayUnit })}</p>
          )}

          {habit.streak > 0 && (
            <span className="badge badge-secondary badge-sm">🔥 {t('habitTracker.card.streak', { count: habit.streak })}</span>
          )}
        </div>
      </div>
    </div>
  )
}