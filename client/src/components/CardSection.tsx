import type { ReactNode } from 'react'
import { sectionHeading } from '../lib/styles'

// One labeled part of an open card (exercises, routines, History): space above a thin line, and
// its small gray label right under the line, so each line reads as the start of its section.
export default function CardSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mt-3 pt-1 flex flex-col gap-1.5 border-t border-white/8">
      <p className={sectionHeading}>{label}</p>
      <div className="text-sm leading-relaxed text-zinc-200 wrap-break-word">{children}</div>
    </div>
  )
}
