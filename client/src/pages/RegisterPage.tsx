import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import api from '../lib/axios'
import { authSubmitButton, inputClass, labelClass, navLink, pageTitle } from '../lib/styles'
import PasswordInput from '../components/PasswordInput'
import { useAuthStore } from '../store/authStore'
import Navbar from '../components/Navbar'
import PageBackdrop from '../components/PageBackdrop'
import { ArrowLeftIcon } from '../components/icons'

export default function RegisterPage() {
  const { token, logout } = useAuthStore()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  if (token) {
    return (
      <div className="min-h-dvh flex flex-col bg-surface text-zinc-50">
        <Navbar right={<Link to="/" className={`inline-flex items-center gap-1.5 ${navLink}`}><ArrowLeftIcon size={14} />Back</Link>} />
        <PageBackdrop />
        <main className="relative flex flex-1 items-center justify-center px-6">
          <div className="text-center flex flex-col gap-3">
            <h1 className={pageTitle}>You're already logged in</h1>
            <p className="text-sm text-zinc-400">Head back to the app or log out.</p>
            <div className="flex items-center justify-center gap-4 mt-1">
              <Link to="/" className="text-sm font-medium text-zinc-50 hover:text-accent transition-colors duration-200">Go home</Link>
              <button onClick={() => { logout(); navigate('/login') }} className={navLink}>Log out</button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      await api.post('/auth/register', { email, password })
      setDone(true)
    } catch (error) {
      if (isAxiosError(error)) {
              const data = error.response?.data
              console.log(data)
              if (data?.message === 'Validation failed') {
                const passwordErrors = data.errors?.properties?.password?.errors
                setError(passwordErrors?.[0] || 'Invalid password format.')
              } else {
                setError(data?.message || 'Something went wrong.')
              }
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col bg-surface text-zinc-50">

      <Navbar right={<Link to="/login" className={navLink}>Log in</Link>} />
      <PageBackdrop />

      <main className="relative flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm flex flex-col gap-6">

          {done ? (
            <>
              <div className="flex flex-col gap-1.5">
                <h1 className={pageTitle}>Check your email</h1>
                <p className="text-sm text-zinc-400">
                  We sent a verification link to <span className="font-medium text-zinc-50">{email}</span>. Click it to activate your account.
                </p>
              </div>
              <p className="text-center text-sm text-zinc-400">
                Already verified?{' '}
                <Link to="/login" className="font-medium text-zinc-50 hover:text-accent transition-colors duration-200">
                  Log in
                </Link>
              </p>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <h1 className={pageTitle}>Create an account</h1>
                <p className="text-sm text-zinc-400">Start tracking your progress today.</p>
              </div>

              <div>
                <div className="bg-zinc-900/55 ring-1 ring-inset ring-white/4 rounded-3xl p-6 flex flex-col gap-4">
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
                        autoComplete="new-password"
                        required
                        className={inputClass}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className={labelClass}>Confirm password</label>
                      <PasswordInput
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        autoComplete="new-password"
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
                      {loading ? 'Creating account…' : 'Sign up'}
                    </button>
                  </form>
                </div>
              </div>

              <p className="text-center text-sm text-zinc-400">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-zinc-50 hover:text-accent transition-colors duration-200">
                  Log in
                </Link>
              </p>
            </>
          )}

        </div>
      </main>
    </div>
  )
}
