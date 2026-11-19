import { useEffect, useRef, useState } from 'react'

// A little lifter in the homepage's bottom-right corner that works out as the page scrolls:
// scrolling the whole page is TOTAL_REPS overhead presses, slow and steady, counted above him.
// The further down the page, the more plates go on the bar. He strains at the top of each rep,
// sweats when the scrolling is fast, and at the very end holds the bar up and calls a PR. Just for
// fun: it can't be clicked and isn't read out, and it's left out for anyone who has asked for
// less motion.

const TOTAL_REPS = 3
// Plates on each side, by how far down the page: one at the top, three by the end
const MAX_PLATES = 3

export default function ScrollLifter() {
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  // 0 with the bar at the shoulders, 1 with it locked out overhead
  const [lift, setLift] = useState(0)
  const [reps, setReps] = useState(0)
  const [plates, setPlates] = useState(1)
  const [shown, setShown] = useState(false)
  const [sweating, setSweating] = useState(false)
  const [done, setDone] = useState(false)
  const last = useRef({ y: 0, time: 0 })
  const sweatTimer = useRef(0)

  useEffect(() => {
    if (reduced) return
    let frame = 0
    function update() {
      frame = 0
      const y = window.scrollY
      const room = document.documentElement.scrollHeight - window.innerHeight
      const progress = room > 0 ? Math.min(y / room, 1) : 0
      // The very bottom, give or take a pixel of rounding
      const end = room > 0 && y >= room - 2

      // Each rep goes from the shoulders up to locked out overhead and back down. A rep counts at
      // its lockout, and the page is timed so the last lockout lands exactly at the bottom: the
      // last rep is finished, bar up, before he calls the PR.
      const phase = progress * (TOTAL_REPS - 0.5)
      setLift((1 - Math.cos(phase * Math.PI * 2)) / 2)
      setReps(Math.floor(phase + 0.5))
      setPlates(1 + Math.min(Math.floor(progress * MAX_PLATES), MAX_PLATES - 1))
      // Comes in once the hero's been scrolled past a little
      setShown(y > 120)
      setDone(end)

      // Fast scrolling makes him sweat for a moment
      const now = performance.now()
      const speed = Math.abs(y - last.current.y) / Math.max(now - last.current.time, 1)
      last.current = { y, time: now }
      if (speed > 2.5) {
        setSweating(true)
        clearTimeout(sweatTimer.current)
        sweatTimer.current = window.setTimeout(() => setSweating(false), 600)
      }
    }
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(frame)
      clearTimeout(sweatTimer.current)
    }
  }, [reduced])

  if (reduced) return null

  // The hands go from the shoulders (y 30) to overhead (y 4); the elbows bend out on the way
  const handY = 30 - lift * 26
  const elbowY = 31 - lift * 12
  const elbowOut = 12 - lift * 7
  const straining = lift > 0.7
  const plateHeights = [16, 13, 10].slice(0, plates)

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed bottom-4 right-4 z-20 flex flex-col items-center gap-1 transition-[opacity,translate] duration-300 ${
        shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      {/* The rep count, or the PR call at the end */}
      <span
        key={done ? 'pr' : 'reps'}
        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold tabular-nums ${
          done ? 'lifter-pr bg-accent text-black' : 'bg-zinc-900/80 text-zinc-300 ring-1 ring-white/10'
        }`}
      >
        {done ? 'PR!' : `${reps} ${reps === 1 ? 'rep' : 'reps'}`}
      </span>

      <svg viewBox="0 0 64 72" className={`w-16 h-[72px] overflow-visible ${done ? 'lifter-done' : ''}`}>
        {/* The bar, with plates at both ends */}
        <g className={straining && plates === MAX_PLATES ? 'lifter-shake' : ''}>
          <line x1="4" x2="60" y1={handY} y2={handY} stroke="var(--color-zinc-400)" strokeWidth="2.5" strokeLinecap="round" />
          {plateHeights.map((height, index) => (
            <g key={index} className="lifter-plate">
              <rect x={7 + index * 4} y={handY - height / 2} width="3" height={height} rx="1" fill="var(--color-accent)" />
              <rect x={54 - index * 4} y={handY - height / 2} width="3" height={height} rx="1" fill="var(--color-accent)" />
            </g>
          ))}
        </g>

        {/* The lifter: stick arms from the shoulders (32, 30) through the elbows to the bar */}
        <g fill="none" stroke="var(--color-zinc-200)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d={`M30 30 L${30 - elbowOut} ${elbowY} L20 ${handY}`} />
          <path d={`M34 30 L${34 + elbowOut} ${elbowY} L44 ${handY}`} />
          <line x1="32" y1="28" x2="32" y2="50" />
          {/* Legs bend a little when the bar is down, driving it up */}
          <path d={`M32 50 L${25 - lift} ${58 + lift * 2} L24 70`} />
          <path d={`M32 50 L${39 + lift} ${58 + lift * 2} L40 70`} />
        </g>

        {/* The head, going red with effort at the top */}
        <circle cx="32" cy="21" r="6" fill={straining ? '#f4a3a3' : 'var(--color-zinc-200)'} className="transition-[fill] duration-200" />
        <circle cx="29.8" cy="20" r="0.9" fill="#18181b" />
        <circle cx="34.2" cy="20" r="0.9" fill="#18181b" />
        {straining || done ? (
          // Gritted teeth, or a big grin at the end
          done
            ? <path d="M29 23 Q32 26.5 35 23" fill="none" stroke="#18181b" strokeWidth="1.1" strokeLinecap="round" />
            : <rect x="29.5" y="22.6" width="5" height="1.8" rx="0.6" fill="#fff" stroke="#18181b" strokeWidth="0.6" />
        ) : (
          <path d="M30 23.2 Q32 24.4 34 23.2" fill="none" stroke="#18181b" strokeWidth="1" strokeLinecap="round" />
        )}

        {/* Sweat when scrolling fast */}
        {sweating && (
          <g fill="#7dd3fc">
            <path className="lifter-sweat" d="M40.5 15 q2.6 3.6 0 5.2 q-2.6 -1.6 0 -5.2z" />
            <path className="lifter-sweat lifter-sweat-2" d="M23.5 16 q2.6 3.6 0 5.2 q-2.6 -1.6 0 -5.2z" />
          </g>
        )}
      </svg>
    </div>
  )
}
