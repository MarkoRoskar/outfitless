import { useEffect, useState } from 'react'

// Installing outFITless to the home screen (or a computer's apps) from a button in the app.
//
// Chrome, Edge and other Chromium browsers announce that a site can be installed with a
// beforeinstallprompt event as the page loads, and let the site show the browser's own install
// box later from its own button. The event is caught here as the app starts (main.tsx imports
// this file), since the button's page may only open later. Safari on iPhone has no such event,
// so there the button explains the Share → Add to Home Screen steps instead.

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let saved: InstallPromptEvent | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())

window.addEventListener('beforeinstallprompt', (event) => {
  // Keeps the browser from showing its own banner, so the app's button decides when
  event.preventDefault()
  saved = event as InstallPromptEvent
  notify()
})
window.addEventListener('appinstalled', () => {
  saved = null
  notify()
})

// Opened from the home screen icon or the computer's app list, in its own window
export function isInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

// iPhone and iPad, including iPads that say they're a Mac
export function isAppleMobile() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent)
    || (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1)
}

// Whether this browser lets the app open its install box right now, and a way to open it.
// install() resolves true when the person chose to install.
export function useInstallPrompt() {
  const [canPrompt, setCanPrompt] = useState(saved !== null)
  useEffect(() => {
    const update = () => setCanPrompt(saved !== null)
    listeners.add(update)
    update()
    return () => { listeners.delete(update) }
  }, [])

  async function install() {
    if (!saved) return false
    const event = saved
    // Each event opens the box once
    saved = null
    notify()
    await event.prompt()
    const { outcome } = await event.userChoice
    return outcome === 'accepted'
  }

  return { canPrompt, install }
}
