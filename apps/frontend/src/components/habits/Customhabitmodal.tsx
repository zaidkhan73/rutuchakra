import { useEffect, useState } from 'react'
import type { HabitToday } from '../../utils/habits'

const UNIT_PRESETS = ['L', 'hrs', 'glasses', 'minutes', 'steps', 'times', 'Other']

export default function CustomHabitModal({
  open,
  existingHabit,
  onClose,
  onSave,
  onDelete,
  saving,
}: {
  open: boolean
  existingHabit: HabitToday | null
  onClose: () => void
  onSave: (input: { name: string; type: 'boolean' | 'numeric'; unit?: string; target?: number }) => void
  onDelete: (id: string) => void
  saving?: boolean
}) {
  const [name, setName] = useState('')
  const [type, setType] = useState<'boolean' | 'numeric'>('boolean')
  const [unitPreset, setUnitPreset] = useState(UNIT_PRESETS[0])
  const [customUnit, setCustomUnit] = useState('')
  const [target, setTarget] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  useEffect(() => {
    if (existingHabit) {
      setName(existingHabit.label)
      setType(existingHabit.type)
      if (existingHabit.unit && UNIT_PRESETS.includes(existingHabit.unit)) {
        setUnitPreset(existingHabit.unit)
      } else if (existingHabit.unit) {
        setUnitPreset('Other')
        setCustomUnit(existingHabit.unit)
      }
      setTarget(existingHabit.target ? String(existingHabit.target) : '')
    } else {
      setName('')
      setType('boolean')
      setUnitPreset(UNIT_PRESETS[0])
      setCustomUnit('')
      setTarget('')
    }
    setConfirmingDelete(false)
  }, [existingHabit, open])

  if (!open) return null

  const resolvedUnit = unitPreset === 'Other' ? customUnit : unitPreset
  const canSave = name.trim() && (type === 'boolean' || (resolvedUnit && Number(target) > 0))

  return (
    <dialog open className="modal modal-bottom sm:modal-middle">
      <div className="modal-box">
        {confirmingDelete ? (
          <>
            <h3 className="font-semibold text-base-content">Remove "{name}"?</h3>
            <p className="text-sm text-base-content/70 mt-2">
              This deletes the habit and all of its logged history. This can't be undone.
            </p>
            <div className="modal-action">
              <button type="button" className="btn btn-outline" onClick={() => setConfirmingDelete(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-error"
                onClick={() => existingHabit?.id && onDelete(existingHabit.id)}
              >
                Delete
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="font-semibold text-base-content">
              {existingHabit ? 'Edit habit' : 'Add a custom habit'}
            </h3>

            <div className="flex flex-col gap-3 mt-4">
              <label className="form-control">
                <span className="label-text text-sm mb-1">Habit name</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Meditation"
                  maxLength={40}
                  className="input input-bordered"
                />
              </label>

              {!existingHabit && (
                <div className="flex flex-col gap-1.5">
                  <span className="label-text text-sm">Type</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setType('boolean')}
                      className={`btn btn-sm flex-1 ${type === 'boolean' ? 'btn-primary' : 'btn-outline'}`}
                    >
                      Yes / No check-off
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('numeric')}
                      className={`btn btn-sm flex-1 ${type === 'numeric' ? 'btn-primary' : 'btn-outline'}`}
                    >
                      Quantity based
                    </button>
                  </div>
                </div>
              )}

              {type === 'numeric' && (
                <>
                  <label className="form-control">
                    <span className="label-text text-sm mb-1">Unit</span>
                    <select
                      value={unitPreset}
                      onChange={(e) => setUnitPreset(e.target.value)}
                      className="select select-bordered"
                    >
                      {UNIT_PRESETS.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </label>
                  {unitPreset === 'Other' && (
                    <input
                      type="text"
                      value={customUnit}
                      onChange={(e) => setCustomUnit(e.target.value)}
                      placeholder="e.g. cups"
                      className="input input-bordered"
                    />
                  )}
                  <label className="form-control">
                    <span className="label-text text-sm mb-1">Daily target</span>
                    <input
                      type="number"
                      min={0}
                      value={target}
                      onChange={(e) => setTarget(e.target.value)}
                      placeholder="e.g. 8"
                      className="input input-bordered"
                    />
                  </label>
                </>
              )}
            </div>

            <div className="modal-action justify-between">
              <div>
                {existingHabit && (
                  <button type="button" className="btn btn-ghost text-error" onClick={() => setConfirmingDelete(true)}>
                    Delete
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!canSave || saving}
                  onClick={() => onSave({
                    name: name.trim(),
                    type,
                    unit: type === 'numeric' ? resolvedUnit : undefined,
                    target: type === 'numeric' ? Number(target) : undefined,
                  })}
                >
                  {saving ? <span className="loading loading-spinner loading-sm" /> : 'Save'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="button" onClick={onClose}>close</button>
      </form>
    </dialog>
  )
}