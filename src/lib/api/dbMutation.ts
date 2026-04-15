export async function dbMutation<T = unknown>(
  action: { type: string; payload: Record<string, unknown> },
): Promise<T | null> {
  try {
    const res = await fetch('/api/dashboard/mutations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action),
      cache: 'no-store',
    })
    const body = await res.json().catch(() => null)
    if (!body || !body.ok) {
      console.error(`[dbMutation] ${action.type} failed:`, body?.error ?? res.status)
      return null
    }
    return body.data as T
  } catch (err) {
    console.error(`[dbMutation] ${action.type} error:`, err)
    return null
  }
}
