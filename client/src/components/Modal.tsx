import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'

// Pop-up shell used by every dialog. It opens when rendered, so a page shows it
// with {open && <Modal ... />} and closes it by no longer rendering it.
// closeOnOutsideClick lets a click on the dark backdrop close it, for dialogs that only show
// something, like a page's help. Dialogs with a form leave it off, so a stray click can't lose
// what was typed.
export default function Modal({ title, busy, onClose, closeOnOutsideClick = false, children }: {
  title: string
  busy: boolean
  onClose: () => void
  closeOnOutsideClick?: boolean
  children: ReactNode
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  // Whether the press started on the backdrop, so selecting text in the dialog and letting go
  // outside it doesn't count as a click outside
  const pressedOutside = useRef(false)

  // The backdrop belongs to the dialog element, so a click there lands on the dialog itself,
  // outside its box. A click inside lands on what's in it, even on its padding's edge.
  function isOutside(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target !== e.currentTarget) return false
    const box = e.currentTarget.getBoundingClientRect()
    return e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom
  }

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
      onPointerDown={(e) => { pressedOutside.current = closeOnOutsideClick && isOutside(e) }}
      onClick={(e) => {
        if (pressedOutside.current && isOutside(e) && !busy) onClose()
        pressedOutside.current = false
      }}
      aria-labelledby={titleId}
      // A step lighter than the cards, with a dark blurred backdrop, so the dialog clearly sits on top of the page.
      // No backdrop-blur on the box itself: it would make the box the reference for position: fixed,
      // so a dropdown inside it (which is fixed to the screen) would open in the wrong place.
      className="modal-pop card-fade m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl border border-white/5 bg-zinc-900/85 p-6 text-zinc-50 shadow-2xl backdrop:bg-black/75 backdrop:backdrop-blur-sm"
    >
      <h2 id={titleId} className="text-lg font-semibold tracking-tight mb-4">{title}</h2>
      {children}
    </dialog>
  )
}
