import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import api, { isUnauthorized } from '../lib/axios'
import { getSound, getVolume, isSoundOn, playSound, setSound, setSoundOn, setVolume, soundOptions, unlockSound } from '../lib/sound'
import type { SoundKind } from '../lib/sound'
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
import Reveal from '../components/Reveal'

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

// One sound's settings, for the rest timer or for finishing a workout: on or off, which sound and
// how loud. Picking a sound plays it, and so does letting go of the volume slider, so the choice
// can be heard straight away. Everything is saved in this browser as it changes. The sound and
// volume stay usable while it's off, so it can be set up before switching it on.
function SoundSettings({ kind, label }: { kind: SoundKind; label: string }) {
  const [on, setOn] = useState(() => isSoundOn(kind))
  const [sound, setChosen] = useState(() => getSound(kind))
  const [volume, setLevel] = useState(() => getVolume(kind))

  // Called from a click or key press, which is when browsers allow sound
  function preview(id: string = sound, level: number = volume) {
    unlockSound()
    playSound(kind, id, level)
  }

  function toggle(next: boolean) {
    setOn(next)
    setSoundOn(kind, next)
  }

  function choose(id: string) {
    setChosen(id)
    setSound(kind, id)
    preview(id)
  }

  function changeVolume(level: number) {
    setLevel(level)
    setVolume(kind, level)
  }

  return (
    <>
      <Checkbox checked={on} onChange={toggle}>{label}</Checkbox>

      <fieldset className="flex flex-col gap-2">
        <legend className={`${labelClass} mb-2`}>Sound</legend>
        <div className="flex flex-wrap gap-1.5">
          {soundOptions(kind).map((option) => (
            // Real radio buttons, hidden, so arrow keys and screen readers work as usual
            <label key={option.id} className="cursor-pointer">
              <input type="radio" name={`${kind}-sound`} value={option.id} checked={sound === option.id} onChange={() => choose(option.id)} className="peer sr-only" />
              <span
                className={`block px-3 py-1.5 rounded-full border text-xs font-medium transition-colors duration-200 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent ${
                  sound === option.id ? 'border-accent bg-accent text-black' : 'border-white/10 text-zinc-300 hover:border-white/25 hover:text-zinc-50'
                }`}
              >
                {option.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label htmlFor={`${kind}-volume`} className={labelClass}>Volume</label>
          <span className="text-xs text-zinc-400 tabular-nums">{volume === 0 ? 'Muted' : `${volume}%`}</span>
        </div>
        <input
          id={`${kind}-volume`}
          type="range"
          min={0}
          max={100}
          step={5}
          value={volume}
          onChange={(e) => changeVolume(Number(e.target.value))}
          onPointerUp={() => preview()}
          onKeyUp={(e) => { if (e.key.startsWith('Arrow') || e.key === 'Home' || e.key === 'End' || e.key.startsWith('Page')) preview() }}
          className="w-full accent-(--color-accent) cursor-pointer"
        />
      </div>
    </>
  )
}

// The title of each sound inside the Sound card, bold and white like a card's title, so the two
// halves are easy to tell apart
const soundTitle = 'text-base font-semibold tracking-tight text-zinc-50'

// One section of the page: a light green heading over a card
// Each comes in after the one above it (delay), as on the other pages. Like the home screen's
// tiles, each card has a tint washing in from its top left (tint): blue for the password, amber
// for the sounds, red for deleting the account.
function Section({ title, delay, tint, children }: { title: string; delay: number; tint: string; children: React.ReactNode }) {
  return (
    <Reveal as="section" delay={delay} className="flex flex-col gap-3">
      <h2 className={pageSectionHeading}>{title}</h2>
      <div className={`${card} flex flex-col gap-3 bg-linear-to-br ${tint} via-transparent to-transparent`}>{children}</div>
    </Reveal>
  )
}

// The logged-in user's account: changing the password, the sounds and deleting the account. The
// email is still loaded, since the password dialog sends its reset link there.
export default function SettingsPage() {
  const { token, logout } = useAuthStore()
  const [account, setAccount] = useState<Account | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  const [dialog, setDialog] = useState<'password' | 'delete' | null>(null)
  // A line under the password section after a change
  const [notice, setNotice] = useState('')

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

  return (
    <div className="min-h-dvh flex flex-col bg-surface text-zinc-50">
      <Navbar />
      <PageBackdrop />

      <main className="relative flex flex-col flex-1 max-w-3xl mx-auto w-full px-6 sm:px-10 pt-8 pb-16 sm:pt-16 gap-8">
        <Reveal onLoad className="flex items-center gap-2 -mb-2">
          <h1 className={mainPageTitle}>Settings</h1>
          <PageHelp {...helpText.settings} />
        </Reveal>

        {status === 'loading' && <Loading>Loading your settings…</Loading>}
        {status === 'error' && (
          <LoadError what="your account" onRetry={() => { setStatus('loading'); setAttempt((a) => a + 1) }} />
        )}

        {status === 'ready' && account && (
          <>
            <Section title="Password" delay={60} tint="from-sky-400/14">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-zinc-400">Change the password you log in with.</p>
                <button onClick={() => { setNotice(''); setDialog('password') }} className={secondaryButton}>Change password</button>
              </div>
              {notice && <p role="status" className="text-xs text-accent-dim">{notice}</p>}
            </Section>

            {/* Both sounds in one card, each under its own title, split by a thin line like the
                sections inside other cards */}
            <Section title="Sound" delay={110} tint="from-amber-400/14">
              <h3 className={soundTitle}>Rest timer</h3>
              <SoundSettings kind="rest" label="Play a sound when the rest is over" />
              <p className="text-xs text-zinc-400">You can also switch it on and off on the timer itself.</p>
              <h3 className={`${soundTitle} mt-2 pt-4 border-t border-white/8`}>Workout complete</h3>
              <SoundSettings kind="finish" label="Play a sound when you finish a workout" />
              <p className="mt-1 text-xs text-zinc-400">Saved on this device.</p>
            </Section>

            <Section title="Delete account" delay={160} tint="from-red-500/14">
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
