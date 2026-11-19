import { useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import Dashboard from '../components/Dashboard'
import Navbar from '../components/Navbar'
import PageBackdrop from '../components/PageBackdrop'
import ScrollLifter from '../components/ScrollLifter'
// The taller version of the photo, with the whole person and rack, for the full first screen
import heroPhoto from '../assets/background-hero_bigger.webp'
import { accentButton, bodyText, eyebrow, primaryButton, softPill } from '../lib/styles'
import { ArrowRightIcon } from '../components/icons'
import Reveal from '../components/Reveal'
import ProgressChartPreview from '../components/ProgressChartPreview'
import SessionPreview from '../components/SessionPreview'

// Section titles on the homepage are a step bigger than page titles elsewhere; the label and body text are shared
const sectionTitle = 'text-3xl md:text-4xl font-semibold tracking-tight leading-[1.1]'

// The hero photo is 2560 × 1429. The part below the navbar used to be a shorter crop of it, its
// bottom 940 rows, scaled to cover the screen below the navbar (H) and centered. That's kept: the
// photo gets the same scale and is shifted so the crop lines up with the navbar's bottom edge,
// which leaves the 489 rows above it (the head) behind the navbar. The scale is whichever is
// larger, H / 940 or the width / 2560, like background-size: cover did for the crop.
const H = '(100svh - 3.5rem)'
const SCALE = `max(${H} / 940, 100vw / 2560)`
const heroPhotoStyle = {
  backgroundImage: `url(${heroPhoto})`,
  backgroundSize: `auto calc(1429 * ${SCALE})`,
  // The crop's top at the navbar's bottom (3.5rem), centered on H as cover centered it
  backgroundPosition: `center calc(3.5rem + ${H} / 2 - 959 * ${SCALE})`,
}

// A routine is an ordered list that rotates, not a weekly calendar, so the preview shows
// positions and a Next marker like the real Routines page
const routineWorkouts = ['Push Day', 'Pull Day', 'Legs', 'Shoulders / Abs']
const NEXT_WORKOUT_INDEX = 1

// The routine as a plain list. The Next button moves the Next label down to the following
// workout (back to the first after the last), like skipping ahead on the dashboard. There's one
// label, and it slides from row to row. Nothing is saved.
function RoutinePreview() {
  const [next, setNext] = useState(NEXT_WORKOUT_INDEX)
  // Only a workout the label moves onto pulses, not the first one
  const [moved, setMoved] = useState(false)
  const landed = (index: number) => moved && index === next
  const listRef = useRef<HTMLUListElement>(null)
  const labelRef = useRef<HTMLDivElement>(null)

  // Lines the label up with the middle of the next workout's row. It's set directly on the
  // element, and the CSS transition on top does the sliding. Measured again whenever the list
  // changes size, like when the text wraps differently on a narrower screen.
  useLayoutEffect(() => {
    const list = listRef.current
    const label = labelRef.current
    if (!list || !label) return
    const place = () => {
      const row = list.children[next] as HTMLElement | undefined
      if (row) label.style.top = `${row.offsetTop + row.offsetHeight / 2}px`
    }
    place()
    const observer = new ResizeObserver(place)
    observer.observe(list)
    return () => observer.disconnect()
  }, [next])

  return (
    <div className="flex flex-col gap-3 max-md:order-2">
      <div className="relative">
        <ul ref={listRef} className="divide-y divide-white/8">
          {routineWorkouts.map((name, index) => (
            <Reveal as="li" key={name} delay={index * 60}>
              {/* The workout the label lands on pulses: the row flashes green and its number and
                  name pop. A new key on each move plays it again. */}
              <div
                key={index === next ? `next-${next}` : 'row'}
                className={`flex items-center gap-6 py-4 px-2 -mx-2 rounded-xl ${landed(index) ? 'row-flash' : ''}`}
              >
                <span className={`inline-block w-6 text-sm font-mono font-bold text-accent-dim ${landed(index) ? 'land-pulse' : ''}`}>
                  {index + 1}
                </span>
                <span className="flex-1 text-lg font-medium text-zinc-50">
                  <span className={`inline-block origin-left ${landed(index) ? 'land-pulse' : ''}`}>{name}</span>
                  {/* The label is drawn apart from the rows, so screen readers hear it here */}
                  {index === next && <span className="sr-only">, next</span>}
                </span>
              </div>
            </Reveal>
          ))}
        </ul>
        <div
          ref={labelRef}
          aria-hidden="true"
          className="absolute right-0 -translate-y-1/2 transition-[top] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
        >
          {/* Pops in after the rows the first time */}
          <Reveal as="span" variant="pop" delay={routineWorkouts.length * 60 + 100} className="inline-block">
            {/* A quick small pulse as it lands, next to the row's bigger one. A new key on each move
                plays it again. */}
            <span key={next} className={`${softPill} inline-block ${moved ? 'label-tap' : ''}`}>Next</span>
          </Reveal>
        </div>
      </div>
      <Reveal variant="pop" delay={routineWorkouts.length * 60 + 150} className="self-end">
        <button type="button" onClick={() => { setNext((index) => (index + 1) % routineWorkouts.length); setMoved(true) }} className={`flex items-center gap-2 ${primaryButton}`}>
          Next
          <ArrowRightIcon size={14} />
        </button>
      </Reveal>
    </div>
  )
}

// The big logo and name on the first screen. The logo does a rep when the page opens (rep-press
// in index.css): it presses up under load and locks out, and a green ring pulses out like a
// completed set. Hovering it (or tapping it, on a phone without hover) does one more rep, once the
// last one has finished. With reduced motion there's no rep, so hovering does nothing.
function HeroLogo() {
  const [reps, setReps] = useState(0)
  // True while a rep plays, so hovering mid-rep doesn't restart it. Hovering the logo or the
  // name starts one.
  const repping = useRef(true)

  function oneMoreRep() {
    if (repping.current) return
    repping.current = true
    setReps((count) => count + 1)
  }

  return (
    <Reveal onLoad variant="none" className="group order-first md:order-none pl-5 md:pl-0 flex flex-col items-start md:items-center gap-2 shrink-0">
      {/* A new key draws the logo and ring again, which plays the rep again */}
      <span
        key={reps}
        onMouseEnter={oneMoreRep}
        onClick={oneMoreRep}
        onAnimationEnd={(e) => { if (e.animationName === 'rep-press') repping.current = false }}
        className="relative block"
      >
        <span aria-hidden="true" className="rep-ring absolute inset-0 rounded-full border-2 border-accent" />
        <img
          src="/logo.svg"
          alt=""
          className="rep-press relative h-20 w-20 md:h-40 md:w-40 drop-shadow-[0_8px_24px_rgba(0,0,0,0.6)] transition-transform duration-300 ease-out group-hover:scale-110 motion-reduce:transition-none"
        />
      </span>
      {/* Keyed like the logo, so each rep brings the name in again at lockout */}
      <span key={`name-${reps}`} onMouseEnter={oneMoreRep} onClick={oneMoreRep} className="name-rise font-brand text-2xl md:text-3xl font-extrabold drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] transition-transform duration-300 ease-out group-hover:scale-110 motion-reduce:transition-none">
        out<span className="text-accent">FIT</span>less
      </span>
    </Reveal>
  )
}

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
      {/* A little lifter in the corner who does a rep for every bit of scrolling */}
      <ScrollLifter />

      {/* Hero: a full-screen photo, pulled up under the navbar (-mt-14, the navbar's height) so
          the photo shows through the navbar's see-through background too. It's placed with
          heroPhotoStyle so the screen below the navbar shows exactly the old, shorter crop, and
          the rest of the photo (the person's head) sits behind the navbar. Its height uses svh,
          the screen with the phone's address bar showing, which doesn't change while scrolling.
          With dvh it grew and shrank as the bar slid in and out, and the photo zoomed. */}
      <section className="relative -mt-14 flex min-h-svh bg-zinc-950 bg-no-repeat" style={heroPhotoStyle}>
        {/* Darkens the whole photo, most at the bottom where the text sits, so it isn't much brighter
            than the darkened photo behind the other pages */}
        <div className="absolute inset-0 bg-linear-to-t from-black/95 via-black/78 to-black/70" />

        {/* Text on the left, logo on the right. On phones the logo sits above the text instead,
            lined up with it on the left. */}
        <div className="relative mt-auto max-w-6xl mx-auto w-full px-6 sm:px-10 pb-14 md:pb-20 flex flex-col items-start gap-6 md:flex-row md:items-center md:gap-16 lg:gap-56 text-white">
          {/* Comes in on load one piece at a time, after the logo */}
          <div className="flex flex-col gap-7">
            {/* Leads with automatic progression, the thing most trackers don't do */}
            <Reveal onLoad delay={100}>
              <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-[1.08] max-w-[16ch]">
                Hit your reps, and the weight goes up.
              </h1>
            </Reveal>

            <Reveal onLoad delay={200}>
              <p className="text-base text-zinc-200 leading-relaxed max-w-[46ch]">
                outFITless tracks every set and plans your next workout for you: more weight when you reach the top of your rep range, less when you fall short.
              </p>
            </Reveal>

            <Reveal onLoad delay={300} variant="pop">
              <SignupButton />
            </Reveal>
          </div>

          {/* First on phones (above the text, smaller), on the right from tablet width up */}
          <HeroLogo />
        </div>
      </section>

      <main className="relative flex flex-col flex-1 max-w-6xl mx-auto w-full px-6 sm:px-10">

        {/* Each section is the same three steps: a small green label, a big heading, then gray
            body text. Space between sections does the separating, instead of card borders. */}

        {/* Logging: text left, app preview right */}
        <section className="grid grid-cols-2 gap-16 items-center py-28 max-md:grid-cols-1 max-md:gap-12 max-md:py-20">
          <Reveal className="flex flex-col gap-5">
            <p className={eyebrow}>Log</p>
            <h2 className={sectionTitle}>Log every set as you go.</h2>
            <p className={bodyText}>
              Check off sets and see what you lifted last time. The rest timer beeps when it's time for your next set.
            </p>
          </Reveal>

          {/* A working copy of the session screen: one exercise and the rest timer below it */}
          <Reveal variant="pop" delay={60}>
            <SessionPreview />
          </Reveal>
        </section>

        {/* Planning: the week as a plain list on the left, text on the right. On phones the text comes first. */}
        <section className="grid grid-cols-2 gap-16 items-center py-28 max-md:grid-cols-1 max-md:gap-12 max-md:py-20">
          <RoutinePreview />

          <Reveal className="flex flex-col gap-5">
            <p className={eyebrow}>Plan</p>
            <h2 className={sectionTitle}>Routines that rotate.</h2>
            <p className={bodyText}>
              Put your workouts in order and follow the routine. Finish one and the next is waiting on your dashboard, whatever day you train. Need a change? Skip ahead with one tap.
            </p>
          </Reveal>
        </section>

        {/* Progress: text left, chart right, like the Log section */}
        <section className="grid grid-cols-2 gap-16 items-center py-28 max-md:grid-cols-1 max-md:gap-12 max-md:py-20">
          <Reveal className="flex flex-col gap-5">
            <p className={eyebrow}>Progress</p>
            <h2 className={sectionTitle}>Watch the numbers climb.</h2>
            <p className={bodyText}>
              Every workout gets a chart of your heaviest weight and best reps for each exercise, session by session.
            </p>
          </Reveal>

          <Reveal variant="pop" delay={60}>
            <ProgressChartPreview />
          </Reveal>
        </section>

        {/* Closing call to action, so a visitor who scrolled to the end has a button in reach.
            A faint line marks the end of the features, then space does the rest. */}
        <section className="flex flex-col items-center text-center gap-5 py-28 border-t border-white/8 max-md:py-20">
          <Reveal>
            <h2 className={sectionTitle}>Have your workout already planned.</h2>
          </Reveal>
          <Reveal delay={80}>
            <p className={bodyText}>
              Set up your exercises once. After every session, outFITless works out what to lift next time.
            </p>
          </Reveal>
          <Reveal variant="pop" delay={160} className="mt-2">
            <SignupButton />
          </Reveal>
        </section>

      </main>

      {/* Who made it, in plain text, so a search for the name finds the site too. All on the left,
          since the scroll lifter finishes his last rep at the bottom right. */}
      <footer className="relative max-w-6xl mx-auto w-full px-6 sm:px-10 py-8 border-t border-white/8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-zinc-400">
        <p>
          <span className="font-brand font-extrabold text-zinc-200">out<span className="text-accent">FIT</span>less</span>
          {' '}· Made by{' '}
          <a href="https://github.com/MarkoRoskar" target="_blank" rel="noopener" className="text-zinc-200 hover:text-accent transition-colors duration-200">
            Marko Roškar
          </a>
        </p>
        <Link to="/privacy" className="hover:text-zinc-50 transition-colors duration-200">Privacy</Link>
      </footer>
    </div>
  )
}
