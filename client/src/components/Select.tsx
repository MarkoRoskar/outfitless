import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { CheckIcon, ChevronDownIcon, SearchIcon } from './icons'

export interface SelectOption {
  value: string
  label: string
  // Small gray text under the label, like an exercise's muscle groups
  hint?: string
}

type SingleProps = {
  multiple?: false
  value: string
  onChange: (value: string) => void
}

// Several options can be ticked. None ticked means "no filter", shown as allLabel, which is also
// the first row of the list and clears the ticks.
type MultipleProps = {
  multiple: true
  value: string[]
  onChange: (value: string[]) => void
  allLabel: string
  // The button's text once more than two are ticked, like "3 groups"
  countLabel: (count: number) => string
}

// A row of the open list. In multiple mode the first row is the "all" row, which has no value.
interface Row {
  value: string | null
  label: string
  hint?: string
}

// A dropdown drawn by the app instead of the browser, so its open list matches the ⋯ menus
// rather than the system's blue highlight. Use it like a <select>: give it the id that its
// <label htmlFor> points to, and the button's look and width through className.
// With multiple, the list stays open while options are ticked and closes on a click outside.
// With searchable, a search box tops the list and filters it by label and hint as you type.
export default function Select(props: (SingleProps | MultipleProps) & {
  id?: string
  options: SelectOption[]
  className?: string
  searchable?: boolean
  searchPlaceholder?: string
  // The button's text while nothing is chosen, like "Add a workout…" for a picker that adds
  placeholder?: string
}) {
  const { id, options, className = '', searchable = false, searchPlaceholder = 'Search', placeholder = 'Choose…' } = props
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  // The highlighted row while the list is open, moved by the arrow keys and the pointer
  const [activeIndex, setActiveIndex] = useState(0)
  // Fixed to the screen rather than placed inside the page, so a dialog's scrolling
  // can't clip it. Worked out from the button's position each time the list opens.
  const [position, setPosition] = useState<CSSProperties>({})
  const buttonRef = useRef<HTMLButtonElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listId = useId()

  // Picking an option gives focus back to the button, and the field styles turn the border green
  // on focus, so it stayed green after every choice. Their focus styles are dropped here: the
  // border is green only while the list is open, and keyboard users get the app's usual focus ring.
  const buttonClass = className.split(/\s+/).filter((name) => !name.includes('focus:')).join(' ')

  const allRows: Row[] = props.multiple ? [{ value: null, label: props.allLabel }, ...options] : options
  const search = query.trim().toLowerCase()
  const rows = search
    ? allRows.filter((row) => row.value !== null && `${row.label} ${row.hint ?? ''}`.toLowerCase().includes(search))
    : allRows
  const ticked = props.multiple ? props.value : [props.value]
  const isSelected = (row: Row) =>
    row.value === null ? ticked.length === 0 : ticked.includes(row.value)

  let buttonText: string
  // Gray while showing the placeholder, like an empty text field
  let showingPlaceholder = false
  if (props.multiple) {
    const labels = options.filter((option) => ticked.includes(option.value)).map((option) => option.label)
    buttonText = labels.length === 0 ? props.allLabel : labels.length <= 2 ? labels.join(', ') : props.countLabel(labels.length)
  } else {
    const chosen = options.find((option) => option.value === props.value)
    buttonText = chosen?.label ?? placeholder
    showingPlaceholder = !chosen
  }

  function openList() {
    if (allRows.length === 0) return
    setQuery('')
    setActiveIndex(Math.max(allRows.findIndex(isSelected), 0))
    setOpen(true)
  }

  function close(focusButton = true) {
    setOpen(false)
    if (focusButton) buttonRef.current?.focus()
  }

  function choose(index: number) {
    const row = rows[index]
    if (!row) return
    if (props.multiple) {
      // Ticking stays in the list, so several can be picked in a row
      const value = row.value
      if (value === null) props.onChange([])
      else props.onChange(ticked.includes(value) ? ticked.filter((v) => v !== value) : [...ticked, value])
      return
    }
    if (row.value !== null && row.value !== props.value) props.onChange(row.value)
    close()
  }

  // Opens below the button, or above it when there isn't room below. Measured again whenever the
  // page scrolls or the window changes size (like a phone's address bar hiding), so the list
  // stays attached to its button.
  useLayoutEffect(() => {
    if (!open) return
    const rowCount = allRows.length + (searchable ? 1 : 0)

    function place() {
      if (!buttonRef.current) return
      const rect = buttonRef.current.getBoundingClientRect()
      const maxHeight = searchable ? 320 : 240
      const below = window.innerHeight - rect.bottom - 8
      const placeAbove = below < Math.min(maxHeight, rowCount * 36 + 8) && rect.top > below
      setPosition({
        left: rect.left,
        width: searchable ? rect.width : undefined,
        minWidth: rect.width,
        maxWidth: window.innerWidth - rect.left - 8,
        maxHeight: Math.min(maxHeight, (placeAbove ? rect.top : below) - 8),
        ...(placeAbove ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
      })
    }

    place()
    // Scrolling inside the list itself doesn't move the button, so it's ignored
    function handleScroll(event: Event) {
      if (!popupRef.current?.contains(event.target as Node)) place()
    }
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', place)
    }
  }, [open, allRows.length, searchable])

  useEffect(() => {
    if (!open) return
    // Typing goes straight into the search box when there is one
    if (searchable) searchRef.current?.focus({ preventScroll: true })
    else listRef.current?.focus({ preventScroll: true })

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (!popupRef.current?.contains(target) && !buttonRef.current?.contains(target)) close(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open, searchable])

  // Keeps the highlighted row in view while moving through a long list
  useEffect(() => {
    if (!open) return
    listRef.current?.children[activeIndex]?.scrollIntoView({ block: 'nearest' })
  }, [open, activeIndex])

  function handleListKeyDown(event: React.KeyboardEvent) {
    const last = rows.length - 1
    switch (event.key) {
      case 'ArrowDown': setActiveIndex((i) => Math.min(i + 1, last)); break
      case 'ArrowUp': setActiveIndex((i) => Math.max(i - 1, 0)); break
      case 'Enter': choose(activeIndex); break
      // Stops here, so Esc inside a dialog closes only the list and not the dialog too
      case 'Escape': event.stopPropagation(); close(); break
      case 'Tab': close(false); return
      default: {
        // In the search box, these keys type and move the cursor as usual
        if (searchable) return
        if (event.key === 'Home') { setActiveIndex(0); break }
        if (event.key === 'End') { setActiveIndex(last); break }
        if (event.key === ' ') { choose(activeIndex); break }
        // Typing a letter jumps to the next row starting with it, like a normal dropdown
        if (event.key.length !== 1) return
        const letter = event.key.toLowerCase()
        const order = rows.map((_, i) => (activeIndex + 1 + i) % rows.length)
        const match = order.find((i) => rows[i].label.toLowerCase().startsWith(letter))
        if (match !== undefined) setActiveIndex(match)
        return
      }
    }
    event.preventDefault()
  }

  return (
    <>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        onClick={() => (open ? close() : openList())}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            openList()
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        className={`h-10 flex items-center justify-between gap-2 text-left ${open ? 'border-accent!' : ''} ${buttonClass}`}
      >
        <span className={`min-w-0 truncate ${showingPlaceholder ? 'text-zinc-400' : ''}`}>{buttonText}</span>
        <ChevronDownIcon size={16} className={`shrink-0 text-zinc-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          ref={popupRef}
          // Grows from the edge next to the button, whichever side it opened on
          style={{
            ...position,
            transformOrigin: position.bottom !== undefined ? 'bottom left' : 'top left',
            '--popover-from': position.bottom !== undefined ? '4px' : '-4px',
          } as CSSProperties}
          // Near black with a faint edge, like the search box and filters it opens from. A little
          // more solid than they are, so the list reads clearly over the cards under it.
          className="popover-in fixed z-50 flex flex-col p-1 rounded-xl border border-white/8 bg-black/85 backdrop-blur-xl shadow-lg"
        >
          {searchable && (
            <div className="relative shrink-0 mb-1">
              <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setActiveIndex(0) }}
                onKeyDown={handleListKeyDown}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                aria-controls={listId}
                aria-activedescendant={rows.length > 0 ? `${listId}-${activeIndex}` : undefined}
                autoComplete="off"
                className="w-full h-9 pl-8 pr-3 rounded-lg bg-white/5 text-sm text-zinc-50 placeholder:text-zinc-500 focus:outline-none"
              />
            </div>
          )}

          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            tabIndex={-1}
            aria-labelledby={id}
            aria-multiselectable={props.multiple || undefined}
            aria-activedescendant={searchable || rows.length === 0 ? undefined : `${listId}-${activeIndex}`}
            onKeyDown={searchable ? undefined : handleListKeyDown}
            className="min-h-0 overflow-y-auto focus:outline-none"
          >
            {rows.length === 0 && (
              <li className="px-3 py-2 text-sm text-zinc-400">No matches</li>
            )}
            {rows.map((row, index) => {
              const selected = isSelected(row)
              return (
                <li
                  key={row.value ?? 'all'}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={selected}
                  onPointerMove={() => setActiveIndex(index)}
                  onClick={() => choose(index)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors duration-150 ${
                    props.multiple ? '' : 'justify-between'
                  } ${index === activeIndex ? 'bg-white/8' : ''} ${
                    selected ? 'font-semibold text-accent' : 'font-medium text-zinc-200'
                  } ${props.multiple && row.value === null && rows.length > 1 ? 'mb-1' : ''}`}
                >
                  {props.multiple && (
                    // A tick box in front, so it's clear several can be picked
                    <span
                      aria-hidden="true"
                      className={`h-4 w-4 shrink-0 flex items-center justify-center rounded border transition-colors duration-150 ${
                        selected ? 'bg-accent border-accent text-black' : 'border-white/25'
                      }`}
                    >
                      {selected && <CheckIcon size={12} />}
                    </span>
                  )}
                  <span className="min-w-0 flex flex-col">
                    <span className="wrap-break-word">{row.label}</span>
                    {row.hint && <span className="text-xs font-normal text-zinc-400 truncate">{row.hint}</span>}
                  </span>
                  {!props.multiple && selected && <CheckIcon size={14} className="shrink-0" />}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </>
  )
}
