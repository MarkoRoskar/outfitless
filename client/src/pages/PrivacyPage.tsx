import type { ReactNode } from 'react'
import { card, inlineLink, mainPageTitle, pageSectionHeading } from '../lib/styles'
import Navbar from '../components/Navbar'
import PageBackdrop from '../components/PageBackdrop'
import Reveal from '../components/Reveal'

const CONTACT = 'outfiless.app@gmail.com'

// What outFITless stores and why, in plain words. Google asks for this page's address before the
// app may send email through the Gmail API, and it's open to everyone, signed in or not.
export default function PrivacyPage() {
  return (
    <div className="min-h-dvh flex flex-col bg-surface text-zinc-50">
      <Navbar />
      <PageBackdrop />

      <main className="relative flex flex-col flex-1 max-w-3xl mx-auto w-full px-6 sm:px-10 pt-8 pb-16 sm:pt-16 gap-6">
        {/* The title comes in as the page opens; each section as it scrolls into view */}
        <Reveal onLoad className="flex flex-col gap-6">
          <h1 className={mainPageTitle}>Privacy</h1>
          <p className="text-sm text-zinc-400">Last updated 17 November 2026</p>
        </Reveal>

        <Section title="What we store">
          <p>Your email address and your password, which is stored scrambled (hashed) so nobody can read it.</p>
          <p>What you create in the app: exercises, workouts, routines and the workouts you log, with their sets, reps and weights.</p>
        </Section>

        <Section title="What it's used for">
          <p>Only to run the app for you: to sign you in, show your training and plan your next targets.</p>
          <p>We don't show ads, don't track you and don't sell or share your data with anyone.</p>
        </Section>

        <Section title="Emails">
          <p>
            We email you only to verify your address and to reset your password when you ask. They're sent
            from {CONTACT} through Gmail. The app can only send email from that account, never read it.
          </p>
        </Section>

        <Section title="Cookies and your browser">
          <p>One cookie keeps you signed in. Your browser also remembers a few things on your device, like
            whether the rest timer makes a sound and sets you've typed but not saved yet.</p>
        </Section>

        <Section title="Where it's kept">
          <p>The app runs on Render and your data is stored in a MongoDB Atlas database in the EU.</p>
        </Section>

        <Section title="Deleting your data">
          <p>Settings → Delete account removes your account and everything in it right away, for good.</p>
        </Section>

        <Section title="Questions">
          <p>
            Email <a href={`mailto:${CONTACT}`} className={inlineLink}>{CONTACT}</a>.
          </p>
        </Section>
      </main>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Reveal>
      <section className={`${card} flex flex-col gap-2 text-sm text-zinc-300 leading-relaxed`}>
        <h2 className={pageSectionHeading}>{title}</h2>
        {children}
      </section>
    </Reveal>
  )
}
