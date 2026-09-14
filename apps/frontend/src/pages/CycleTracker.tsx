import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@clerk/react'
import Calendar from '../components/cycle/Calender'
import InsightsPanel from '../components/cycle/InsightsPanel'
import EditCycleSheet from '../components/cycle/EditCycleSheet'
import CycleHistoryTabs from '../components/cycle/CycleHistoryTabs'
import CycleLengthChart from '../components/cycle/CycleLengthChart'
import {
  fetchCycleLogs, createCycleLog, updateCycleLog, deleteCycleLog,
} from '../utils/cycles'
import type { CycleData, CycleLog } from '../utils/cycles'

export default function CycleTracker() {
  const { getToken } = useAuth()
  const [data, setData] = useState<CycleData | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [existingLog, setExistingLog] = useState<CycleLog | null>(null)

  const load = useCallback(() => {
    fetchCycleLogs(getToken)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load cycle data.'))
  }, [])

  useEffect(() => { load() }, [load])

  function handleSelectDate(date: Date, log: CycleLog | null) {
    setSelectedDate(date)
    setExistingLog(log)
    setModalOpen(true)
  }

  function handleEditFromList(log: CycleLog) {
    setSelectedDate(new Date(log.startDate))
    setExistingLog(log)
    setModalOpen(true)
  }

  async function handleSave(startDate: string, endDate: string | null) {
    setSaving(true)
    try {
      if (existingLog) {
        await updateCycleLog(existingLog.id, startDate, endDate, getToken)
      } else {
        await createCycleLog(startDate, endDate, getToken)
      }
      setModalOpen(false)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setSaving(true)
    try {
      await deleteCycleLog(id, getToken)
      setModalOpen(false)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-base-100 px-4 py-10">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-base-content">Cycle tracker</h1>
          <p className="text-sm text-base-content/70 mt-1">
            Tap any date to log or edit a period.
          </p>
        </div>

        {error && (
          <div className="alert alert-error bg-error/10 border-error/30 text-error mb-6">
            <span>{error}</span>
          </div>
        )}

        {!data ? (
          <div className="space-y-4">
            <div className="skeleton h-96 w-full rounded-2xl" />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="md:w-3/5">
                <Calendar logs={data.logs} onSelectDate={handleSelectDate} />
              </div>
              <div className="md:w-2/5">
                <InsightsPanel insights={data.insights} />
              </div>
            </div>

            <CycleLengthChart logs={data.logs} />
            <CycleHistoryTabs logs={data.logs} onEdit={handleEditFromList} />
          </div>
        )}

        <EditCycleSheet
          open={modalOpen}
          selectedDate={selectedDate}
          existingLog={existingLog}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
          onDelete={handleDelete}
          saving={saving}
        />
      </div>
    </div>
  )
}