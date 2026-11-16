import { useEffect, useRef, useState } from 'react'
import { formatDay } from '../lib/dates'
import { ChevronDownIcon } from './icons'

// A date field drawn by the app, so it's in English like the rest of it, whatever the browser's
// language. The value is a day as "2026-11-16", or '' for none. It opens a month calendar under
// the button, styled like the dropdowns: weeks start on Monday, days after max can't be picked,
// and Clear empties it.

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

// "2026-11-16" for a local date, and back
function toKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
function fromKey(key: string) {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export default function DatePicker({ id, value, onChange, max, placeholder = 'Any day', align = 'start', className = '' }: {
  id?: string
  value: string
  onChange: (value: string) => void
  max?: string
  placeholder?: string
  // Which edge the calendar lines up with. 'end' for a field near the right edge of the screen.
  align?: 'start' | 'end'
  className?: string
}) {
  const [open, setOpen] = useState(false)
  // The month on show: the chosen day's, or this month's
  const [month, setMonth] = useState(() => {
    const start = value ? fromKey(value) : new Date()
    return new Date(start.getFullYear(), start.getMonth(), 1)
  })
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Closes on a click outside or Esc, like the other dropdowns
  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  function toggle() {
    if (!open) {
      const start = value ? fromKey(value) : new Date()
      setMonth(new Date(start.getFullYear(), start.getMonth(), 1))
    }
    setOpen((current) => !current)
  }

  function pick(key: string) {
    onChange(key)
    setOpen(false)
    buttonRef.current?.focus()
  }

  // The month's days, with blanks before the 1st so it lands under its weekday (Monday first)
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const leadingBlanks = (month.getDay() + 6) % 7
  const cells: (Date | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1)),
  ]
  const todayKey = toKey(new Date())
  const nextMonth = new Date(month.getFullYear(), month.getMonth() + 1, 1)
  const canGoNext = !max || toKey(nextMonth) <= max
  const monthTitle = month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        id={id}
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`h-10 flex items-center justify-between gap-2 text-left ${open ? 'border-accent!' : ''} ${className}`}
      >
        <span className={`min-w-0 truncate ${value ? '' : 'text-zinc-400'}`}>{value ? formatDay(fromKey(value)) : placeholder}</span>
        <ChevronDownIcon size={16} className={`shrink-0 text-zinc-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose a date"
          className={`absolute ${align === 'end' ? 'right-0' : 'left-0'} top-full mt-1 z-40 w-72 max-w-[calc(100vw-2rem)] p-3 rounded-xl border border-white/5 bg-zinc-900/95 backdrop-blur-xl shadow-lg`}
        >
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
              aria-label="Previous month"
              className="h-8 w-8 flex items-center justify-center rounded-lg text-zinc-400 hover:bg-white/8 hover:text-zinc-50 transition-colors duration-200"
            >
              <ChevronDownIcon size={16} className="rotate-90" />
            </button>
            <span className="text-sm font-semibold" aria-live="polite">{monthTitle}</span>
            <button
              type="button"
              onClick={() => setMonth(nextMonth)}
              disabled={!canGoNext}
              aria-label="Next month"
              className="h-8 w-8 flex items-center justify-center rounded-lg text-zinc-400 hover:bg-white/8 hover:text-zinc-50 transition-colors duration-200 disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronDownIcon size={16} className="-rotate-90" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-center">
            {WEEKDAYS.map((day) => (
              <span key={day} aria-hidden="true" className="py-1 text-[11px] font-medium text-zinc-500">{day}</span>
            ))}
            {cells.map((date, index) => {
              if (!date) return <span key={`blank-${index}`} />
              const key = toKey(date)
              const selected = key === value
              const disabled = !!max && key > max
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => pick(key)}
                  disabled={disabled}
                  aria-pressed={selected}
                  aria-label={formatDay(date)}
                  className={`h-8 rounded-lg text-sm tabular-nums transition-colors duration-150 disabled:opacity-25 disabled:pointer-events-none ${
                    selected
                      ? 'bg-accent-dim text-black font-semibold'
                      : `hover:bg-white/8 ${key === todayKey ? 'text-accent-dim font-semibold' : 'text-zinc-200'}`
                  }`}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>

          <div className="mt-2 flex justify-between">
            <button
              type="button"
              onClick={() => pick('')}
              className="h-8 px-2 rounded-lg text-xs font-medium text-zinc-400 hover:bg-white/5 hover:text-zinc-50 transition-colors duration-200"
            >
              Clear
            </button>
            {(!max || todayKey <= max) && (
              <button
                type="button"
                onClick={() => pick(todayKey)}
                className="h-8 px-2 rounded-lg text-xs font-medium text-accent-dim hover:bg-white/5 transition-colors duration-200"
              >
                Today
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
