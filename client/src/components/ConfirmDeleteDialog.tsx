import { useEffect, useRef, useState } from 'react'
import { isAxiosError } from 'axios'
import api, { isUnauthorized } from '../lib/axios'
import { Link } from 'react-router-dom'
import { inlineLink, secondaryButton, dangerButton } from '../lib/styles'
import { ChevronRightIcon } from './icons'
import { useAuthStore } from '../store/authStore'
import Modal from './Modal'
import Checkbox from './Checkbox'
import { asksBeforeDeleting, setAsksBeforeDeleting } from '../lib/deletePrompt'

// Asks for confirmation, then sends DELETE to the given API path.
//
// Ticking "Remember my choice" stops the asking on this device (lib/deletePrompt.ts; Settings
// turns it back on). After that the delete happens straight away, with nothing on screen, and
// the dialog only shows when the delete is blocked, like an exercise a workout still uses, so
// it can say why. rememberable={false} always asks, for losing something there's no getting
// back by mistake, like the sets of a workout in progress.
export default function ConfirmDeleteDialog({ title, message, path, onClose, onDeleted, rememberable = true }: {
  title: string
  message: string
  path: string
  onClose: () => void
  onDeleted: () => void
  rememberable?: boolean
}) {
  const { logout } = useAuthStore()
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)
  // Decided once, as the dialog opens
  const [skipAsking] = useState(() => rememberable && !asksBeforeDeleting())
  const [remember, setRemember] = useState(false)
  // Started once, even when React runs the effect twice while developing
  const started = useRef(false)
  useEffect(() => {
    if (!skipAsking || started.current) return
    started.current = true
    handleDelete()
    // Only as the dialog opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // Workouts or routines that still use the item, each linked so it can be removed there
  const [usedIn, setUsedIn] = useState<{ name: string; to: string }[]>([])

  async function handleDelete() {
    setError('')
    setDeleting(true)
    try {
      await api.delete(path)
      onDeleted()
    } catch (err) {
      // Logging out clears the token, which makes the page redirect to /login
      if (isUnauthorized(err)) {
        logout()
        return
      }
      // A 409 means something still uses this item, so show the server's explanation.
      // For an exercise, the server also lists the workouts that use it, and for a workout the
      // routines. A routine has no page of its own, so its link opens its card on Routines.
      if (isAxiosError(err) && err.response?.status === 409) {
        const data = err.response.data
        type Item = { _id: string; name: string }
        const workouts: Item[] = Array.isArray(data.workouts) ? data.workouts : []
        const routines: Item[] = Array.isArray(data.routines) ? data.routines : []
        setError(data.message)
        setUsedIn([
          ...workouts.map((w) => ({ name: w.name, to: `/workouts/${w._id}` })),
          ...routines.map((r) => ({ name: r.name, to: `/routines?open=${r._id}` })),
        ])
      } else {
        setError('Could not delete. Please try again.')
        setUsedIn([])
      }
      setDeleting(false)
    }
  }

  // Not asking: nothing to show unless the delete was blocked
  if (skipAsking && !error) return null

  return (
    // Nothing to type, so a click outside it can safely close it, like the help pop-ups
    <Modal title={title} busy={deleting} onClose={onClose} closeOnOutsideClick>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-zinc-400 wrap-break-word">{message}</p>

        {error && (
          <div role="alert" className="flex flex-col gap-2">
            <p className="text-xs text-red-500">{error}</p>
            {usedIn.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {usedIn.map((item) => (
                  <li key={item.to}>
                    <Link to={item.to} className={`inline-flex items-center gap-1 text-sm wrap-break-word ${inlineLink}`}>
                      {item.name}
                      <ChevronRightIcon size={14} className="shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Not after a blocked delete without asking: there's nothing to remember then */}
        {rememberable && !skipAsking && (
          <Checkbox checked={remember} onChange={setRemember}>Remember my choice and don't ask again</Checkbox>
        )}

        <div className="flex justify-end gap-2 mt-1">
          <button type="button" onClick={onClose} disabled={deleting} className={secondaryButton}>Cancel</button>
          <button
            type="button"
            onClick={() => {
              if (remember) setAsksBeforeDeleting(false)
              handleDelete()
            }}
            disabled={deleting}
            className={dangerButton}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
