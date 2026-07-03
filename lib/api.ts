export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '')

/**
 * Set this to `true` before clearing auth tokens on intentional logout so that
 * any in-flight 401 responses do NOT trigger the "Session Expired" dialog.
 */
let _suppressSessionExpired = false
export function setSuppressSessionExpired(value: boolean) {
  _suppressSessionExpired = value
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  // Capture whether a token existed BEFORE the request.
  // The session-expired dialog should only fire when a real session was in use.
  let hadToken = false
  let sentToken = ''
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('dep_jwt_token') || localStorage.getItem('token')
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
      hadToken = true
      sentToken = token
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })
  
  const text = await response.text()
  let data: any = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = { message: text }
    }
  }

  if (!response.ok) {
    const detail = data?.detail
    const message =
      typeof detail === 'string'
        ? detail
        : detail?.message || data?.message || `Request failed with status ${response.status}`

    // Only show the "Session Expired" dialog when:
    //  1. A real token was sent with the request (genuine session expiry), AND
    //  2. The flag hasn't been suppressed (intentional logout), AND
    //  3. The response signals an auth failure
    const isAuthFailure = response.status === 401
      || message === 'Invalid or expired token'
      || message === 'Not authenticated'

    if (hadToken && !_suppressSessionExpired && isAuthFailure) {
      if (typeof window !== 'undefined') {
        const currentToken = localStorage.getItem('dep_jwt_token') || localStorage.getItem('token')
        if (currentToken === sentToken) {
          localStorage.removeItem('dep_jwt_token')
          localStorage.removeItem('token')
          document.cookie = 'dep_jwt_token=;path=/;max-age=0'
          if (confirm('Session Expired: Your session is invalid or has expired. Would you like to log in again?')) {
            window.location.href = '/'
          }
        }
      }
    }
    throw new Error(message)
  }

  return data as T
}
