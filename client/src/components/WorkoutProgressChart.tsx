import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { LineDrawShapeProps, MouseHandlerDataParam } from 'recharts'
import api, { isUnauthorized } from '../lib/axios'
import { buildChartData, formatStat, repsKey, weightKey } from '../lib/progressChart'
import type { ChartExercise, ChartPoint, ChartSession } from '../lib/progressChart'
import { formatShortDay } from '../lib/dates'
import { ticksFor } from '../lib/chartTicks'
import { card, secondaryButton } from '../lib/styles'
import { useAuthStore } from '../store/authStore'
import { ChevronDownIcon } from './icons'
import LoadError from './LoadError'
import Loading from './Loading'

// The palette has 8 colors that stay distinct, including for colorblind users, so up to 8
// exercises are drawn at once. A workout can have more: any of them can be switched on, as long
// as no more than 8 are on together.
const MAX_SHOWN = 8

// The color of each exercise that's on, as a number from 1 to 8 (--series-1 … --series-8)
type ColorOf = (exerciseId: string) => string

// The charts show this many of the latest sessions, which is the most the server sends at once
const MAX_SESSIONS = 100

const axisTick = { fill: 'var(--chart-axis-text)', fontSize: 11 }

// Recharts fills in active and payload when it renders this
// Each exercise's row is in its line's color, so it's clear which line it describes
function ChartTooltip({ active, payload, exercises, colorOf }: {
  active?: boolean
  payload?: { payload: ChartPoint }[]
  exercises: ChartExercise[]
  colorOf: ColorOf
}) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null

  return (
    // Long names are cut short so the box stays small next to the chart; the numbers always show in full
    <div className="card-fade max-w-64 flex flex-col gap-1 p-3 rounded-xl border border-white/5 bg-zinc-900/80 backdrop-blur-xl text-xs shadow-lg">
      <p className="font-semibold">{formatShortDay(point.date)}</p>
      {exercises.filter((exercise) => point.stats[exercise.id]).map((exercise) => (
        <p key={exercise.id} style={{ color: colorOf(exercise.id) }} className="flex min-w-0 tabular-nums">
          <span className="min-w-0 truncate">{exercise.name}</span>
          <span className="shrink-0 whitespace-nowrap">:&nbsp;{formatStat(point.stats[exercise.id])}</span>
        </p>
      ))}
    </div>
  )
}

// Buttons that show or hide each exercise, one for every exercise in the workout. Their colored
// dots also act as the charts' legend. Once 8 are on, the others can't be switched on until one
// is switched off.
function ExercisePicker({ exercises, shownIds, colorOf, onToggle }: {
  exercises: ChartExercise[]
  shownIds: string[]
  colorOf: ColorOf
  onToggle: (exerciseId: string) => void
}) {
  const full = shownIds.length >= MAX_SHOWN

  return (
    <div className="flex flex-wrap gap-1.5">
      {exercises.map((exercise) => {
        const shown = shownIds.includes(exercise.id)
        const blocked = !shown && full

        return (
          <button
            key={exercise.id}
            type="button"
            title={exercise.name}
            aria-pressed={shown}
            disabled={blocked}
            onClick={() => onToggle(exercise.id)}
            className={`flex items-center gap-1.5 min-w-0 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors duration-200 ${
              shown
                ? 'border-white/20 text-zinc-50'
                : 'border-white/10 text-zinc-400 line-through disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
          >
            <span
              aria-hidden="true"
              // Off, the dot is a gray ring: its color goes to whichever exercise is switched on next
              className={`w-2 h-2 shrink-0 rounded-full ${shown ? '' : 'ring-1 ring-inset ring-zinc-500'}`}
              style={shown ? { backgroundColor: colorOf(exercise.id) } : undefined}
            />
            {/* Long names are cut short, so one long exercise doesn't take a row of its own. The full
                name shows on hover and is read out by screen readers. */}
            <span className="min-w-0 max-w-40 truncate text-left">{exercise.name}</span>
          </button>
        )
      })}
    </div>
  )
}

// How long a lit-up stretch of line takes to fade (trail-glow in index.css), as on the homepage chart
const TRAIL_MS = 900
// How long a line takes to draw itself and each dot to pop in (draw-line and pop-dot in index.css).
// A little quicker than the homepage's, since this chart is opened to be read. Each dot pops in as
// the line reaches it.
const DRAW_MS = 450
const POP_MS = 300

type LinePoint = { x: number; y: number; index: number }

// The stretch of a line around one session: halfway to the session drawn on each side. A
// session this exercise wasn't logged in has no dot, so nothing lights up there.
function stretch(drawn: LinePoint[], index: number) {
  const at = drawn.findIndex((point) => point.index === index)
  if (at === -1) return null
  const middle = (a: LinePoint, b: LinePoint) => `${(a.x + b.x) / 2},${(a.y + b.y) / 2}`
  return [
    ...(at > 0 ? [middle(drawn[at - 1], drawn[at])] : []),
    `${drawn[at].x},${drawn[at].y}`,
    ...(at < drawn.length - 1 ? [middle(drawn[at], drawn[at + 1])] : []),
  ].join(' ')
}

// One line, drawn by hand rather than by Recharts, so it can use the homepage's drawing animation
// and carry the trail. Straight segments joining the logged sessions, like connectNulls. Recharts
// passes the points and stroke. Only a fresh line draws itself: Recharts replaces every line's
// elements whenever the lines change, so the others would draw again too.
function TrailLine({ points, stroke, trail, fresh, onDrawn }: Partial<LineDrawShapeProps> & {
  trail: { key: number; index: number }[]
  fresh: boolean
  onDrawn: () => void
}) {
  const drawn = (points ?? []).flatMap((point, index) =>
    point.x == null || point.y == null ? [] : [{ x: point.x, y: point.y, index }])
  if (drawn.length === 0) return null
  return (
    <g>
      <path
        d={`M${drawn.map((point) => `${point.x},${point.y}`).join('L')}`}
        pathLength={1}
        className={fresh ? 'draw-line' : undefined}
        // Settled once the last dot has popped in too, which starts as the line finishes
        onAnimationEnd={fresh ? () => setTimeout(onDrawn, POP_MS) : undefined}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {trail.map((item) => {
        const part = stretch(drawn, item.index)
        return part && (
          <polyline key={item.key} points={part} className="trail-glow" fill="none" stroke={stroke} strokeLinecap="round" strokeLinejoin="round" />
        )
      })}
    </g>
  )
}

// One line chart. It only draws the exercises in lines, and its tooltip only lists those in shown.
// It works like the homepage's chart: each line draws itself from left to right when it's first
// shown (also when switched on), its dots pop in as it reaches them, and moving across the chart
// leaves a short glowing trail.
function ProgressLines({ title, unit, height, points, colorOf, shown, lines, lineKey, drawnKeys, onDrawn, emptyText, ticks }: {
  title: string
  unit: string
  height: number
  points: ChartPoint[]
  colorOf: ColorOf
  shown: ChartExercise[]
  lines: ChartExercise[]
  lineKey: (exerciseId: string) => `weight_${string}` | `reps_${string}`
  // The lines that have finished drawing themselves, by line key, so they don't draw again
  drawnKeys: Set<string>
  onDrawn: (key: string) => void
  // With nothing switched on: the empty grid still shows, scaled to the workout's numbers (ticks)
  // so it keeps its size, with this message over it, like the homepage's chart
  emptyText?: string
  ticks?: number[]
}) {
  // The session under the pointer, and the sessions it recently passed, each lighting up its
  // stretch of every line until its fade has played
  const [active, setActive] = useState<number | null>(null)
  const [trail, setTrail] = useState<{ key: number; index: number }[]>([])
  const trailKey = useRef(0)

  function track(state: MouseHandlerDataParam) {
    const raw = state.activeTooltipIndex
    const index = raw === undefined || raw === null ? null : Number(raw)
    if (index === null || Number.isNaN(index) || index === active) return
    setActive(index)
    const key = ++trailKey.current
    setTrail((current) => [...current, { key, index }])
    setTimeout(() => setTrail((current) => current.filter((item) => item.key !== key)), TRAIL_MS)
  }

  // Which exercise each line is shows in the colored names above the charts, so the title is just the measure
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-medium text-zinc-400">{title}</h3>
      <div
        className="relative"
        style={{ '--draw-duration': `${DRAW_MS}ms`, '--pop-duration': `${POP_MS}ms` } as CSSProperties}
        role={emptyText ? undefined : 'img'}
        aria-label={emptyText ? undefined : `${title} per session for ${lines.map((line) => line.name).join(', ')}. The same numbers are in the table below.`}
      >
        <ResponsiveContainer width="100%" height={height}>
          <LineChart
            data={points}
            margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
            onMouseMove={track}
            onTouchMove={track}
            onMouseLeave={() => setActive(null)}
          >
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis
              dataKey="id"
              tickFormatter={(id: string) => formatShortDay(points.find((point) => point.id === id)?.date ?? '')}
              tick={axisTick}
              tickLine={false}
              axisLine={{ stroke: 'var(--chart-axis)' }}
              minTickGap={16}
              // Room between the dates and the lowest value label, which sit in the same corner
              tickMargin={8}
              padding={{ left: 12, right: 4 }}
            />
            <YAxis
              width={44}
              domain={ticks ? [ticks[0], ticks[ticks.length - 1]] : ['auto', 'auto']}
              ticks={ticks}
              unit={unit}
              allowDecimals={unit !== ''}
              tick={axisTick}
              tickLine={false}
              axisLine={false}
            />
            {!emptyText && (
              <Tooltip content={<ChartTooltip exercises={shown} colorOf={colorOf} />} cursor={{ stroke: 'var(--chart-axis)' }} />
            )}
            {/* Recharts only labels the axes with a line on the chart, so the empty grid has an
                invisible one */}
            {emptyText && points.length > 0 && (
              <Line dataKey={() => ticks?.[0] ?? 0} stroke="transparent" dot={false} activeDot={false} isAnimationActive={false} />
            )}
            {lines.map((line) => {
              const color = colorOf(line.id)
              const key = lineKey(line.id)
              const fresh = !drawnKeys.has(key)

              return (
                <Line
                  key={line.id}
                  dataKey={key}
                  name={line.name}
                  stroke={color}
                  strokeWidth={2}
                  // A missing session has no dot, and the line joins the dots on either side
                  connectNulls
                  shape={<TrailLine trail={trail} fresh={fresh} onDrawn={() => onDrawn(key)} />}
                  // Each dot pops in as the drawing line reaches it
                  dot={({ cx, cy, index, value }) => cx == null || cy == null || value == null ? <g key={`dot-${index}`} /> : (
                    <circle
                      key={`dot-${index}`}
                      className={fresh ? 'pop-dot' : undefined}
                      style={{ '--reveal-delay': `${points.length > 1 ? (index / (points.length - 1)) * DRAW_MS : 0}ms` } as CSSProperties}
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill={color}
                      stroke="var(--chart-surface)"
                      strokeWidth={2}
                    />
                  )}
                  activeDot={{ r: 6, stroke: 'var(--chart-surface)', strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              )
            })}
          </LineChart>
        </ResponsiveContainer>
        {emptyText && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-zinc-400">{emptyText}</p>
        )}
      </div>
    </div>
  )
}

// Table rows shown at a time, like the other lists in the app
const TABLE_PAGE_SIZE = 10

// The same numbers as the charts, for anyone who can't use their hover details. It has a column
// for each exercise that's switched on above the charts, with the same colored dot, so it always
// matches what the charts show. Newest first, since recent sessions matter most, and 10 rows at a
// time so it stays short. Sessions with nothing logged for those exercises are left out.
function ProgressTable({ points, exercises, colorOf }: { points: ChartPoint[]; exercises: ChartExercise[]; colorOf: ColorOf }) {
  const [shownCount, setShownCount] = useState(TABLE_PAGE_SIZE)
  const newestFirst = [...points].reverse().filter((point) => exercises.some((exercise) => point.stats[exercise.id]))

  return (
    // group lets the chevron flip when the table is open, like the History cards
    <details className="group">
      <summary className="inline-flex items-center gap-1.5 cursor-pointer list-none [&::-webkit-details-marker]:hidden text-xs font-medium text-zinc-400 hover:text-zinc-50 transition-colors duration-200">
        <span className="transition-transform duration-200 group-open:rotate-180"><ChevronDownIcon size={14} /></span>
        <span className="group-open:hidden">Show as table</span>
        <span className="hidden group-open:inline">Hide table</span>
      </summary>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-xs tabular-nums">
          <thead>
            <tr className="text-left text-zinc-400">
              <th scope="col" className="py-1.5 pr-4 font-medium">Date</th>
              {exercises.map((exercise) => (
                // Long names are cut short so one exercise can't make the table wide; hover shows all of it
                <th key={exercise.id} scope="col" title={exercise.name} className="py-1.5 pr-4 font-medium">
                  <span className="flex items-center gap-1.5">
                    <span aria-hidden="true" className="w-2 h-2 shrink-0 rounded-full" style={{ backgroundColor: colorOf(exercise.id) }} />
                    <span className="block max-w-40 truncate">{exercise.name}</span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {newestFirst.slice(0, shownCount).map((point) => (
              <tr key={point.id} className="border-t border-white/8">
                <th scope="row" className="py-1.5 pr-4 text-left font-medium whitespace-nowrap">{formatShortDay(point.date)}</th>
                {exercises.map((exercise) => (
                  <td key={exercise.id} className="py-1.5 pr-4 whitespace-nowrap">
                    {point.stats[exercise.id] ? formatStat(point.stats[exercise.id]) : '–'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {newestFirst.length > shownCount && (
        <div className="mt-3 flex items-center gap-3">
          <button onClick={() => setShownCount((count) => count + TABLE_PAGE_SIZE)} className={secondaryButton}>
            Show more
          </button>
          <span className="text-xs text-zinc-400 tabular-nums">
            Showing {shownCount} of {newestFirst.length}
          </span>
        </div>
      )}
    </details>
  )
}

// Shows how each exercise's heaviest weight and, where it applies, its reps have changed across a workout's finished sessions
export default function WorkoutProgressChart({ workoutId }: { workoutId: string }) {
  const { logout } = useAuthStore()
  const [sessions, setSessions] = useState<ChartSession[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  // Which exercises are on, and each one's color number. null until the first switch: then the
  // first 8 are on, in the colors 1 to 8. A color stays with its exercise while it's on, and is
  // handed to the next exercise switched on once it's free.
  const [picked, setPicked] = useState<{ ids: string[]; colors: Record<string, number> } | null>(null)
  // Lines that have drawn themselves (weight_<id> or reps_<id>). Switching an exercise off takes
  // its lines out, so switching it back on draws them again, like on the homepage.
  const [drawnKeys, setDrawnKeys] = useState<Set<string>>(() => new Set())
  const markDrawn = (key: string) => setDrawnKeys((current) => new Set(current).add(key))

  useEffect(() => {
    let ignore = false

    api.get<{ sessions: ChartSession[] }>('/sessions', { params: { workoutId, limit: MAX_SESSIONS } })
      .then(({ data }) => {
        if (ignore) return
        setSessions(data.sessions)
        setStatus('ready')
      })
      .catch((err) => {
        if (ignore) return
        if (isUnauthorized(err)) logout()
        else setStatus('error')
      })

    return () => { ignore = true }
  }, [workoutId, attempt, logout])

  const { points, exercises } = buildChartData(sessions)
  const current = picked ?? {
    ids: exercises.slice(0, MAX_SHOWN).map((exercise) => exercise.id),
    colors: Object.fromEntries(exercises.slice(0, MAX_SHOWN).map((exercise, index) => [exercise.id, index + 1])),
  }
  const shown = exercises.filter((exercise) => current.ids.includes(exercise.id))
  const colorOf: ColorOf = (exerciseId) => `var(--series-${current.colors[exerciseId] ?? 1})`
  const weightLines = shown.filter((exercise) => exercise.hasWeight)
  const repLines = shown.filter((exercise) => exercise.tracksReps)
  // The range of every exercise's numbers, for the empty grid shown when nothing is switched on:
  // weights if any exercise has them, otherwise reps
  const anyWeight = exercises.some((exercise) => exercise.hasWeight)
  const emptyKey = anyWeight ? weightKey : repsKey
  const allValues = points.flatMap((point) => exercises.map((exercise) => point[emptyKey(exercise.id)]))
    .filter((value): value is number => typeof value === 'number')
  const emptyTicks = ticksFor(allValues.length > 0 ? allValues : [0, 10], anyWeight ? undefined : [1, 2, 5, 10, 20, 25, 50, 100])
  const message = 'text-sm text-zinc-400'

  function toggleExercise(exerciseId: string) {
    if (current.ids.includes(exerciseId)) {
      const colors = { ...current.colors }
      delete colors[exerciseId]
      setDrawnKeys((current) => {
        const next = new Set(current)
        next.delete(weightKey(exerciseId))
        next.delete(repsKey(exerciseId))
        return next
      })
      setPicked({ ids: current.ids.filter((id) => id !== exerciseId), colors })
      return
    }
    if (current.ids.length >= MAX_SHOWN) return
    // The lowest color number no exercise that's on is using
    const used = new Set(current.ids.map((id) => current.colors[id]))
    let color = 1
    while (used.has(color)) color++
    setPicked({ ids: [...current.ids, exerciseId], colors: { ...current.colors, [exerciseId]: color } })
  }

  return (
    // The Progress heading that opens this is on the workout's page
    <section className="flex flex-col gap-3">

      {status === 'loading' && <Loading>Loading your progress…</Loading>}

      {status === 'error' && (
        <LoadError what="your progress" onRetry={() => { setStatus('loading'); setAttempt((a) => a + 1) }} />
      )}

      {status === 'ready' && sessions.length < 2 && (
        <p className={message}>Finish this workout twice to see your progress.</p>
      )}

      {status === 'ready' && sessions.length >= 2 && (
        <div className={`${card} flex flex-col gap-4`}>
          {exercises.length === 0 && (
            <p className={message}>No logged sets to chart yet.</p>
          )}
          {exercises.length > 0 && (
            <ExercisePicker exercises={exercises} shownIds={current.ids} colorOf={colorOf} onToggle={toggleExercise} />
          )}
          {exercises.length > MAX_SHOWN && (
            <p className="-mt-2 text-xs text-zinc-400">
              Up to {MAX_SHOWN} at a time. Switch one off to show another.
            </p>
          )}
          {exercises.length > 0 && shown.length === 0 && (
            <ProgressLines
              title={anyWeight ? 'Heaviest weight' : 'Most reps'}
              unit={anyWeight ? ' kg' : ''}
              height={anyWeight ? 280 : 180}
              points={points}
              colorOf={colorOf}
              shown={shown}
              lines={[]}
              lineKey={emptyKey}
              drawnKeys={drawnKeys}
              onDrawn={markDrawn}
              emptyText="Choose an exercise to show."
              ticks={emptyTicks}
            />
          )}
          {weightLines.length > 0 && (
            <ProgressLines
              title="Heaviest weight"
              unit=" kg"
              height={280}
              points={points}
              colorOf={colorOf}
              shown={shown}
              lines={weightLines}
              lineKey={weightKey}
              drawnKeys={drawnKeys}
              onDrawn={markDrawn}
            />
          )}
          {repLines.length > 0 && (
            <ProgressLines
              title="Most reps"
              unit=""
              height={180}
              points={points}
              colorOf={colorOf}
              shown={shown}
              lines={repLines}
              lineKey={repsKey}
              drawnKeys={drawnKeys}
              onDrawn={markDrawn}
            />
          )}
          {shown.length > 0 && <ProgressTable points={points} exercises={shown} colorOf={colorOf} />}
        </div>
      )}
    </section>
  )
}
