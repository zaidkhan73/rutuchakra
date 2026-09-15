import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@clerk/react'
import HabitCard from '../components/habits/HabitCard'
import WeeklyGrid from '../components/habits/WeeklyGrid'
import CustomHabitModal from '../components/habits/Customhabitmodal'
import {
  fetchHabitsToday, fetchHabitsWeekly, logHabit, createCustomHabit, updateCustomHabit, deleteCustomHabit,
} from '../utils/habits'
import type { HabitsTodayData, WeeklyData, HabitToday } from '../utils/habits'

function EmptyMotif() {
  return (
    <svg viewBox="0 0 120 120" className="w-20 h-20 mx-auto opacity-40" aria-hidden="true">
      <circle cx="60" cy="60" r="42" fill="none" stroke="var(--color-accent)" strokeWidth="4" strokeDasharray="7 6" />
    </svg>
  )
}

export default function HabitTracker() {
  const { getToken } = useAuth()
  const [today, setToday] = useState<HabitsTodayData | null>(null)
  const [weekly, setWeekly] = useState<WeeklyData | null>(null)
  const [error, setError] = useState('')
  const [savingHabit, setSavingHabit] = useState<string | null>(null)
  const [habitModalOpen, setHabitModalOpen] = useState(false)
  const [editingHabit, setEditingHabit] = useState<HabitToday | null>(null)
  const [savingModal, setSavingModal] = useState(false)

  const load = useCallback(() => {
    Promise.all([fetchHabitsToday(getToken), fetchHabitsWeekly(getToken)])
      .then(([t, w]) => { setToday(t); setWeekly(w) })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load habits.'))
  }, [])

  useEffect(() => { load() }, [load])

  async function handleLog(habitName: string, value: boolean | number, isCustom: boolean) {
    setSavingHabit(habitName)
    setToday((prev) => prev && {
      ...prev,
      habits: prev.habits.map((h) => h.name === habitName ? { ...h, valueToday: value } : h),
    })
    try {
      await logHabit(habitName, value, isCustom, getToken)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.')
      load()
    } finally {
      setSavingHabit(null)
    }
  }

  async function handleSaveCustomHabit(input: { name: string; type: 'boolean' | 'numeric'; unit?: string; target?: number }) {
    setSavingModal(true)
    try {
      if (editingHabit?.id) {
        await updateCustomHabit(editingHabit.id, input, getToken)
      } else {
        await createCustomHabit(input, getToken)
      }
      setHabitModalOpen(false)
      setEditingHabit(null)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save habit.')
    } finally {
      setSavingModal(false)
    }
  }

  async function handleDeleteCustomHabit(id: string) {
    setSavingModal(true)
    try {
      await deleteCustomHabit(id, getToken)
      setHabitModalOpen(false)
      setEditingHabit(null)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete habit.')
    } finally {
      setSavingModal(false)
    }
  }

  const noActivityToday = today?.habits.every((h) => h.valueToday === null) ?? false

  return (
    <div className="min-h-screen bg-base-100 px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold text-base-content">Today's habits</h1>
            <p className="text-sm text-base-content/70 mt-1">Small wins, tracked daily.</p>
          </div>
          <button type="button" onClick={() => { setEditingHabit(null); setHabitModalOpen(true) }} className="btn btn-outline btn-sm">
            + Add habit
          </button>
        </div>

        {error && (
          <div className="alert alert-error bg-error/10 border-error/30 text-error my-4">
            <span>{error}</span>
          </div>
        )}

        {!today ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
          </div>
        ) : (
          <>
            {noActivityToday && today.hasEverLogged && (
              <div className="alert bg-accent/10 border-accent/30 text-base-content/80 text-sm my-4">
                <span>Nothing logged yet today — whenever you're ready.</span>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6 mb-8">
              {today.habits.map((habit) => (
                <HabitCard
                  key={habit.name}
                  habit={habit}
                  saving={savingHabit === habit.name}
                  onLog={(value) => handleLog(habit.name, value, habit.isCustom)}
                  onEdit={habit.isCustom ? () => { setEditingHabit(habit); setHabitModalOpen(true) } : undefined}
                />
              ))}
            </div>

            {today.hasEverLogged && weekly ? (
              <WeeklyGrid data={weekly} isNewUser={today.isNewUser} />
            ) : (
              <div className="text-center py-10">
                <EmptyMotif />
                <p className="text-base-content/70 mt-3">
                  Check off a habit above to start building your weekly picture.
                </p>
              </div>
            )}
          </>
        )}

        <CustomHabitModal
          open={habitModalOpen}
          existingHabit={editingHabit}
          onClose={() => { setHabitModalOpen(false); setEditingHabit(null) }}
          onSave={handleSaveCustomHabit}
          onDelete={handleDeleteCustomHabit}
          saving={savingModal}
        />
      </div>
    </div>
  )
}