import { useEffect, useState } from 'react'

// A page's filter that the browser tab remembers (sessionStorage), so going to another page and
// coming back finds it as it was left. A new tab starts with the defaults, and logging out
// forgets them all (forgetStoredFilters). Storage can be blocked, like in some private windows:
// then the filter just isn't remembered. A null key doesn't store at all, for a list that shares
// the component but not its filters, like the home screen's recent workouts.
const PREFIX = 'filter:'

function read<T>(key: string, fallback: T): T {
  try {
    const saved = sessionStorage.getItem(PREFIX + key)
    return saved === null ? fallback : (JSON.parse(saved) as T)
  } catch {
    return fallback
  }
}

export function useStoredFilter<T>(key: string | null, fallback: T) {
  const [value, setValue] = useState<T>(() => (key === null ? fallback : read(key, fallback)))
  useEffect(() => {
    if (key === null) return
    try {
      sessionStorage.setItem(PREFIX + key, JSON.stringify(value))
    } catch {
      // Not remembered, but the page works the same
    }
  }, [key, value])
  return [value, setValue] as const
}

// Every page's remembered filters, for logging out: the next person on this device starts fresh
export function forgetStoredFilters() {
  try {
    for (const key of Object.keys(sessionStorage)) if (key.startsWith(PREFIX)) sessionStorage.removeItem(key)
  } catch {
    // Nothing was stored
  }
}
