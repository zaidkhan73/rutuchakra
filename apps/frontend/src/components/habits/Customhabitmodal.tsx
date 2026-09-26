import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { HabitToday } from '../../utils/habits'

const UNIT_PRESETS = ['L', 'hrs', 'glasses', 'minutes', 'steps', 'times', 'Other']
const UNIT_PRESET_KEYS: Record<string, string> = {
  L: 'habitTracker.modal.units.L',
  hrs: 'habitTracker.modal.units.hrs',
  glasses: 'habitTracker.modal.units.glasses',
  minutes: 'habitTracker.modal.units.minutes',
  steps: 'habitTracker.modal.units.steps',
  times: 'habitTracker.modal.units.times',
  Other: 'habitTracker.modal.units.other',
}

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
  const { t } = useTranslation()
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
            <h3 className="font-semibold text-base-content">{t('habitTracker.modal.removeConfirmTitle', { name })}</h3>
            <p className="text-sm text-base-content/70 mt-2">
              {t('habitTracker.modal.removeConfirmBody')}
            </p>
            <div className="modal-action">
              <button type="button" className="btn btn-outline" onClick={() => setConfirmingDelete(false)}>
                {t('habitTracker.modal.cancel')}
              </button>
              <button
                type="button"
                className="btn btn-error"
                onClick={() => existingHabit?.id && onDelete(existingHabit.id)}
              >
                {t('habitTracker.modal.delete')}
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="font-semibold text-base-content">
              {existingHabit ? t('habitTracker.modal.editTitle') : t('habitTracker.modal.addTitle')}
            </h3>

            <div className="flex flex-col gap-3 mt-4">
              <label className="form-control">
                <span className="label-text text-sm mb-1">{t('habitTracker.modal.nameLabel')}</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('habitTracker.modal.namePlaceholder')}
                  maxLength={40}
                  className="input input-bordered"
                />
              </label>

              {!existingHabit && (
                <div className="flex flex-col gap-1.5">
                  <span className="label-text text-sm">{t('habitTracker.modal.typeLabel')}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setType('boolean')}
                      className={`btn btn-sm flex-1 ${type === 'boolean' ? 'btn-primary' : 'btn-outline'}`}
                    >
                      {t('habitTracker.modal.typeBoolean')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('numeric')}
                      className={`btn btn-sm flex-1 ${type === 'numeric' ? 'btn-primary' : 'btn-outline'}`}
                    >
                      {t('habitTracker.modal.typeNumeric')}
                    </button>
                  </div>
                </div>
              )}

              {type === 'numeric' && (
                <>
                  <label className="form-control">
                    <span className="label-text text-sm mb-1">{t('habitTracker.modal.unitLabel')}</span>
                    <select
                      value={unitPreset}
                      onChange={(e) => setUnitPreset(e.target.value)}
                      className="select select-bordered"
                    >
                      {UNIT_PRESETS.map((u) => <option key={u} value={u}>{t(UNIT_PRESET_KEYS[u])}</option>)}
                    </select>
                  </label>
                  {unitPreset === 'Other' && (
                    <input
                      type="text"
                      value={customUnit}
                      onChange={(e) => setCustomUnit(e.target.value)}
                      placeholder={t('habitTracker.modal.unitOtherPlaceholder')}
                      className="input input-bordered"
                    />
                  )}
                  <label className="form-control">
                    <span className="label-text text-sm mb-1">{t('habitTracker.modal.targetLabel')}</span>
                    <input
                      type="number"
                      min={0}
                      value={target}
                      onChange={(e) => setTarget(e.target.value)}
                      placeholder={t('habitTracker.modal.targetPlaceholder')}
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
                    {t('habitTracker.modal.delete')}
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button type="button" className="btn btn-outline" onClick={onClose}>{t('habitTracker.modal.cancel')}</button>
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
                  {saving ? <span className="loading loading-spinner loading-sm" /> : t('habitTracker.modal.save')}
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