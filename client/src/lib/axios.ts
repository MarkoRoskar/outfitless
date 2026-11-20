import axios, { isAxiosError } from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'

const api = axios.create({
  baseURL: '/api',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Pages often send several requests at once, and they can all expire together.
// They share this one refresh, because each refresh replaces the refresh token.
let refreshing: Promise<void> | null = null

function refreshAccessToken() {
  refreshing ??= axios.post<{ token: string }>('/api/auth/refresh')
    .then(({ data }) => localStorage.setItem('token', data.token))
    .finally(() => { refreshing = null })

  return refreshing
}

// When the server last answered "too many requests" (429), so error messages can say so
// instead of a general "could not load". The server's limit counts per minute.
let rateLimitedUntil = 0

export function isRateLimitedNow() {
  return Date.now() < rateLimitedUntil
}

// When the access token has expired, get a new one and repeat the request, so the page never notices.
api.interceptors.response.use(undefined, async (err) => {
  if (isAxiosError(err) && err.response?.status === 429) rateLimitedUntil = Date.now() + 60_000

  const request: (InternalAxiosRequestConfig & { retried?: boolean }) | undefined = err.config

  // A 401 from the auth routes means a wrong password or similar, not an expired token
  if (!isUnauthorized(err) || !request || request.retried || request.url?.startsWith('/auth/')) {
    throw err
  }

  // If this fails with a 401, the page logs out. If the connection failed, the user stays logged in.
  await refreshAccessToken()
  request.retried = true
  return api(request)
})

// A 401 means the login token is missing or no longer valid
export function isUnauthorized(err: unknown) {
  return isAxiosError(err) && err.response?.status === 401
}

// A 409 carries an explanation meant for the user, like reaching a limit
export function conflictMessage(err: unknown): string | undefined {
  return isAxiosError(err) && err.response?.status === 409 ? err.response.data.message : undefined
}

// When a request got no answer at all, what to tell the person: offline when the device says so,
// otherwise that the server couldn't be reached (a weak signal, or the server waking up).
// undefined when the server did answer, so the caller can explain that answer instead.
export function connectionMessage(err: unknown): string | undefined {
  if (!isAxiosError(err) || err.response) return undefined
  return navigator.onLine === false
    ? "You're offline. Connect to the internet and try again."
    : "Can't reach outFITless right now. Check your connection and try again."
}

export default api
