export interface HabitToday {
  id: string | null
  name: string
  label: string
  icon: string | null
  type: 'boolean' | 'numeric'
  unit: string | null
  target: number | null
  isCustom: boolean
  valueToday: boolean | number | null
  streak: number
}

export interface HabitsTodayData {
  habits: HabitToday[]
  hasEverLogged: boolean
  isNewUser: boolean
}

export interface WeeklyDay {
  date: string
  completed: boolean
  logged: boolean
}

export interface WeeklyHabitRow {
  name: string
  label: string
  days: WeeklyDay[]
}

export interface WeeklyData {
  days: string[]
  grid: WeeklyHabitRow[]
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

export async function fetchHabitsToday(getToken: GetToken): Promise<HabitsTodayData> {
  const body = await authedFetch('/api/habits/today', getToken)
  return body.data as HabitsTodayData
}

export async function fetchHabitsWeekly(getToken: GetToken): Promise<WeeklyData> {
  const body = await authedFetch('/api/habits/weekly', getToken)
  return body.data as WeeklyData
}

export async function logHabit(
  habitName: string,
  value: boolean | number,
  isCustom: boolean,
  getToken: GetToken
): Promise<void> {
  await authedFetch('/api/habits', getToken, {
    method: 'POST',
    body: JSON.stringify({ habitName, value, isCustom }),
  })
}

export interface CustomHabitInput {
  name: string
  type: 'boolean' | 'numeric'
  unit?: string
  target?: number
  icon?: string
}

export async function createCustomHabit(input: CustomHabitInput, getToken: GetToken): Promise<void> {
  await authedFetch('/api/habits/custom', getToken, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function updateCustomHabit(
  id: string,
  input: Partial<CustomHabitInput>,
  getToken: GetToken
): Promise<void> {
  await authedFetch(`/api/habits/custom/${id}`, getToken, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export async function deleteCustomHabit(id: string, getToken: GetToken): Promise<void> {
  await authedFetch(`/api/habits/custom/${id}`, getToken, { method: 'DELETE' })
}