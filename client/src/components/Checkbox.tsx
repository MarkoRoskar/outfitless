import type { ReactNode } from 'react'
import { CheckIcon } from './icons'

// A tick box drawn in the app's style, like the ones in the muscle group filter. The real
// checkbox is hidden but still there, so the keyboard and screen readers work as usual.
export default function Checkbox({ checked, onChange, children }: {
  checked: boolean
  onChange: (checked: boolean) => void
  children: ReactNode
}) {
  return (
    <label className="group self-start flex items-center gap-2.5 cursor-pointer text-sm text-zinc-200">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden="true"
        className={`h-[18px] w-[18px] shrink-0 flex items-center justify-center rounded-[5px] border transition-colors duration-150 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent ${
          checked ? 'bg-accent border-accent text-black' : 'border-white/25 group-hover:border-white/40'
        }`}
      >
        {checked && <CheckIcon size={13} />}
      </span>
      {children}
    </label>
  )
}
