import type { ComponentProps } from 'react'
import { editLink } from '../lib/styles'

// The grip that starts dragging a row, used with useSortable's attributes and listeners.
// It covers the card's whole left strip, from the edge to where the text starts and from top to
// bottom, so a drag doesn't need to land on the small dots. The negative margins cancel the
// card's p-4 padding and gap-3, so it must be the first child of a card with those.
// off dims it and drops the grab cursor, for when reordering isn't possible right now, like while
// searching. It stays in place so the card doesn't shift, and taps go through it to the card.
export default function DragHandle({ className = '', off = false, ...props }: ComponentProps<'button'> & { off?: boolean }) {
  return (
    <button
      {...props}
      className={`shrink-0 self-stretch -my-4 -ml-4 -mr-3 pl-4 pr-3 py-4 rounded-l-2xl flex items-start ${
        off ? 'pointer-events-none text-zinc-400 opacity-30' : `touch-none cursor-grab active:cursor-grabbing ${editLink}`
      } ${className}`}
    >
      <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor" aria-hidden="true" className="mt-0.5">
        <circle cx="3" cy="3" r="1.5" />
        <circle cx="9" cy="3" r="1.5" />
        <circle cx="3" cy="8" r="1.5" />
        <circle cx="9" cy="8" r="1.5" />
        <circle cx="3" cy="13" r="1.5" />
        <circle cx="9" cy="13" r="1.5" />
      </svg>
    </button>
  )
}
