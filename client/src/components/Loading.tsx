import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

// A small spinning ring in the app's light green, for anything that's loading, like inside a button.
// For people who turn off animations in their system settings, it stays still.
export function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="h-4 w-4 shrink-0 rounded-full border-2 border-white/15 border-t-accent-dim animate-spin motion-reduce:animate-none"
    />
  )
}

// How long a page can load before the message appears. Most loads finish sooner, and showing
// the message for a split second would just flicker.
const SHOW_AFTER_MS = 300

// Shown while a page or section loads: the spinner and what's loading, like "Loading your
// workouts…". It only appears when loading takes longer than SHOW_AFTER_MS. role="status" lets
// screen readers announce it.
export default function Loading({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), SHOW_AFTER_MS)
    return () => clearTimeout(timer)
  }, [])

  if (!visible) return null

  return (
    <p role="status" className="flex items-center gap-2.5 text-sm text-zinc-400">
      <Spinner />
      {children}
    </p>
  )
}
