import { statusPill } from '../lib/styles'

// The small solid green "PR" on a set that beat everything logged for its exercise before
// (heaviest weight, or most reps without weight). Used in History and on the finish screen.
export default function RecordBadge() {
  return (
    <span title="Personal record: your best set ever for this exercise" className={`${statusPill} px-1.5! py-0! text-[10px]! leading-4`}>
      PR
    </span>
  )
}
