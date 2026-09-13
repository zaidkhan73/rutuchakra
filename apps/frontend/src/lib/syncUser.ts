

export async function syncUser(getToken: () => Promise<string | null>) {
  const token = await getToken()
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/sync`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to sync user')
  return res.json()
}
