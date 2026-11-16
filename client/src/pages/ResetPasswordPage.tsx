import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../lib/axios'
import { authSubmitButton, inlineLink, inputClass, labelClass, pageTitle } from '../lib/styles'
import PasswordInput from '../components/PasswordInput'
import Navbar from '../components/Navbar'
import PageBackdrop from '../components/PageBackdrop'
import { isAxiosError } from 'axios'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      await api.post('/auth/reset-password', { token, password })
      navigate('/login')
    } catch (error) {
      if (isAxiosError(error)) {
        const data = error.response?.data
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

  if (!token) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-surface text-zinc-50">
        <div className="text-center flex flex-col gap-3">
          <h1 className={pageTitle}>Invalid link</h1>
          <p className="text-sm text-zinc-400">This reset link is invalid or has expired.</p>
          <Link to="/forgot-password" className="text-sm font-medium text-zinc-50 hover:text-accent transition-colors duration-200">
            Request a new one
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col bg-surface text-zinc-50">

      <Navbar />
      <PageBackdrop />

      <main className="relative flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm flex flex-col gap-6">

          <div className="flex flex-col gap-1.5">
            <h1 className={pageTitle}>Reset password</h1>
            <p className="text-sm text-zinc-400">Enter your new password below.</p>
          </div>

          <div>
            <div className="bg-zinc-900/55 ring-1 ring-inset ring-white/4 rounded-3xl p-6 flex flex-col gap-4">
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>New password</label>
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

                {error && <p className="text-xs text-red-500">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className={authSubmitButton}
                >
                  {loading ? 'Resetting…' : 'Reset password'}
                </button>
              </form>
            </div>
          </div>

          <p className="text-center text-sm text-zinc-400">
            Remember your password?{' '}
            <Link to="/login" className={inlineLink}>Log in</Link>
          </p>

        </div>
      </main>
    </div>
  )
}
