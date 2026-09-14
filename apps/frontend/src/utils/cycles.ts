export interface CycleLog {
  id: string
  startDate: string
  endDate: string | null
}

export type RegularityTrend = 'regular' | 'irregular' | 'mixed' | 'not_enough_data'

export interface CycleInsights {
  avgCycleLength: number | null
  regularityTrend: RegularityTrend
  mostRecentStart: string | null
}

export interface CycleData {
  logs: CycleLog[]
  insights: CycleInsights
}

type GetToken = () => Promise<string | null>

async function authedFetch(path: string, getToken: GetToken, options: RequestInit = {}) {
  const token = await getToken()
  const res = await fetch(`${import.meta.env.VITE_API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? 'Something went wrong. Please try again.')
  }
  return res.json()
}

export async function fetchCycleLogs(getToken: GetToken): Promise<CycleData> {
  const body = await authedFetch('/api/cycles', getToken)
  return body.data as CycleData
}

export async function createCycleLog(
  startDate: string,
  endDate: string | null,
  getToken: GetToken
): Promise<CycleLog> {
  const body = await authedFetch('/api/cycles', getToken, {
    method: 'POST',
    body: JSON.stringify({ startDate, endDate }),
  })
  return body.data as CycleLog
}

export async function updateCycleLog(
  id: string,
  startDate: string | null,
  endDate: string | null,
  getToken: GetToken
): Promise<CycleLog> {
  const body = await authedFetch(`/api/cycles/${id}`, getToken, {
    method: 'PATCH',
    body: JSON.stringify({ startDate, endDate }),
  })
  return body.data as CycleLog
}

export async function deleteCycleLog(id: string, getToken: GetToken): Promise<void> {
  await authedFetch(`/api/cycles/${id}`, getToken, { method: 'DELETE' })
}