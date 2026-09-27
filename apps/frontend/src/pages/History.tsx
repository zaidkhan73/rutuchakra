import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/react'
import { useTranslation } from 'react-i18next'
import TrendChart from '../components/history/TrendChart'
import HistoryListItem from '../components/history/HistoryListItem'
import { fetchPredictionHistory } from '../utils/pcos'
import type { HistoryEntry } from '../utils/pcos'

function EmptyMotif() {
  return (
    <svg viewBox="0 0 120 120" className="w-24 h-24 mx-auto opacity-40" aria-hidden="true">
      <circle cx="60" cy="60" r="45" fill="none" stroke="var(--color-primary)" strokeWidth="4" strokeDasharray="8 6" />
      <circle cx="60" cy="60" r="24" fill="none" stroke="var(--color-secondary)" strokeWidth="4" strokeDasharray="6 5" />
    </svg>
  )
}

function LoadingSkeleton() {
  return (
    <div className="w-full max-w-3xl space-y-6">
      <div className="skeleton h-64 w-full rounded-2xl" />
      <div className="space-y-3">
        <div className="skeleton h-16 w-full rounded-xl" />
        <div className="skeleton h-16 w-full rounded-xl" />
        <div className="skeleton h-16 w-full rounded-xl" />
      </div>
    </div>
  )
}

export default function History() {
  const { t } = useTranslation()
  const { getToken } = useAuth()
  const navigate = useNavigate()
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchPredictionHistory(getToken)
      .then(setEntries)
      .catch((err) => setError(err instanceof Error ? err.message : t('history.errors.loadFailed')))
  }, [])

  return (
    <div className="min-h-screen bg-base-100 px-4 py-10 flex flex-col items-center">
      <div className="w-full max-w-3xl mb-8">
        <h1 className="font-display text-2xl font-semibold text-base-content">{t('history.title')}</h1>
        <p className="text-sm text-base-content/70 mt-1">
          {t('history.subtitle')}
        </p>
      </div>

      {entries === null && !error && <LoadingSkeleton />}

      {error && (
        <div className="alert alert-error bg-error/10 border-error/30 text-error max-w-3xl w-full">
          <span>{error}</span>
        </div>
      )}

      {entries !== null && entries.length === 0 && (
        <div className="text-center max-w-sm mt-8">
          <EmptyMotif />
          <p className="text-base-content/70 mt-4">{t('history.empty.message')}</p>
          <button type="button" onClick={() => navigate('/predict')} className="btn btn-primary rounded-full mt-5">
            {t('history.empty.cta')}
          </button>
        </div>
      )}

      {entries !== null && entries.length > 0 && (
        <div className="w-full max-w-3xl flex flex-col gap-8">
          <TrendChart entries={entries} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {entries.map((entry) => (
              <HistoryListItem key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}