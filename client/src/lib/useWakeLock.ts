import { useEffect } from 'react'

// Keeps the screen on while enabled. It's only a convenience, so if the browser
// doesn't support it or refuses, the page carries on as normal.
export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return
    let ignore = false
    let lock: WakeLockSentinel | null = null

    async function acquire() {
      try {
        const newLock = await navigator.wakeLock.request('screen')
        // The effect may have been cleaned up while waiting for the lock
        if (ignore) newLock.release().catch(() => {})
        else lock = newLock
      } catch {
        // Refused, for example because the battery is low
      }
    }

    // The browser drops the lock when the page is hidden, so ask again on return
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') acquire()
    }

    acquire()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      ignore = true
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      lock?.release().catch(() => {})
    }
  }, [enabled])
}
