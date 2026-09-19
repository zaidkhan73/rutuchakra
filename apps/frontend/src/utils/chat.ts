export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  groundedInKB: boolean
  category: string
  isBlocked: boolean
  createdAt: string
}

export interface PredictionContext {
  predictionId: string
  probability: number
  riskLevel: 'Low' | 'Moderate' | 'High'
  topFactors: { factor: string; impact: 'increases' | 'decreases' }[]
}

type GetToken = () => Promise<string | null>

export class RateLimitError extends Error {}

export async function sendChatMessage(message: string, getToken: GetToken): Promise<{
  answer: string
  groundedInKB: boolean
  category: string
}> {
  const token = await getToken()
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message }),
  })

  if (res.status === 429) {
    throw new RateLimitError("You're sending messages a bit fast — give it a moment.")
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? 'Something went wrong. Please try again.')
  }

  const body = await res.json()
  return body.data
}

const REDIRECT_PROMPTS = [
  'What does my cycle regularity mean?',
  'What foods can help with PCOD?',
]

export function isBlockedCategory(category: string): boolean {
  return category.startsWith('blocked:') || category === 'out_of_scope'
}

export function getRedirectPrompts(): string[] {
  return REDIRECT_PROMPTS
}