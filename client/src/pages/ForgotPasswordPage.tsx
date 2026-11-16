import { useState } from 'react'
import { Link } from 'react-router-dom'
import { isAxiosError } from 'axios'
import api from '../lib/axios'
import { authSubmitButton, inputClass, labelClass, pageTitle } from '../lib/styles'
import Navbar from '../components/Navbar'
import PageBackdrop from '../components/PageBackdrop'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setDone(true)
    } catch (err) {
      setError(
        isAxiosError(err) && err.response?.status === 429
          ? 'Too many attempts. Please try again later.'
          : 'Could not send the reset link. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col bg-surface text-zinc-50">

      <Navbar right={<Link to="/login" className="text-sm font-medium text-zinc-400 hover:text-zinc-50 transition-colors duration-200">Log in</Link>} />
      <PageBackdrop />

      <main className="relative flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm flex flex-col gap-6">

          {done ? (
            <>
              <div className="flex flex-col gap-1.5">
                <h1 className={pageTitle}>Check your email</h1>
                <p className="text-sm text-zinc-400">
                  If an account exists for <span className="font-medium text-zinc-50">{email}</span>, we sent a reset link. Check your inbox.
                </p>
              </div>
              <p className="text-center text-sm text-zinc-400">
                Back to{' '}
                <Link to="/login" className="font-medium text-zinc-50 hover:text-accent transition-colors duration-200">
                  Log in
                </Link>
              </p>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <h1 className={pageTitle}>Forgot password?</h1>
                <p className="text-sm text-zinc-400">Enter your email and we'll send you a reset link.</p>
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

                    {error && (
                      <p role="alert" className="text-xs text-red-500">{error}</p>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className={authSubmitButton}
                    >
                      {loading ? 'Sending…' : 'Send reset link'}
                    </button>
                  </form>
                </div>
              </div>

              <p className="text-center text-sm text-zinc-400">
                Remember your password?{' '}
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
