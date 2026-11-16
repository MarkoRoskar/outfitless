import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import Dashboard from '../components/Dashboard'
import Navbar from '../components/Navbar'
import PageBackdrop from '../components/PageBackdrop'
import background from '../assets/background-hero.webp'
import { accentButton, bodyText, card, eyebrow, fieldClass, secondaryButton, softPill } from '../lib/styles'
import { CheckIcon } from '../components/icons'

// Section titles on the homepage are a step bigger than page titles elsewhere; the label and body text are shared
const sectionTitle = 'text-3xl md:text-4xl font-semibold tracking-tight leading-[1.1]'

// The preview copies one exercise card from the real session screen. Last time the first set
// reached 12 reps, the top of the 8–12 range, so the weight went up from 80 to 82.5 kg.
const previewSets = [
  { reps: 8, weight: 82.5, done: true, last: '80 kg × 12' },
  { reps: 8, weight: 82.5, done: true, last: '80 kg × 11' },
  { reps: 7, weight: 82.5, done: false, last: '80 kg × 10' },
]

// Bench Press over five sessions, for the static copy of the real progress chart.
// The weight goes up each time the top of the rep range is reached.
const chartSessions = [
  { date: '3 Mar', weight: 80 },
  { date: '7 Mar', weight: 80 },
  { date: '10 Mar', weight: 82.5 },
  { date: '14 Mar', weight: 82.5 },
  { date: '17 Mar', weight: 85 },
]
const CHART_TICKS = [77.5, 80, 82.5, 85, 87.5]

// Chart layout in SVG units. The SVG scales to its container, so these are proportions.
const CHART = { width: 480, height: 220, left: 52, right: 16, top: 12, bottom: 32 }
const chartX = (index: number) =>
  CHART.left + 16 + (index * (CHART.width - CHART.left - CHART.right - 32)) / (chartSessions.length - 1)
const chartY = (weight: number) =>
  CHART.top + ((CHART_TICKS[CHART_TICKS.length - 1] - weight) / (CHART_TICKS[CHART_TICKS.length - 1] - CHART_TICKS[0])) *
    (CHART.height - CHART.top - CHART.bottom)

// Drawn with the same colors, dots and grid as the real chart on a workout's page
function ProgressChartPreview() {
  const line = chartSessions.map((session, index) => `${chartX(index)},${chartY(session.weight)}`).join(' ')

  return (
    <div className={`${card} flex flex-col gap-4`}>
      {/* The exercise name with its colored dot, like the exercise buttons above the real charts */}
      <span className="self-start flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/20 text-xs font-medium text-zinc-50">
        <span aria-hidden="true" className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--series-1)' }} />
        Bench Press
      </span>
      <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-zinc-400">Heaviest weight</p>
      <svg viewBox={`0 0 ${CHART.width} ${CHART.height}`} className="w-full h-auto">
        {CHART_TICKS.map((tick, index) => (
          <g key={tick}>
            <line
              x1={CHART.left}
              x2={CHART.width - CHART.right}
              y1={chartY(tick)}
              y2={chartY(tick)}
              stroke={index === 0 ? 'var(--chart-axis)' : 'var(--chart-grid)'}
            />
            <text x={CHART.left - 8} y={chartY(tick)} dy="0.35em" textAnchor="end" fontSize="11" fill="var(--chart-axis-text)">
              {tick} kg
            </text>
          </g>
        ))}
        {chartSessions.map((session, index) => (
          <text key={session.date} x={chartX(index)} y={CHART.height - 10} textAnchor="middle" fontSize="11" fill="var(--chart-axis-text)">
            {session.date}
          </text>
        ))}
        <polyline points={line} fill="none" stroke="var(--series-1)" strokeWidth="2" strokeLinejoin="round" />
        {chartSessions.map((session, index) => (
          <circle
            key={session.date}
            cx={chartX(index)}
            cy={chartY(session.weight)}
            r="4"
            fill="var(--series-1)"
            stroke="var(--chart-surface)"
            strokeWidth="2"
          />
        ))}
      </svg>
      </div>
    </div>
  )
}

// A routine is an ordered list that rotates, not a weekly calendar, so the preview shows
// positions and a Next marker like the real Routines page
const routineWorkouts = ['Push Day', 'Pull Day', 'Legs', 'Shoulders / Abs']
const NEXT_WORKOUT_INDEX = 1

// The sign-up button, used in the hero and again at the end of the page. It uses the same
// green button style as the rest of the app, so the homepage looks like the same product.
function SignupButton() {
  return (
    <Link to="/signup" className={`inline-flex items-center w-fit ${accentButton}`}>
      Create account
    </Link>
  )
}

export default function HomePage() {
  const { token } = useAuthStore()

  // Logged-in users get their dashboard, and everyone else gets the landing page below
  if (token) return <Dashboard />

  return (
    <div className="min-h-dvh flex flex-col bg-surface text-zinc-50">

      <Navbar right={<Link to="/login" className="text-sm font-medium text-zinc-400 hover:text-zinc-50 transition-colors duration-200">Log in</Link>} />
      {/* The app's darkened photo, behind the sections below the hero */}
      <PageBackdrop />

      {/* Hero: a full-screen photo. bg-cover fills any screen shape by cropping the edges,
          and bg-center keeps the person in the middle visible on narrow phones. */}
      <section
        className="relative flex min-h-[calc(100dvh-3.5rem)] bg-zinc-950 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${background})` }}
      >
        {/* Darkens the whole photo, most at the bottom where the text sits, so it isn't much brighter
            than the darkened photo behind the other pages */}
        <div className="absolute inset-0 bg-linear-to-t from-black/95 via-black/78 to-black/70" />

        {/* Text on the left, logo on the right. Phones show only the text. */}
        <div className="relative mt-auto max-w-6xl mx-auto w-full px-6 sm:px-10 pb-14 md:pb-20 flex flex-col items-start gap-10 md:flex-row md:items-center md:gap-16 lg:gap-56 text-white">
          <div className="flex flex-col gap-7">
            {/* Leads with automatic progression, the thing most trackers don't do */}
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-[1.08] max-w-[16ch]">
              Hit your reps, and the weight goes up.
            </h1>

            <p className="text-base text-zinc-200 leading-relaxed max-w-[46ch]">
              outFITless tracks every set and plans your next workout for you: more weight when you reach the top of your rep range, less when you fall short.
            </p>

            <SignupButton />
          </div>

          {/* Hidden on phones, where the navbar logo is enough and the headline needs the room */}
          <div className="hidden md:flex flex-col items-center gap-2 shrink-0">
            <img
              src="/logo.svg"
              alt=""
              className="h-24 w-24 md:h-40 md:w-40 drop-shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
            />
            <span className="font-brand text-2xl md:text-3xl font-extrabold drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              out<span className="text-accent">FIT</span>less
            </span>
          </div>
        </div>
      </section>

      <main className="relative flex flex-col flex-1 max-w-6xl mx-auto w-full px-6 sm:px-10">

        {/* Each section is the same three steps: a small green label, a big heading, then gray
            body text. Space between sections does the separating, instead of card borders. */}

        {/* Logging: text left, app preview right */}
        <section className="grid grid-cols-2 gap-16 items-center py-28 max-md:grid-cols-1 max-md:gap-12 max-md:py-20">
          <div className="flex flex-col gap-5">
            <p className={eyebrow}>Log</p>
            <h2 className={sectionTitle}>Log every set as you go.</h2>
            <p className={bodyText}>
              Check off sets and see what you lifted last time. The rest timer beeps when it's time for your next set.
            </p>
          </div>

          {/* A static copy of the session screen: one exercise card and the rest timer below it.
              It's a picture, not a form, so screen readers skip it and the text beside it explains. */}
          <div aria-hidden="true" className="flex flex-col gap-3">
            <div className={`${card} flex flex-col gap-3`}>
              <div className="flex flex-col gap-0.5">
                <p className="text-base font-semibold tracking-tight">Bench Press</p>
                <p className="text-xs text-zinc-400">3 × 8–12 reps</p>
              </div>
              <ol className="flex flex-col gap-2">
                {previewSets.map((set, index) => (
                  <li key={index} className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="w-4 shrink-0 text-xs font-mono font-bold text-accent-dim">{index + 1}</span>
                      <span className={`h-10 min-w-0 flex-1 sm:flex-none sm:w-24 flex items-center tabular-nums ${set.done ? 'opacity-60' : ''} ${fieldClass}`}>{set.reps}</span>
                      <span className="shrink-0 text-xs text-zinc-400">reps</span>
                      <span className={`h-10 min-w-0 flex-1 sm:flex-none sm:w-24 flex items-center tabular-nums ${set.done ? 'opacity-60' : ''} ${fieldClass}`}>{set.weight}</span>
                      <span className="shrink-0 text-xs text-zinc-400">kg</span>
                      <span
                        className={`h-10 w-10 shrink-0 flex items-center justify-center rounded-xl border ${
                          set.done ? 'border-accent-dim bg-accent-dim text-black' : 'border-white/10 text-zinc-400'
                        }`}
                      >
                        <CheckIcon size={18} />
                      </span>
                    </div>
                    <p className="pl-6 text-xs text-zinc-400 tabular-nums">Last time: {set.last}</p>
                  </li>
                ))}
              </ol>
            </div>

            <div className={`${card} bg-zinc-900! border border-accent-dim flex items-center justify-between gap-4`}>
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-zinc-400">Rest</span>
                <span className="font-mono text-xl font-semibold text-accent tabular-nums">1:23</span>
              </div>
              <span className={`inline-flex items-center ${secondaryButton}`}>Skip</span>
            </div>
          </div>
        </section>

        {/* Planning: the week as a plain list on the left, text on the right. On phones the text comes first. */}
        <section className="grid grid-cols-2 gap-16 items-center py-28 max-md:grid-cols-1 max-md:gap-12 max-md:py-20">
          <ul className="divide-y divide-white/8 max-md:order-2">
            {routineWorkouts.map((name, index) => (
              <li key={name} className="flex items-center gap-6 py-4">
                <span className="w-6 text-sm font-mono font-bold text-accent-dim">{index + 1}</span>
                <span className="flex-1 text-lg font-medium text-zinc-50">{name}</span>
                {index === NEXT_WORKOUT_INDEX && <span className={softPill}>Next</span>}
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-5">
            <p className={eyebrow}>Plan</p>
            <h2 className={sectionTitle}>Routines that rotate.</h2>
            <p className={bodyText}>
              Put your workouts in order and follow the routine. Finish one and the next is waiting on your dashboard, whatever day you train. Need a change? Skip ahead with one tap.
            </p>
          </div>
        </section>

        {/* Progress: text left, chart right, like the Log section */}
        <section className="grid grid-cols-2 gap-16 items-center py-28 max-md:grid-cols-1 max-md:gap-12 max-md:py-20">
          <div className="flex flex-col gap-5">
            <p className={eyebrow}>Progress</p>
            <h2 className={sectionTitle}>Watch the numbers climb.</h2>
            <p className={bodyText}>
              Every workout gets a chart of your heaviest weight and best reps for each exercise, session by session.
            </p>
          </div>

          <div aria-hidden="true">
            <ProgressChartPreview />
          </div>
        </section>

        {/* Closing call to action, so a visitor who scrolled to the end has a button in reach.
            A faint line marks the end of the features, then space does the rest. */}
        <section className="flex flex-col items-center text-center gap-5 py-28 border-t border-white/8 max-md:py-20">
          <h2 className={sectionTitle}>Have your workout already planned.</h2>
          <p className={bodyText}>
            Set up your exercises once. After every session, outFITless works out what to lift next time.
          </p>
          <div className="mt-2">
            <SignupButton />
          </div>
        </section>

      </main>
    </div>
  )
}
