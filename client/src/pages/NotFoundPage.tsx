import { Link } from 'react-router-dom'
import { inlineLink, mainPageTitle } from '../lib/styles'
import Hint from '../components/Hint'
import Navbar from '../components/Navbar'
import PageBackdrop from '../components/PageBackdrop'

// Shown for any address the app doesn't know, like an old or mistyped link, instead of a blank
// page. Laid out like the other pages, with the way back to Home.
export default function NotFoundPage() {
  return (
    <div className="min-h-dvh flex flex-col bg-surface text-zinc-50">
      <Navbar />
      <PageBackdrop />

      <main className="relative flex flex-col flex-1 max-w-3xl mx-auto w-full px-6 sm:px-10 pt-8 pb-16 sm:pt-16 gap-6">
        <h1 className={mainPageTitle}>Page not found</h1>
        <Hint>
          This page doesn't exist. The link may be old or mistyped.{' '}
          <Link to="/" className={inlineLink}>Go to Home</Link>.
        </Hint>
      </main>
    </div>
  )
}
