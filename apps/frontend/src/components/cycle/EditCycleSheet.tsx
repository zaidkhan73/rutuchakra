import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toISODate } from '../../utils/date'
import type { CycleLog } from '../../utils/cycles'

const todayISO = toISODate(new Date())

export default function EditCycleSheet({
  open,
  selectedDate,
  existingLog,
  onClose,
  onSave,
  onDelete,
  saving,
}: {
  open: boolean
  selectedDate: Date | null
  existingLog: CycleLog | null
  onClose: () => void
  onSave: (startDate: string, endDate: string | null) => void
  onDelete: (id: string) => void
  saving?: boolean
}) {
  const { t } = useTranslation()
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  useEffect(() => {
    if (existingLog) {
      setStartDate(toISODate(new Date(existingLog.startDate)))
      setEndDate(existingLog.endDate ? toISODate(new Date(existingLog.endDate)) : '')
    } else if (selectedDate) {
      setStartDate(toISODate(selectedDate))
      setEndDate(toISODate(selectedDate))
    }
    setConfirmingDelete(false)
  }, [existingLog, selectedDate, open])

  if (!open) return null

  return (
    <dialog open className="modal modal-bottom sm:modal-middle">
      <div className="modal-box">
        {confirmingDelete ? (
          <>
            <h3 className="font-display font-semibold text-base-content">{t('cycleTracker.editSheet.removeConfirmTitle')}</h3>
            <p className="text-sm text-base-content/70 mt-2">
              {t('cycleTracker.editSheet.removeConfirmBody', { date: startDate })}
            </p>
            <div className="modal-action">
              <button type="button" className="btn btn-outline rounded-full" onClick={() => setConfirmingDelete(false)}>
                {t('cycleTracker.editSheet.cancel')}
              </button>
              <button
                type="button"
                className="btn btn-error rounded-full"
                onClick={() => existingLog && onDelete(existingLog.id)}
              >
                {t('cycleTracker.editSheet.delete')}
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="font-display font-semibold text-base-content">
              {existingLog ? t('cycleTracker.editSheet.editEntry') : t('cycleTracker.editSheet.logNew')}
            </h3>
            <div className="flex flex-col gap-3 mt-4">
              <label className="form-control">
                <span className="label-text text-sm mb-1">{t('cycleTracker.editSheet.startDate')}</span>
                <input
                  type="date"
                  value={startDate}
                  max={todayISO}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input input-bordered"
                />
              </label>
              <label className="form-control">
                <span className="label-text text-sm mb-1">{t('cycleTracker.editSheet.endDateOptional')}</span>
                <input
                  type="date"
                  value={endDate}
                  max={todayISO}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="input input-bordered"
                />
              </label>
            </div>
            <div className="modal-action justify-between">
              <div>
                {existingLog && (
                  <button type="button" className="btn btn-ghost text-error rounded-full" onClick={() => setConfirmingDelete(true)}>
                    {t('cycleTracker.editSheet.delete')}
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button type="button" className="btn btn-outline rounded-full" onClick={onClose}>
                  {t('cycleTracker.editSheet.cancel')}
                </button>
                <button
                  type="button"
                  className="btn btn-primary rounded-full"
                  disabled={!startDate || saving}
                  onClick={() => onSave(startDate, endDate || null)}
                >
                  {saving ? <span className="loading loading-spinner loading-sm" /> : t('cycleTracker.editSheet.save')}
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