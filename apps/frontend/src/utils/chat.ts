import i18n from '../i18n'

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
    body: JSON.stringify({ message, language: i18n.language }),
  })

  if (res.status === 429) {
    throw new RateLimitError(i18n.t('aiAssistant.rateLimitedMessage'))
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? i18n.t('common.genericError'))
  }

  const body = await res.json()
  return body.data
}

export function isBlockedCategory(category: string): boolean {
  return category.startsWith('blocked:') || category === 'out_of_scope'
}

export function getRedirectPrompts(): string[] {
  return i18n.t('aiAssistant.redirectPrompts', { returnObjects: true }) as string[]
}