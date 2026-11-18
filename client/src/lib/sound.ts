let audioContext: AudioContext | null = null

// Browsers only allow sound after the user has interacted, so call this from a click
export function unlockSound() {
  audioContext ??= new AudioContext()
  audioContext.resume().catch(() => {})
}

// The rest timer's beep, if it's switched on (in Settings or on the timer)
export function playRestEndSound() {
  if (isRestSoundOn()) playBeeps()
}

// Three short beeps, made in code so there's no audio file to load. Silent until unlockSound has
// run from a click.
export function playBeeps() {
  if (!audioContext) return

  for (let i = 0; i < 3; i++) {
    const start = audioContext.currentTime + i * 0.25
    const oscillator = audioContext.createOscillator()
    const volume = audioContext.createGain()

    oscillator.frequency.value = 880
    volume.gain.setValueAtTime(0.3, start)
    // Fades out instead of stopping dead, which would make a click
    volume.gain.exponentialRampToValueAtTime(0.001, start + 0.15)

    oscillator.connect(volume)
    volume.connect(audioContext.destination)
    oscillator.start(start)
    oscillator.stop(start + 0.15)
  }
}

// Whether the rest timer beeps. It's on unless turned off, and it's saved in this browser, since
// whether a beep suits depends on the device (a phone in the gym, headphones on). Storage can be
// blocked, like in a private window, and then it's simply on.
const SOUND_KEY = 'restSound'

export function isRestSoundOn() {
  try { return localStorage.getItem(SOUND_KEY) !== 'off' } catch { return true }
}

export function setRestSoundOn(on: boolean) {
  try { localStorage.setItem(SOUND_KEY, on ? 'on' : 'off') } catch { /* not remembered */ }
}
