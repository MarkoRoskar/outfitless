import { useState } from 'react'
import type { ReactNode } from 'react'

// The part of a card that opens when the card is tapped: it grows open and fades in, and
// shrinks and fades out when closed (.expand in index.css). The content stays on the page until
// it has finished closing, so the closing can be seen, and is skipped by keyboard and screen
// readers (inert) while closed.
export default function Expand({ open, children }: { open: boolean; children: ReactNode }) {
  // Whether the content is on the page: from opening until the close has played
  const [shown, setShown] = useState(open)
  if (open && !shown) setShown(true)

  return (
    <div
      className={`expand ${open ? 'is-open' : ''}`}
      inert={!open}
      onTransitionEnd={(e) => {
        if (e.target === e.currentTarget && e.propertyName === 'grid-template-rows' && !open) setShown(false)
      }}
    >
      <div className="min-h-0 overflow-hidden">{shown && children}</div>
    </div>
  )
}
