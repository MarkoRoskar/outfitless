import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { forgetDeleteChoice } from './lib/deletePrompt'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import WorkoutsPage from './pages/WorkoutsPage'
import WorkoutDetailPage from './pages/WorkoutDetailPage'
import SessionPage from './pages/SessionPage'
import HistoryPage from './pages/HistoryPage'
import RoutinesPage from './pages/RoutinesPage'
import ExercisesPage from './pages/ExercisesPage'
import NotFoundPage from './pages/NotFoundPage'
import SettingsPage from './pages/SettingsPage'
import PrivacyPage from './pages/PrivacyPage'
import AboutPage from './pages/AboutPage'
import UpdatePrompt from './components/UpdatePrompt'

function App() {
  // "Remember my choice" in a delete dialog only lasts while you stay on that page
  const { pathname } = useLocation()
  useEffect(() => forgetDeleteChoice(), [pathname])

  return (
    <>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/workouts" element={<WorkoutsPage />} />
      <Route path="/workouts/:id" element={<WorkoutDetailPage />} />
      <Route path="/sessions/:id" element={<SessionPage />} />
      <Route path="/history" element={<HistoryPage />} />
      <Route path="/routines" element={<RoutinesPage />} />
      <Route path="/exercises" element={<ExercisesPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/about" element={<AboutPage />} />
      {/* Any other address, like an old or mistyped link */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    {/* Says when a new version is ready, on every page */}
    <UpdatePrompt />
    </>
  )
}

export default App
