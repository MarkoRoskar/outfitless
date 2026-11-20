import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { card, inlineLink, mainPageTitle, pageSectionHeading } from '../lib/styles'
import Navbar from '../components/Navbar'
import PageBackdrop from '../components/PageBackdrop'
import Reveal from '../components/Reveal'

const SITE = 'https://outfitless.onrender.com'
const PROFILES = [
  { label: 'Instagram', handle: '@markoroskar', href: 'https://www.instagram.com/markoroskar/' },
  { label: 'GitHub', handle: 'MarkoRoskar', href: 'https://github.com/MarkoRoskar' },
]

// Gives this page its own title, description and address for search engines, instead of the
// homepage's from index.html, and puts the homepage's back when leaving. A search for the name
// finds a page that's about the person, not only a footer that mentions them.
function usePageInfo(title: string, description: string, path: string) {
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name=description]')
    const canonical = document.querySelector<HTMLLinkElement>('link[rel=canonical]')
    const before = { title: document.title, description: meta?.content, canonical: canonical?.href }
    document.title = title
    if (meta) meta.content = description
    if (canonical) canonical.href = SITE + path
    return () => {
      document.title = before.title
      if (meta && before.description !== undefined) meta.content = before.description
      if (canonical && before.canonical !== undefined) canonical.href = before.canonical
    }
  }, [title, description, path])
}

// Who made outFITless, laid out like Privacy and Settings: open to everyone, signed in or not
export default function AboutPage() {
  usePageInfo(
    'Marko Roškar, maker of outFITless',
    'Marko Roškar built outFITless, a free workout tracker that plans your next workout for you. Find him on Instagram and GitHub.',
    '/about',
  )

  return (
    <div className="min-h-dvh flex flex-col bg-surface text-zinc-50">
      <Navbar />
      <PageBackdrop />

      <main className="relative flex flex-col flex-1 max-w-3xl mx-auto w-full px-6 sm:px-10 pt-8 pb-16 sm:pt-16 gap-8">
        <Reveal onLoad className="flex flex-col gap-2">
          <h1 className={mainPageTitle}>Marko Roškar</h1>
          <p className="text-sm text-zinc-400">The maker of outFITless</p>
        </Reveal>

        <Section title="About me" delay={60} tint="from-accent/12">
          <p>
            Hi, I'm Marko Roškar. I designed and built <Link to="/" className={inlineLink}>outFITless</Link>,
            a free workout tracker for people who lift.
          </p>
          <p>
            I wanted a tracker that does the thinking between workouts: log your sets, and it tells you
            what to lift next time.
          </p>
        </Section>

        <Section title="How it's made" delay={110} tint="from-sky-400/14">
          <p>
            outFITless is built with React, TypeScript and Tailwind CSS, with an Express and MongoDB
            server, and runs on Render.
          </p>
        </Section>

        <Section title="Find me" delay={160} tint="from-violet-400/14">
          <ul className="flex flex-col gap-2">
            {PROFILES.map((profile) => (
              <li key={profile.label} className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-zinc-400">{profile.label}</span>
                <a href={profile.href} target="_blank" rel="me noopener" className={inlineLink}>{profile.handle}</a>
              </li>
            ))}
          </ul>
        </Section>
      </main>
    </div>
  )
}

// A heading above a tinted card, like the sections in Privacy and Settings
function Section({ title, delay, tint, children }: { title: string; delay: number; tint: string; children: ReactNode }) {
  return (
    <Reveal as="section" delay={delay} className="flex flex-col gap-3">
      <h2 className={pageSectionHeading}>{title}</h2>
      <div className={`${card} flex flex-col gap-2 text-sm text-zinc-300 leading-relaxed bg-linear-to-br ${tint} via-transparent to-transparent`}>
        {children}
      </div>
    </Reveal>
  )
}
