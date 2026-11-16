import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../lib/axios'
import Navbar from '../components/Navbar'
import PageBackdrop from '../components/PageBackdrop'
import { accentButton, pageTitle } from '../lib/styles'

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(token ? 'loading' : 'error')
  const called = useRef(false)

  useEffect(() => {
    if (!token || called.current) return
    called.current = true

    api.get(`/auth/verify-email?token=${token}`)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'))
  }, [token])

  return (
    <div className="min-h-dvh flex flex-col bg-surface text-zinc-50">

      <Navbar />
      <PageBackdrop />

      <main className="relative flex flex-1 items-center justify-center px-6">
        <div className="w-full max-w-sm flex flex-col gap-4 text-center">

          {status === 'loading' && (
            <p className="text-sm text-zinc-400">Verifying your email…</p>
          )}

          {status === 'success' && (
            <>
              <h1 className={pageTitle}>Email verified</h1>
              <p className="text-sm text-zinc-400">Your account is ready. You can now log in.</p>
              <Link
                to="/login"
                className={`mx-auto w-fit flex items-center ${accentButton}`}
              >
                Log in
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <h1 className={pageTitle}>Invalid link</h1>
              <p className="text-sm text-zinc-400">This verification link is invalid or has already been used.</p>
              <Link
                to="/signup"
                className="text-sm font-medium text-zinc-50 hover:text-accent transition-colors duration-200"
              >
                Back to sign up
              </Link>
            </>
          )}

        </div>
      </main>
    </div>
  )
}
