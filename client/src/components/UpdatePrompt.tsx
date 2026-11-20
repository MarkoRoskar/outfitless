import { useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { primaryButton } from '../lib/styles'

// How often an open app checks for a new version, besides each time it's opened
const CHECK_EVERY_MS = 60 * 60 * 1000

// Registers the service worker (vite.config.ts) that keeps the app on the device, and says when
// a new version has been published: a bar at the bottom with Update, which reloads into it, and
// Later. It never reloads by itself, so a workout in progress isn't interrupted. Later hides the
// bar until the next time the app is opened. On phones it sits above the tab bar.
export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      setInterval(() => { registration.update().catch(() => {}) }, CHECK_EVERY_MS)
    },
  })
  const [later, setLater] = useState(false)
  const [updating, setUpdating] = useState(false)

  if (!needRefresh || later) return null
  return (
    <div
      role="status"
      className="popover-in card-fade fixed z-40 inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+5rem)] md:bottom-6 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[26rem] flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-900/90 backdrop-blur-xl p-3 pl-4 shadow-xl shadow-black/50"
    >
      <p className="min-w-0 flex-1 text-sm text-zinc-200">A new version of outFITless is ready.</p>
      <button type="button" onClick={() => setLater(true)} className="shrink-0 h-9 px-3 rounded-xl text-sm font-medium text-zinc-400 hover:text-zinc-50 transition-colors duration-200">
        Later
      </button>
      <button
        type="button"
        disabled={updating}
        onClick={() => { setUpdating(true); updateServiceWorker(true) }}
        className={`shrink-0 h-9! px-4! ${primaryButton}`}
      >
        {updating ? 'Updating…' : 'Update'}
      </button>
    </div>
  )
}
