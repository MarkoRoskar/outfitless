import { useState } from 'react'
import type { ReactNode } from 'react'
import { secondaryButton } from '../lib/styles'
import { InfoIcon } from './icons'
import Modal from './Modal'

// The small ⓘ next to a page's title. It opens a short "how this page works" pop-up, so the
// explanation is always one tap away without taking room on the page. Each page passes its own
// points; the empty-state hints on the pages stay for when there's nothing there yet.
export default function PageHelp({ title, points }: { title: string; points: ReactNode[] }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`How ${title} works`}
        title={`How ${title} works`}
        className="shrink-0 h-8 w-8 -my-1 flex items-center justify-center rounded-lg text-zinc-400 hover:bg-white/8 hover:text-zinc-50 transition-colors duration-200"
      >
        <InfoIcon size={18} />
      </button>

      {open && (
        <Modal title={title} busy={false} onClose={() => setOpen(false)}>
          <ul className="flex flex-col gap-2.5 text-sm leading-relaxed text-zinc-300">
            {points.map((point, index) => (
              <li key={index} className="flex gap-2.5">
                <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-dim" />
                <span className="min-w-0">{point}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex justify-end">
            <button type="button" onClick={() => setOpen(false)} className={secondaryButton}>Got it</button>
          </div>
        </Modal>
      )}
    </>
  )
}
