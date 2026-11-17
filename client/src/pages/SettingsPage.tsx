import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import api, { isUnauthorized } from '../lib/axios'
import { isRestSoundOn, setRestSoundOn } from '../lib/sound'
import { card, inlineLink, inputClass, labelClass, mainPageTitle, pageSectionHeading, primaryButton, secondaryButton, dangerButton } from '../lib/styles'
import { helpText } from '../lib/helpText'
import { useAuthStore } from '../store/authStore'
import Checkbox from '../components/Checkbox'
import LoadError from '../components/LoadError'
import Modal from '../components/Modal'
import Navbar from '../components/Navbar'
import PageBackdrop from '../components/PageBackdrop'
import PageHelp from '../components/PageHelp'
import PasswordInput from '../components/PasswordInput'
import Loading from '../components/Loading'

interface Account {
  email: string
}

// The server's explanation for a refused change, like a wrong password, or a general message
function errorMessage(err: unknown, fallback: string) {
  if (isAxiosError(err) && err.response && err.response.status < 500 && typeof err.response.data?.message === 'string') {
    return err.response.data.message === 'Validation failed' ? fallback : err.response.data.message
  }
  return fallback
}

// One labeled password field, shared by the dialogs below
function PasswordField({ id, label, value, onChange, autoComplete }: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={labelClass}>{label}</label>
      <PasswordInput id={id} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} required className={inputClass} />
    </div>
  )
}

// Asks for the current password and the new one twice. Other devices get logged out.
// For a forgotten current password there's a link that emails a reset link to the account's address.
function ChangePasswordDialog({ email, onClose, onChanged }: { email: string; onClose: () => void; onChanged: () => void }) {
  const { logout } = useAuthStore()
  const [resetState, setResetState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  async function sendResetLink() {
    setResetState('sending')
    try {
      await api.post('/auth/forgot-password', { email })
      setResetState('sent')
    } catch {
      setResetState('error')
    }
  }
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (next.length < 6) { setError('The new password must be at least 6 characters.'); return }
    if (next !== repeat) { setError("The new passwords don't match."); return }
    setError('')
    setSaving(true)
    try {
      await api.post('/auth/change-password', { currentPassword: current, newPassword: next })
      onChanged()
    } catch (err) {
      if (isUnauthorized(err)) { logout(); return }
      setError(errorMessage(err, 'Could not change the password. Please try again.'))
      setSaving(false)
    }
  }

  return (
    <Modal title="Change password" busy={saving} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <PasswordField id="current-password" label="Current password" value={current} onChange={setCurrent} autoComplete="current-password" />
          {resetState === 'sent' ? (
            <p role="status" className="text-xs text-accent-dim wrap-break-word">
              We sent a reset link to {email}. It expires in 1 hour.
            </p>
          ) : (
            <p className="text-xs text-zinc-400">
              Forgot it?{' '}
              <button type="button" onClick={sendResetLink} disabled={resetState === 'sending'} className={`${inlineLink} disabled:opacity-50`}>
                {resetState === 'sending' ? 'Sending…' : 'Email me a reset link'}
              </button>
              {resetState === 'error' && <span className="text-red-500"> Could not send it. Please try again.</span>}
            </p>
          )}
        </div>
        <PasswordField id="new-password" label="New password" value={next} onChange={setNext} autoComplete="new-password" />
        <PasswordField id="repeat-password" label="New password again" value={repeat} onChange={setRepeat} autoComplete="new-password" />
        <p className="text-xs text-zinc-400">At least 6 characters. Your other devices will be logged out.</p>
        {error && <p role="alert" className="text-xs text-red-500">{error}</p>}
        <div className="flex justify-end gap-2 mt-1">
          <button type="button" onClick={onClose} disabled={saving} className={secondaryButton}>Cancel</button>
          <button type="submit" disabled={saving} className={primaryButton}>{saving ? 'Saving…' : 'Change password'}</button>
        </div>
      </form>
    </Modal>
  )
}

// Deletes the account and everything in it, after the password is typed again
function DeleteAccountDialog({ onClose }: { onClose: () => void }) {
  const { logout } = useAuthStore()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setDeleting(true)
    try {
      await api.delete('/auth/account', { data: { password } })
      logout()
      navigate('/', { replace: true })
    } catch (err) {
      if (isUnauthorized(err)) { logout(); return }
      setError(errorMessage(err, 'Could not delete the account. Please try again.'))
      setDeleting(false)
    }
  }

  return (
    <Modal title="Delete account?" busy={deleting} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-zinc-400">
          Your account and everything in it will be permanently deleted: your exercises, workouts,
          routines and history. This can't be undone.
        </p>
        <PasswordField id="delete-password" label="Type your password to confirm" value={password} onChange={setPassword} autoComplete="current-password" />
        {error && <p role="alert" className="text-xs text-red-500">{error}</p>}
        <div className="flex justify-end gap-2 mt-1">
          <button type="button" onClick={onClose} disabled={deleting} className={secondaryButton}>Cancel</button>
          <button
            type="submit"
            disabled={deleting || password === ''}
            className={dangerButton}
          >
            {deleting ? 'Deleting…' : 'Delete account'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// One section of the page: a light green heading over a card
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className={pageSectionHeading}>{title}</h2>
      <div className={`${card} flex flex-col gap-3`}>{children}</div>
    </section>
  )
}

// The logged-in user's account: changing the password, the rest timer's sound and deleting the account. The
// email is still loaded, since the password dialog sends its reset link there.
export default function SettingsPage() {
  const { token, logout } = useAuthStore()
  const [account, setAccount] = useState<Account | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  const [dialog, setDialog] = useState<'password' | 'delete' | null>(null)
  // A line under the password section after a change
  const [notice, setNotice] = useState('')
  const [soundOn, setSoundOn] = useState(isRestSoundOn)

  useEffect(() => {
    if (!token) return
    let ignore = false
    api.get<Account>('/auth/account')
      .then(({ data }) => {
        if (ignore) return
        setAccount(data)
        setStatus('ready')
      })
      .catch((err) => {
        if (ignore) return
        if (isUnauthorized(err)) logout()
        else setStatus('error')
      })
    return () => { ignore = true }
  }, [token, attempt, logout])

  if (!token) return <Navigate to="/login" replace />

  function toggleSound(on: boolean) {
    setSoundOn(on)
    setRestSoundOn(on)
  }

  return (
    <div className="min-h-dvh flex flex-col bg-surface text-zinc-50">
      <Navbar />
      <PageBackdrop />

      <main className="relative flex flex-col flex-1 max-w-3xl mx-auto w-full px-6 sm:px-10 pt-8 pb-16 sm:pt-16 gap-8">
        <div className="flex items-center gap-2 -mb-2">
          <h1 className={mainPageTitle}>Settings</h1>
          <PageHelp {...helpText.settings} />
        </div>

        {status === 'loading' && <Loading>Loading your settings…</Loading>}
        {status === 'error' && (
          <LoadError what="your account" onRetry={() => { setStatus('loading'); setAttempt((a) => a + 1) }} />
        )}

        {status === 'ready' && account && (
          <>
            <Section title="Password">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-zinc-400">Change the password you log in with.</p>
                <button onClick={() => { setNotice(''); setDialog('password') }} className={secondaryButton}>Change password</button>
              </div>
              {notice && <p role="status" className="text-xs text-accent-dim">{notice}</p>}
            </Section>

            <Section title="Rest timer">
              <Checkbox checked={soundOn} onChange={toggleSound}>Beep when the rest is over</Checkbox>
              <p className="text-xs text-zinc-400">Saved on this device. You can also switch it on the timer itself.</p>
            </Section>

            <Section title="Delete account">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="min-w-0 text-sm text-zinc-400">Permanently delete your account and everything in it.</p>
                <button
                  onClick={() => setDialog('delete')}
                  className="h-10 px-4 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors duration-200"
                >
                  Delete account
                </button>
              </div>
            </Section>
          </>
        )}
      </main>

      {dialog === 'password' && (
        <ChangePasswordDialog
          email={account?.email ?? ''}
          onClose={() => setDialog(null)}
          onChanged={() => {
            setDialog(null)
            setNotice('Password changed. Your other devices have been logged out.')
          }}
        />
      )}
      {dialog === 'delete' && <DeleteAccountDialog onClose={() => setDialog(null)} />}
    </div>
  )
}
