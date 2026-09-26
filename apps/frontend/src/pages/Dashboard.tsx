import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/react'
import { useTranslation } from 'react-i18next'
import { fetchPredictionHistory, fetchPredictionById } from '../utils/pcos'
import type { HistoricalPrediction } from '../utils/pcos'
import { fetchCycleLogs } from '../utils/cycles'
import type { CycleInsights } from '../utils/cycles'
import { fetchHabitsToday, logHabit, BUILTIN_HABIT_NAMES } from '../utils/habits'
import type { HabitToday } from '../utils/habits'
import { localeTag } from '../utils/date'
import { ProbabilityRing } from '../components/ProbabilityRing'

type LatestPrediction = HistoricalPrediction & { id: string }

const RISK_BADGE = {
  Low: 'badge-success',
  Moderate: 'badge-warning',
  High: 'badge-error',
} as const

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(localeTag(), { day: 'numeric', month: 'long', year: 'numeric' })
}

function CardSkeleton({ hero = false }: { hero?: boolean }) {
  return (
    <div className={`card bg-base-100 border border-base-300 ${hero ? 'shadow-warm' : 'shadow-sm'}`}>
      <div className="card-body gap-3">
        <div className="skeleton h-4 w-24" />
        <div className="skeleton h-8 w-32" />
        <div className="skeleton h-3 w-full" />
      </div>
    </div>
  )
}

function ErrorCard({ title, message }: { title: string; message: string }) {
  return (
    <div className="card bg-base-100 shadow-sm border border-base-300">
      <div className="card-body gap-2">
        <h2 className="kicker">{title}</h2>
        <p className="text-sm text-error">{message}</p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { t } = useTranslation()
  const { getToken } = useAuth()
  const navigate = useNavigate()

  const [predictionLoading, setPredictionLoading] = useState(true)
  const [predictionError, setPredictionError] = useState(false)
  const [latest, setLatest] = useState<LatestPrediction | null>(null)

  const [cycleLoading, setCycleLoading] = useState(true)
  const [cycleError, setCycleError] = useState(false)
  const [cycleInsights, setCycleInsights] = useState<CycleInsights | null>(null)

  const [habitsLoading, setHabitsLoading] = useState(true)
  const [habitsError, setHabitsError] = useState(false)
  const [habits, setHabits] = useState<HabitToday[]>([])
  const [habitSaving, setHabitSaving] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const entries = await fetchPredictionHistory(getToken)
        const mostRecent = entries[0]
        if (!mostRecent) return
        const detail = await fetchPredictionById(mostRecent.id, getToken)
        if (!cancelled) setLatest({ ...detail, id: mostRecent.id })
      } catch {
        if (!cancelled) setPredictionError(true)
      } finally {
        if (!cancelled) setPredictionLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await fetchCycleLogs(getToken)
        if (!cancelled) setCycleInsights(data.insights)
      } catch {
        if (!cancelled) setCycleError(true)
      } finally {
        if (!cancelled) setCycleLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await fetchHabitsToday(getToken)
        if (!cancelled) setHabits(data.habits)
      } catch {
        if (!cancelled) setHabitsError(true)
      } finally {
        if (!cancelled) setHabitsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function toggleHabit(habit: HabitToday) {
    if (habit.type !== 'boolean') return
    setHabitSaving(habit.name)
    const nextValue = !(habit.valueToday === true)
    try {
      await logHabit(habit.name, nextValue, habit.isCustom, getToken)
      setHabits((prev) => prev.map((h) => (h.name === habit.name ? { ...h, valueToday: nextValue } : h)))
    } catch {
      // Habit Tracker page itself surfaces this in detail; a quiet no-op here is fine for a quick widget.
    } finally {
      setHabitSaving(null)
    }
  }

  const boolHabits = habits.filter((h) => h.type === 'boolean')

  return (
    <div className="px-4 sm:px-8 py-8 max-w-5xl mx-auto">
      <div className="mb-8 animate-fade-down">
        <h1 className="font-display text-3xl font-semibold text-base-content">{t('dashboard.title')}</h1>
        <p className="text-sm text-base-content/60 mt-1">{t('dashboard.subtitle')}</p>
      </div>

      {/* Hero: latest prediction */}
      <div className="mb-6 animate-fade-up">
        {predictionLoading ? (
          <CardSkeleton hero />
        ) : predictionError ? (
          <ErrorCard title={t('dashboard.latestPrediction.cardTitle')} message={t('dashboard.loadFailed')} />
        ) : (
          <div className="card bg-base-100 shadow-warm border border-base-300">
            <div className="card-body">
              {latest ? (
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <ProbabilityRing probability={latest.probability} risk={latest.risk_level} size="lg" />
                  <div className="flex-1 text-center sm:text-left">
                    <h2 className="kicker">{t('dashboard.latestPrediction.cardTitle')}</h2>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
                      <span className={`badge ${RISK_BADGE[latest.risk_level]}`}>
                        {t(`riskLevels.${latest.risk_level.toLowerCase()}`)}
                      </span>
                      <span className="text-xs text-base-content/50">
                        {t('dashboard.latestPrediction.checkedOn', { date: formatDate(latest.createdAt) })}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate(`/history/${latest.id}`)}
                      className="btn btn-outline btn-sm rounded-full mt-4"
                    >
                      {t('dashboard.latestPrediction.viewResult')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center sm:text-left py-4">
                  <h2 className="kicker">{t('dashboard.latestPrediction.cardTitle')}</h2>
                  <p className="text-base-content/60 mt-2 max-w-sm mx-auto sm:mx-0">
                    {t('dashboard.latestPrediction.emptyBody')}
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/predict')}
                    className="btn btn-primary rounded-full mt-4"
                  >
                    {t('dashboard.latestPrediction.emptyCta')}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Secondary, quiet grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {!predictionLoading && !predictionError && latest && latest.top_factors.length > 0 && (
          <div className="card bg-base-100 shadow-sm border border-base-300">
            <div className="card-body gap-2">
              <h2 className="kicker">{t('dashboard.topFactors.cardTitle')}</h2>
              <ul className="flex flex-col gap-2 mt-1">
                {latest.top_factors.slice(0, 3).map((f) => (
                  <li key={f.factor} className="flex items-center justify-between text-sm">
                    <span className="text-base-content/80">{t(`resultFactors.${f.factor}`, { defaultValue: f.factor })}</span>
                    <span className={f.impact === 'increases' ? 'text-error' : 'text-success'}>
                      {f.impact === 'increases' ? '↑' : '↓'}
                    </span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => navigate(`/history/${latest.id}`)}
                className="link link-primary text-sm self-start mt-1"
              >
                {t('dashboard.topFactors.seeAll')}
              </button>
            </div>
          </div>
        )}

        {cycleLoading ? (
          <CardSkeleton />
        ) : cycleError ? (
          <ErrorCard title={t('dashboard.cycleSummary.cardTitle')} message={t('dashboard.loadFailed')} />
        ) : (
          <div className="card bg-base-100 shadow-sm border border-base-300">
            <div className="card-body gap-2">
              <h2 className="kicker">{t('dashboard.cycleSummary.cardTitle')}</h2>
              {cycleInsights?.mostRecentStart ? (
                <>
                  <p className="text-xs text-base-content/50 mt-1">{t('dashboard.cycleSummary.lastLogged')}</p>
                  <p className="font-display text-lg font-semibold tabular-nums">
                    {new Date(cycleInsights.mostRecentStart).toLocaleDateString(localeTag(), {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/cycle')}
                    className="link link-primary text-sm self-start mt-1"
                  >
                    {t('appShell.nav.cycle')}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-base-content/60 mt-1">{t('dashboard.cycleSummary.emptyBody')}</p>
                  <button
                    type="button"
                    onClick={() => navigate('/cycle')}
                    className="btn btn-outline btn-sm rounded-full mt-2 self-start"
                  >
                    {t('dashboard.cycleSummary.emptyCta')}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {habitsLoading ? (
          <CardSkeleton />
        ) : habitsError ? (
          <ErrorCard title={t('dashboard.todaysHabits.cardTitle')} message={t('dashboard.loadFailed')} />
        ) : (
          <div className="card bg-base-100 shadow-sm border border-base-300 md:col-span-2 lg:col-span-1">
            <div className="card-body gap-2">
              <h2 className="kicker">{t('dashboard.todaysHabits.cardTitle')}</h2>
              {boolHabits.length === 0 ? (
                <>
                  <p className="text-sm text-base-content/60 mt-1">{t('dashboard.todaysHabits.emptyBody')}</p>
                  <button
                    type="button"
                    onClick={() => navigate('/habits')}
                    className="btn btn-outline btn-sm rounded-full mt-2 self-start"
                  >
                    {t('dashboard.todaysHabits.emptyCta')}
                  </button>
                </>
              ) : (
                <ul className="flex flex-col gap-1.5 mt-1">
                  {boolHabits.slice(0, 5).map((h) => {
                    const isBuiltin = BUILTIN_HABIT_NAMES.has(h.name)
                    const label = isBuiltin ? t(`habitTracker.builtins.${h.name}.label`) : h.label
                    const done = h.valueToday === true
                    return (
                      <li key={h.name} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={done}
                          disabled={habitSaving === h.name}
                          onChange={() => toggleHabit(h)}
                          className="checkbox checkbox-sm checkbox-success"
                        />
                        <span className={done ? 'line-through text-base-content/40' : 'text-base-content/80'}>
                          {label}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
              <button
                type="button"
                onClick={() => navigate('/habits')}
                className="link link-primary text-sm self-start mt-1"
              >
                {t('dashboard.todaysHabits.seeAll')}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8">
        <h2 className="kicker mb-3">{t('dashboard.quickActions.cardTitle')}</h2>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => navigate('/predict')} className="btn btn-primary btn-sm rounded-full">
            {t('dashboard.quickActions.newPrediction')}
          </button>
          <button type="button" onClick={() => navigate('/cycle')} className="btn btn-outline btn-sm rounded-full">
            {t('dashboard.quickActions.logCycle')}
          </button>
          <button type="button" onClick={() => navigate('/habits')} className="btn btn-outline btn-sm rounded-full">
            {t('dashboard.quickActions.manageHabits')}
          </button>
          <button type="button" onClick={() => navigate('/assistant')} className="btn btn-secondary btn-sm rounded-full">
            {t('dashboard.quickActions.askAssistant')}
          </button>
        </div>
      </div>
    </div>
  )
}