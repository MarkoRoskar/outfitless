import type { ReactNode } from 'react'
import { LightbulbIcon } from './icons'
import { useReveal } from '../lib/useReveal'

// A helper sentence with a small lightbulb box in front, so it reads as a hint at a glance.
// Put an inlineLink inside for the action, like "Create some exercises".
// It fades in and rises into place when it comes into view, like the rest of the page
// (lib/useReveal.ts), after delay ms.
export default function Hint({ children, className = '', delay = 60 }: { children: ReactNode; className?: string; delay?: number }) {
  const reveal = useReveal({ delay })
  return (
    <div {...reveal} className={`${reveal.className} flex items-start gap-3 ${className}`}>
      <span aria-hidden="true" className="mt-px h-6 w-6 shrink-0 flex items-center justify-center rounded-md bg-accent/15 text-accent">
        <LightbulbIcon size={15} />
      </span>
      {/* About 60 characters per line, so long hints wrap instead of stretching across a wide screen */}
      <p className="min-w-0 max-w-[60ch] pt-0.5 text-sm text-zinc-400">{children}</p>
    </div>
  )
}
