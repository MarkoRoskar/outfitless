import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../lib/axios'
import { authSubmitButton, inlineLink, inputClass, labelClass, pageTitle } from '../lib/styles'
import PasswordInput from '../components/PasswordInput'
import Navbar from '../components/Navbar'
import PageBackdrop from '../components/PageBackdrop'
import Reveal from '../components/Reveal'
import { isAxiosError } from 'axios'
import { useFormErrors } from '../lib/useFormErrors'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const fields = useFormErrors()

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      fields.fail('confirm', "This doesn't match the password above. Type the same password twice.")
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
          // Under the password, since that's what to change
          fields.fail('password', passwordErrors?.[0] || 'Invalid password format.')
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
        <Reveal onLoad className="text-center flex flex-col gap-3">
          <h1 className={pageTitle}>Invalid link</h1>
          <p className="text-sm text-zinc-400">This reset link is invalid or has expired.</p>
          <Link to="/forgot-password" className="text-sm font-medium text-zinc-50 hover:text-accent transition-colors duration-200">
            Request a new one
          </Link>
        </Reveal>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col bg-surface text-zinc-50">

      <Navbar />
      <PageBackdrop />

      <main className="relative flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm flex flex-col gap-6">

          {/* The heading, the form and the link come in one after another, like on Log in */}
          <Reveal onLoad className="flex flex-col gap-1.5">
            <h1 className={pageTitle}>Reset password</h1>
            <p className="text-sm text-zinc-400">Enter your new password below.</p>
          </Reveal>

          <Reveal onLoad variant="pop" delay={100}>
            <div className="card-fade bg-zinc-900/55 ring-1 ring-inset ring-white/4 rounded-3xl p-6 flex flex-col gap-4">
              <form {...fields.form} onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>New password</label>
                  <PasswordInput
                    name="password"
                    what="a new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    className={inputClass}
                  />
                  {fields.error('password')}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>Confirm password</label>
                  <PasswordInput
                    name="confirm"
                    what="the new password again"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    required
                    className={inputClass}
                  />
                  {fields.error('confirm')}
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
          </Reveal>

          <Reveal onLoad delay={200}>
            <p className="text-center text-sm text-zinc-400">
              Remember your password?{' '}
              <Link to="/login" className={inlineLink}>Log in</Link>
            </p>
          </Reveal>

        </div>
      </main>
    </div>
  )
}
