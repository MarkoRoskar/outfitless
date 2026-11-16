import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'

// Pop-up shell used by every dialog. It opens when rendered, so a page shows it
// with {open && <Modal ... />} and closes it by no longer rendering it.
export default function Modal({ title, busy, onClose, children }: {
  title: string
  busy: boolean
  onClose: () => void
  children: ReactNode
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  // Open as a modal: the browser handles Esc and keeps focus inside the dialog
  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      // Don't let Esc close the dialog while a request is running. Otherwise Esc closes it, and the
      // browser then gives focus back to the button that opened it, drawn with the green keyboard
      // outline since a key closed it. That focus is dropped right after, so no outline is left.
      onCancel={(e) => {
        if (busy) {
          e.preventDefault()
          return
        }
        requestAnimationFrame(() => {
          if (document.activeElement instanceof HTMLElement && document.activeElement !== document.body) {
            document.activeElement.blur()
          }
        })
      }}
      aria-labelledby={titleId}
      // A step lighter than the cards, with a dark blurred backdrop, so the dialog clearly sits on top of the page.
      // No backdrop-blur on the box itself: it would make the box the reference for position: fixed,
      // so a dropdown inside it (which is fixed to the screen) would open in the wrong place.
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl border border-white/5 bg-zinc-900/85 p-6 text-zinc-50 shadow-2xl backdrop:bg-black/75 backdrop:backdrop-blur-sm"
    >
      <h2 id={titleId} className="text-lg font-semibold tracking-tight mb-4">{title}</h2>
      {children}
    </dialog>
  )
}
