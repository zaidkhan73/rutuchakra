export interface BMIResult {
  value: number
  label: string
  classes: string
}

export function computeBMI(weight: number, height: number): BMIResult | null {
  if (!weight || !height) return null
  const value = weight / (height / 100) ** 2
  if (Number.isNaN(value) || !Number.isFinite(value)) return null

  let label: string
  let classes: string
  if (value < 18.5) {
    label = 'Underweight'
    classes = 'border-warning/40 bg-warning/10 text-warning'
  } else if (value < 25) {
    label = 'Normal'
    classes = 'border-success/40 bg-success/10 text-success'
  } else if (value < 30) {
    label = 'Overweight'
    classes = 'border-warning/40 bg-warning/10 text-warning'
  } else {
    label = 'Obese'
    classes = 'border-error/40 bg-error/10 text-error'
  }
  return { value, label, classes }
}

// Standard clinical definition: 21-35 days is a regular cycle.
export function isIrregular(days: number): boolean {
  return days < 21 || days > 35
}

export function cycleLabel(days: number): string {
  if (days <= 15) return 'Possible amenorrhoea'
  if (days < 21) return 'Short cycle'
  if (days <= 35) return 'Regular cycle'
  return 'Long cycle'
}

export function cycleColor(days: number): string {
  if (days <= 15) return 'border-error/40 bg-error/10 text-error'
  if (isIrregular(days)) return 'border-warning/40 bg-warning/10 text-warning'
  return 'border-success/40 bg-success/10 text-success'
}

export interface Symptoms {
  weightGain: boolean
  facialHair: boolean
  skinDark: boolean
  hairLoss: boolean
  acne: boolean
  none?: boolean
}

export interface PCOSFormData {
  age: string
  weight: string
  height: string
  bmi: number | null
  bmiLabel: string
  cycleLen: number
  symptoms: Symptoms
  fastFood: boolean | null
  exercise: boolean | null
}

export interface TopFactor {
  factor: string
  impact: 'increases' | 'decreases'
  weight: number
}

export interface PredictionResult {
  predictionId?: string
  probability: number
  risk_level: 'Low' | 'Moderate' | 'High'
  advice: string
  top_factors: TopFactor[]
  ai_advice: string
}

export interface HistoryEntry {
  id: string
  probability: number
  risk_level: 'Low' | 'Moderate' | 'High'
  advice: string
  createdAt: string
}

export async function fetchPredictionHistory(
  getToken: () => Promise<string | null>
): Promise<HistoryEntry[]> {
  const token = await getToken()
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/predictions`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to load prediction history.')
  const body = await res.json()
  return body.data as HistoryEntry[]
}

export interface HistoricalPrediction extends PredictionResult {
  createdAt: string
}

export async function fetchPredictionById(
  id: string,
  getToken: () => Promise<string | null>
): Promise<HistoricalPrediction> {
  const token = await getToken()
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/predictions/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to load this prediction.')
  const body = await res.json()
  return body.data as HistoricalPrediction
}

export async function fetchPrediction(
  formData: PCOSFormData,
  getToken: () => Promise<string | null>
): Promise<PredictionResult> {
  const token = await getToken()

  const payload = {
    age: Number(formData.age),
    weight: Number(formData.weight),
    height: Number(formData.height),
    cycleLen: formData.cycleLen,
    symptoms: {
      weightGain: !!formData.symptoms.weightGain,
      facialHair: !!formData.symptoms.facialHair,
      skinDark: !!formData.symptoms.skinDark,
      hairLoss: !!formData.symptoms.hairLoss,
      acne: !!formData.symptoms.acne,
    },
    fastFood: !!formData.fastFood,
    exercise: !!formData.exercise,
  }

  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/predictions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? 'Something went wrong. Please try again.')
  }

  const body = await res.json()
  return body.data as PredictionResult
}