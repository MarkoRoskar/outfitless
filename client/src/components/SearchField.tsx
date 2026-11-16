import { useId } from 'react'
import { toolbarField } from '../lib/styles'
import { SearchIcon } from './icons'

// A search box with a magnifying glass inside. The label is hidden on screen, since the icon and
// placeholder already say what it is, but screen readers still read it out.
// On its own, it stops at a comfortable width. fill lets it take all the space it's given,
// for when it shares a row with other controls.
export default function SearchField({ label, placeholder, value, onChange, fill = false, className = '' }: {
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  fill?: boolean
  className?: string
}) {
  const id = useId()

  return (
    // A fixed height, so a row it sits in can't stretch it and push the icon off-centre
    <div className={`relative h-10 w-full ${fill ? '' : 'sm:max-w-sm'} ${className}`}>
      <label htmlFor={id} className="sr-only">{label}</label>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
        <SearchIcon size={16} />
      </span>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className={`h-10 w-full pl-9 ${toolbarField}`}
      />
    </div>
  )
}
