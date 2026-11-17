export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers)
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`/api${path}`, {
    ...options,
    headers,
    credentials: 'same-origin',
  })

  if (response.status === 204) return null
  const payload = await response.json()
  if (!response.ok) {
    const error = new Error(payload.error || 'The request could not be completed.')
    error.status = response.status
    throw error
  }
  return payload
}
