import { useEffect, useRef, useState } from 'react'
import { card, fieldClass, secondaryButton } from '../lib/styles'
import { CheckIcon, SoundOffIcon, SoundOnIcon } from './icons'
import { playBeeps, unlockSound } from '../lib/sound'
import Reveal from './Reveal'

// The homepage's copy of one exercise on the session screen, working like the real one: the reps
// and weight can be typed, ticking a set starts the rest timer and Skip ends it. Nothing is saved.
// Last time the sets reached the top of the 8–12 range, so the weight went up from 80 to 82.5 kg.
// Logging the last set shows what happens next time at the top right, worked out from the sets as typed: by
// default 13 reps is past the top of the range, so it's +2.5 kg.

const REST_SECONDS = 90
// The timer is already running when the card is first seen, a little way into a rest
const FIRST_REST_SECONDS = 20

// The first two sets are already done; the third is the one left to log. A done set can't be
// unticked, so the third can be ticked once.

const startingSets = [
  { reps: '10', weight: '82.5', done: true, last: '80 kg × 12' },
  { reps: '11', weight: '82.5', done: true, last: '80 kg × 12' },
  { reps: '13', weight: '82.5', done: false, last: '80 kg × 13' },
]

// The plan the preview follows: 8–12 reps at 82.5 kg, stepping 2.5 kg
const MIN_REPS = 8
const MAX_REPS = 12
const TARGET_WEIGHT = 82.5
const INCREMENT = 2.5

// The change to the target weight after these sets, by the app's own rule (nextCurrentNumbers in
// the server's session.service.ts): the heaviest set with at least MIN_REPS becomes the target,
// plus the increment if it reached MAX_REPS. A first set under MIN_REPS takes the increment off
// its weight instead, whatever the later sets did.
function weightChange(sets: { reps: string; weight: string }[]) {
  const logged = sets.map((set) => ({ reps: Number(set.reps), weight: Number(set.weight) }))
  if (logged[0].reps < MIN_REPS) {
    return Math.round((Math.max(logged[0].weight - INCREMENT, 0) - TARGET_WEIGHT) * 100) / 100
  }
  const reached = logged.filter((set) => set.reps >= MIN_REPS)
  if (reached.length === 0) return logged[0].weight - TARGET_WEIGHT
  const heaviest = Math.max(...reached.map((set) => set.weight))
  const repsAtHeaviest = Math.max(...reached.filter((set) => set.weight === heaviest).map((set) => set.reps))
  const next = repsAtHeaviest >= MAX_REPS ? heaviest + INCREMENT : heaviest
  return Math.round((next - TARGET_WEIGHT) * 100) / 100
}

function describeChange(change: number) {
  if (change === 0) return 'Same weight next time'
  return `${change > 0 ? '+' : '−'}${Math.abs(change)} kg next time`
}

export default function SessionPreview() {
  const [sets, setSets] = useState(startingSets)
  // Seconds left in the rest. It shows 0:20 until the card is seen, and stops at 0:00.
  const [rest, setRest] = useState(FIRST_REST_SECONDS)
  const [started, setStarted] = useState(false)
  // The beep at 0:00, muted until the visitor turns it on, so the homepage never makes a sound
  // by itself. It's separate from the app's own setting and isn't remembered.
  const [soundOn, setSoundOn] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // The first rest starts when the card scrolls into view, so it isn't over before anyone sees it
  useEffect(() => {
    const element = ref.current
    if (!element || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setStarted(true)
        observer.disconnect()
      }
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const restRef = useRef(rest)
  const soundOnRef = useRef(soundOn)
  useEffect(() => {
    restRef.current = rest
    soundOnRef.current = soundOn
  }, [rest, soundOn])

  const resting = started && rest > 0
  // Counts down once a second while resting, and stays at 0:00 when done
  useEffect(() => {
    if (!resting) return
    // The tick that reaches 0:00 beeps, if the sound is on. Skip stops the countdown first, so a
    // skipped rest stays quiet. The refs hold the latest values for this callback.
    const timer = setInterval(() => {
      const left = Math.max(restRef.current - 1, 0)
      setRest(left)
      if (left === 0 && soundOnRef.current) playBeeps()
    }, 1000)
    return () => clearInterval(timer)
  }, [resting])

  function toggleSound() {
    // Browsers only allow sound after a click, and this is that click
    if (!soundOn) unlockSound()
    setSoundOn(!soundOn)
  }

  function skip() {
    setRest(0)
  }

  function update(index: number, change: Partial<(typeof startingSets)[number]>) {
    setSets((current) => current.map((set, i) => (i === index ? { ...set, ...change } : set)))
  }

  const allDone = sets.every((set) => set.done)
  const change = weightChange(sets)

  // Like the real screen: logging a set starts a fresh rest
  function logSet(index: number) {
    update(index, { done: true })
    setRest(REST_SECONDS)
    setStarted(true)
  }

  return (
    <div ref={ref} className="flex flex-col gap-3">
      <div className={`${card} flex flex-col gap-3`}>
        {/* Once every set is logged, what happens next time pops in at the top right */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <p className="text-base font-semibold tracking-tight">Bench Press</p>
            <p className="text-xs text-zinc-400">3 × 8–12 reps</p>
          </div>
          {allDone && (
            <span
              role="status"
              className={`next-time-chip shrink-0 whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                change > 0 ? 'bg-accent text-black' : 'bg-zinc-800 text-zinc-100 ring-1 ring-white/10'
              }`}
            >
              {describeChange(change)}
            </span>
          )}
        </div>
        <ol className="flex flex-col gap-2">
          {sets.map((set, index) => {
            const label = `set ${index + 1} of Bench Press`
            const locked = set.done
            return (
              <Reveal as="li" key={index} delay={150 + index * 70} className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="w-4 shrink-0 text-xs font-mono font-bold text-accent-dim">{index + 1}</span>
                  <input
                    type="number"
                    min={0}
                    value={set.reps}
                    onChange={(e) => update(index, { reps: e.target.value })}
                    disabled={set.done}
                    aria-label={`Reps for ${label}`}
                    className={`h-10 min-w-0 flex-1 sm:flex-none sm:w-24 tabular-nums disabled:opacity-60 ${fieldClass}`}
                  />
                  <span className="shrink-0 text-xs text-zinc-400">reps</span>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={set.weight}
                    onChange={(e) => update(index, { weight: e.target.value })}
                    disabled={set.done}
                    aria-label={`Weight in kg for ${label}`}
                    className={`h-10 min-w-0 flex-1 sm:flex-none sm:w-24 tabular-nums disabled:opacity-60 ${fieldClass}`}
                  />
                  <span className="shrink-0 text-xs text-zinc-400">kg</span>
                  <button
                    type="button"
                    onClick={() => logSet(index)}
                    disabled={locked}
                    aria-pressed={set.done}
                    aria-label={set.done ? `Logged ${label}` : `Log ${label}`}
                    className={`h-10 w-10 shrink-0 flex items-center justify-center rounded-xl border transition-colors duration-200 ${
                      set.done
                        ? 'border-accent-dim bg-accent-dim text-black'
                        : 'border-white/10 text-zinc-400 hover:border-accent-dim hover:text-accent-dim'
                    }`}
                  >
                    <CheckIcon size={18} />
                  </button>
                </div>
                <p className="pl-6 text-xs text-zinc-400 tabular-nums">Last time: {set.last}</p>
              </Reveal>
            )
          })}
        </ol>
      </div>

      {/* The rest timer. Skip sets it to 0:00, where it stays until the next set is logged. */}
      <Reveal
        variant="pop"
        delay={400}
        // The green border marks a running rest; at 0:00 it turns plain, the same width so
        // nothing moves
        className={`${card} bg-zinc-900! border ${rest === 0 ? 'border-white/6' : 'border-accent-dim'} flex items-center justify-between gap-4`}
      >
        <div role="timer" className="flex items-baseline gap-2">
          <span className="text-xs text-zinc-400">Rest</span>
          {/* In the last 3 seconds each second pulses, like a countdown beep without the sound. The
              key changes every second, so the pulse plays again each time. */}
          <span
            key={rest}
            className={`inline-block origin-left font-mono text-xl font-semibold text-accent tabular-nums ${
              rest > 0 && rest <= 3 ? 'timer-pulse' : ''
            }`}
          >
            {Math.floor(rest / 60)}:{String(rest % 60).padStart(2, '0')}
          </span>
        </div>
        {/* Both buttons are hidden rather than removed at 0:00, so the card keeps its height */}
        <div className="flex items-center gap-1">
          {/* The same mute button as the real timer, but starting muted. Like Skip, it's hidden at
              0:00, with no rest left to beep at the end of. */}
          <button
            type="button"
            onClick={toggleSound}
            disabled={rest === 0}
            aria-hidden={rest === 0}
            aria-pressed={!soundOn}
            aria-label={soundOn ? 'Mute the beep' : 'Turn the beep on'}
            title={soundOn ? 'Mute the beep' : 'Turn the beep on'}
            className={`h-10 w-10 flex items-center justify-center rounded-xl text-zinc-400 hover:bg-white/5 hover:text-zinc-50 transition-colors duration-200 ${rest === 0 ? 'invisible' : ''}`}
          >
            {soundOn ? <SoundOnIcon size={18} /> : <SoundOffIcon size={18} />}
          </button>
          <button
            type="button"
            onClick={skip}
            disabled={rest === 0}
            aria-hidden={rest === 0}
            className={`${secondaryButton} ${rest === 0 ? 'invisible' : ''}`}
          >
            Skip
          </button>
        </div>
      </Reveal>
    </div>
  )
}
