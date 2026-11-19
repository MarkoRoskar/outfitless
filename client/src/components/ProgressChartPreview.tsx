import { useRef, useState } from 'react'
import type { CSSProperties, PointerEvent } from 'react'
import { card } from '../lib/styles'
import { ticksFor } from '../lib/chartTicks'

// The homepage's copy of the progress chart on a workout's page, drawn by hand so the homepage
// doesn't load the chart library. It works like the real one: the buttons switch exercises on
// and off (Chest Fly starts off), and hovering or tapping shows that session's numbers.

interface PreviewExercise {
  id: string
  name: string
  // One per session, oldest first: the heaviest weight and the best reps
  sessions: { weight: number; reps: number }[]
}

const dates = ['3 Mar', '7 Mar', '10 Mar', '14 Mar', '17 Mar']

// The weight goes up each time the top of the rep range (12) is reached
const exercises: PreviewExercise[] = [
  {
    id: 'bench',
    name: 'Bench Press',
    sessions: [
      { weight: 80, reps: 10 },
      { weight: 80, reps: 12 },
      { weight: 82.5, reps: 9 },
      { weight: 82.5, reps: 12 },
      { weight: 85, reps: 8 },
    ],
  },
  {
    id: 'fly',
    name: 'Chest Fly',
    sessions: [
      { weight: 65, reps: 11 },
      { weight: 65, reps: 12 },
      { weight: 66.5, reps: 10 },
      { weight: 66.5, reps: 12 },
      { weight: 68, reps: 9 },
    ],
  },
]

// How long a lit-up stretch of line takes to fade (trail-glow in index.css)
const TRAIL_MS = 900

// Colors go to exercises in the order they're switched on, like on the real chart
const palette = ['var(--series-1)', 'var(--series-2)']

// Layout in SVG units. The SVG scales to its container, so these are proportions.
const CHART = { width: 480, height: 220, left: 52, right: 16, top: 12, bottom: 32 }
const plotLeft = CHART.left + 16
const plotWidth = CHART.width - CHART.left - CHART.right - 32
const x = (index: number) => plotLeft + (index * plotWidth) / (dates.length - 1)

export default function ProgressChartPreview() {
  const [shownIds, setShownIds] = useState(['bench'])
  // The session under the pointer, or null when nothing is hovered
  const [active, setActive] = useState<number | null>(null)
  // Sessions the pointer recently passed. Each lights up its stretch of line, which fades out
  // (trail-glow in index.css), so moving across leaves a short glowing trail.
  const [trail, setTrail] = useState<{ key: number; index: number }[]>([])
  const trailKey = useRef(0)
  // The first drawing waits for the card to pop in; after a change of exercises it starts at once
  const [changed, setChanged] = useState(false)
  const drawDelay = changed ? 0 : 150

  const shown = exercises.filter((exercise) => shownIds.includes(exercise.id))
  const colorOf = (id: string) => palette[shownIds.indexOf(id)] ?? palette[0]

  const ticks = ticksFor(shown.length > 0 ? shown.flatMap((exercise) => exercise.sessions.map((s) => s.weight)) : [80, 85])
  const top = ticks[ticks.length - 1]
  const y = (weight: number) =>
    CHART.top + ((top - weight) / (top - ticks[0])) * (CHART.height - CHART.top - CHART.bottom)

  function toggle(id: string) {
    setChanged(true)
    setShownIds((ids) => (ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]))
  }

  // The nearest session to the pointer, from its position across the chart
  function pointAt(event: PointerEvent<SVGRectElement>) {
    const box = event.currentTarget.ownerSVGElement!.getBoundingClientRect()
    const svgX = ((event.clientX - box.left) / box.width) * CHART.width
    const index = Math.min(Math.max(Math.round(((svgX - plotLeft) / plotWidth) * (dates.length - 1)), 0), dates.length - 1)
    if (index === active) return
    setActive(index)
    const key = ++trailKey.current
    setTrail((current) => [...current, { key, index }])
    // Gone once its fade has played
    setTimeout(() => setTrail((current) => current.filter((item) => item.key !== key)), TRAIL_MS)
  }

  // The stretch of a line around one session: halfway to the session on each side
  function stretch(exercise: PreviewExercise, index: number) {
    const point = (i: number) => [x(i), y(exercise.sessions[i].weight)]
    const middle = (a: number, b: number) => {
      const [ax, ay] = point(a)
      const [bx, by] = point(b)
      return [(ax + bx) / 2, (ay + by) / 2]
    }
    const points = [
      ...(index > 0 ? [middle(index - 1, index)] : []),
      point(index),
      ...(index < dates.length - 1 ? [middle(index, index + 1)] : []),
    ]
    return points.map(([px, py]) => `${px},${py}`).join(' ')
  }

  return (
    <div className={`${card} flex flex-col gap-4`}>
      {/* The same buttons as above the real charts. Off, the dot is a gray ring and the name is struck through. */}
      <div className="flex flex-wrap gap-1.5">
        {exercises.map((exercise) => {
          const on = shownIds.includes(exercise.id)
          return (
            <button
              key={exercise.id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(exercise.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors duration-200 ${
                on ? 'border-white/20 text-zinc-50' : 'border-white/10 text-zinc-400 line-through'
              }`}
            >
              <span
                aria-hidden="true"
                className={`w-2 h-2 shrink-0 rounded-full ${on ? '' : 'ring-1 ring-inset ring-zinc-500'}`}
                style={on ? { backgroundColor: colorOf(exercise.id) } : undefined}
              />
              {exercise.name}
            </button>
          )
        })}
      </div>

      {/* The grid always shows, so the card keeps its size when every exercise is off */}
      <div className="relative">
        <svg
          aria-hidden="true"
          viewBox={`0 0 ${CHART.width} ${CHART.height}`}
          className="w-full h-auto touch-pan-y"
          style={{ '--draw-delay': `${drawDelay}ms` } as CSSProperties}
        >
          {ticks.map((tick, index) => (
            <g key={tick}>
              <line
                x1={CHART.left}
                x2={CHART.width - CHART.right}
                y1={y(tick)}
                y2={y(tick)}
                stroke={index === 0 ? 'var(--chart-axis)' : 'var(--chart-grid)'}
              />
              <text x={CHART.left - 8} y={y(tick)} dy="0.35em" textAnchor="end" fontSize="11" fill="var(--chart-axis-text)">
                {tick} kg
              </text>
            </g>
          ))}
          {dates.map((date, index) => (
            <text key={date} x={x(index)} y={CHART.height - 10} textAnchor="middle" fontSize="11" fill="var(--chart-axis-text)">
              {date}
            </text>
          ))}

          {/* The line straight down from the hovered session, like the real chart's cursor */}
          {active !== null && (
            <line x1={x(active)} x2={x(active)} y1={CHART.top} y2={CHART.height - CHART.bottom} stroke="var(--chart-axis)" />
          )}

          {/* Keyed by exercise, so a line already shown stays drawn and only a newly switched-on
              one draws itself */}
          {shown.map((exercise) => (
            <g key={exercise.id}>
              <polyline
                points={exercise.sessions.map((session, index) => `${x(index)},${y(session.weight)}`).join(' ')}
                pathLength={1}
                className="draw-line"
                fill="none"
                stroke={colorOf(exercise.id)}
                strokeWidth="2"
                strokeLinejoin="round"
              />
              {trail.map((item) => (
                <polyline
                  key={item.key}
                  points={stretch(exercise, item.index)}
                  className="trail-glow"
                  fill="none"
                  stroke={colorOf(exercise.id)}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
              {exercise.sessions.map((session, index) => (
                <circle
                  key={index}
                  // Each dot pops in as the drawing line reaches it, then grows when hovered
                  className="pop-dot"
                  style={{ '--reveal-delay': `${drawDelay + (index / (dates.length - 1)) * 800}ms` } as CSSProperties}
                  cx={x(index)}
                  cy={y(session.weight)}
                  r={active === index ? 6 : 4}
                  fill={colorOf(exercise.id)}
                  stroke="var(--chart-surface)"
                  strokeWidth="2"
                />
              ))}
            </g>
          ))}

          {/* Catches the pointer over the whole plot, so it doesn't have to land on a dot */}
          <rect
            x={CHART.left}
            y={CHART.top}
            width={CHART.width - CHART.left - CHART.right}
            height={CHART.height - CHART.top - CHART.bottom}
            fill="transparent"
            onPointerMove={shown.length > 0 ? pointAt : undefined}
            onPointerDown={shown.length > 0 ? pointAt : undefined}
            onPointerLeave={() => setActive(null)}
          />
        </svg>

        {/* The tooltip, styled like the real chart's: the date, then each exercise in its line's
            color. It sits beside the session, on whichever side has room. */}
        {active !== null && (
          <div
            className="card-fade pointer-events-none absolute top-2 max-w-64 flex flex-col gap-1 p-3 rounded-xl border border-white/5 bg-zinc-900/80 backdrop-blur-xl text-xs shadow-lg"
            style={
              active < (dates.length - 1) / 2
                ? { left: `calc(${(x(active) / CHART.width) * 100}% + 12px)` }
                : { right: `calc(${100 - (x(active) / CHART.width) * 100}% + 12px)` }
            }
          >
            <p className="font-semibold text-zinc-50">{dates[active]}</p>
            {shown.map((exercise) => (
              <p key={exercise.id} style={{ color: colorOf(exercise.id) }} className="tabular-nums whitespace-nowrap">
                {exercise.name}: {exercise.sessions[active].weight} kg, {exercise.sessions[active].reps} reps
              </p>
            ))}
          </div>
        )}
        {shown.length === 0 && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-zinc-400">Choose an exercise to show.</p>
        )}
      </div>
    </div>
  )
}
