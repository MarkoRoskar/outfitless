import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { authSubmitButton, inputClass, labelClass, navLink, pageTitle } from '../lib/styles'
import { useAuthStore } from '../store/authStore'
import Navbar from '../components/Navbar'
import PageBackdrop from '../components/PageBackdrop'
import PasswordInput from '../components/PasswordInput'
import { ArrowLeftIcon } from '../components/icons'
import Reveal from '../components/Reveal'

export default function LoginPage() {
  const { login, token, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  // Set when a workout in progress sent the user here, so they can go straight back to it
  const returnTo: string | undefined = location.state?.returnTo
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const backLink = <Link to="/" className={`inline-flex items-center gap-1.5 ${navLink}`}><ArrowLeftIcon size={14} />Back</Link>

  if (token) {
    return (
      <div className="min-h-dvh flex flex-col bg-surface text-zinc-50">
        <Navbar right={backLink} />
        <PageBackdrop />
        <main className="relative flex flex-1 items-center justify-center px-6">
          <Reveal onLoad className="text-center flex flex-col gap-3">
            <h1 className={pageTitle}>You're already logged in</h1>
            <p className="text-sm text-zinc-400">Head back to the app or log out.</p>
            <div className="flex items-center justify-center gap-4 mt-1">
              <Link to="/" className="text-sm font-medium text-zinc-50 hover:text-accent transition-colors duration-200">Go home</Link>
              <button onClick={() => { logout(); navigate('/login') }} className={navLink}>Log out</button>
            </div>
          </Reveal>
        </main>
      </div>
    )
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate(returnTo ?? '/', { replace: Boolean(returnTo) })
    } catch (err) {
      setError(
        isAxiosError(err) && err.response?.status === 429
          ? 'Too many attempts. Please try again later.'
          : 'Invalid email or password.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col bg-surface text-zinc-50">

      <Navbar right={backLink} />
      <PageBackdrop />

      <main className="relative flex flex-1 items-center justify-center px-6 py-16">
        {/* The heading, the form and the links come in one after another as the page opens */}
        <div className="w-full max-w-sm flex flex-col gap-6">

          <Reveal onLoad className="flex flex-col gap-1.5">
            <h1 className={pageTitle}>Welcome back</h1>
            <p className="text-sm text-zinc-400">
              {returnTo
                ? 'You need to log in again. Your logged sets are saved, and you\'ll go straight back to your workout.'
                : 'Log in to your account to continue.'}
            </p>
          </Reveal>

          <Reveal onLoad variant="pop" delay={100}>
            <div className="card-fade bg-zinc-900/55 ring-1 ring-inset ring-white/4 rounded-3xl p-6 flex flex-col gap-4">

              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>Email</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="off"
                    required
                    className={inputClass}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>Password</label>
                  <PasswordInput
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="off"
                    required
                    className={inputClass}
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-500">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={authSubmitButton}
                >
                  {loading ? 'Logging in…' : 'Log in'}
                </button>

              </form>

            </div>
          </Reveal>

          <Reveal onLoad delay={200} className="flex flex-col gap-2">
            <p className="text-center text-sm text-zinc-400">
              Forgot your password?{' '}
              <Link to="/forgot-password" className="font-medium text-zinc-50 hover:text-accent transition-colors duration-200">
                Reset it
              </Link>
            </p>
            <p className="text-center text-sm text-zinc-400">
              Don't have an account?{' '}
              <Link to="/signup" className="font-medium text-zinc-50 hover:text-accent transition-colors duration-200">
                Sign up
              </Link>
            </p>
          </Reveal>

        </div>
      </main>
    </div>
  )
}
