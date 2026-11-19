import type { CSSProperties } from 'react'
import { statusPill } from '../lib/styles'

// The small solid green "PR" on a set that beat everything logged for its exercise before
// (heaviest weight, or more reps at that weight; most reps without weight). Used in History and on
// the finish screen.
// On the finish screen it celebrates: it pops in with a green ring after celebrateDelay ms, once
// its card has come in (record-pop in index.css).
export default function RecordBadge({ celebrateDelay }: { celebrateDelay?: number }) {
  const celebrate = celebrateDelay !== undefined
  return (
    <span
      title="Personal record: your best set ever for this exercise"
      className={`${statusPill} px-1.5! py-0! text-[10px]! leading-4 ${celebrate ? 'record-pop' : ''}`}
      style={celebrate ? { '--record-delay': `${celebrateDelay}ms` } as CSSProperties : undefined}
    >
      PR
    </span>
  )
}
