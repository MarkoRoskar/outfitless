import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import Navbar from '../components/Navbar'
import PageBackdrop from '../components/PageBackdrop'
import WorkoutHistory from '../components/WorkoutHistory'
import { mainPageTitle } from '../lib/styles'
import PageHelp from '../components/PageHelp'
import Reveal from '../components/Reveal'
import { helpText } from '../lib/helpText'
import BackToTop from '../components/BackToTop'

// Lists all of the logged-in user's finished workouts
export default function HistoryPage() {
  const { token } = useAuthStore()

  if (!token) return <Navigate to="/login" replace />

  return (
    <div className="min-h-dvh flex flex-col bg-surface text-zinc-50">

      <Navbar />
      <PageBackdrop />

      <main className="relative flex flex-col flex-1 max-w-3xl mx-auto w-full px-6 sm:px-10 pt-8 pb-16 sm:pt-16 gap-8">
        <Reveal onLoad className="flex items-center gap-2">
          <h1 className={mainPageTitle}>History</h1>
          <PageHelp {...helpText.history} />
        </Reveal>
        <WorkoutHistory />
      </main>
      {/* The list can grow long, so there's a quick way back up */}
      <BackToTop />
    </div>
  )
}
