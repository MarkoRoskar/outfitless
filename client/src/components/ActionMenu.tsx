import { useEffect, useId, useRef, useState } from 'react'
import { MoreIcon } from './icons'

export interface MenuAction {
  label: string
  onSelect: () => void
  // Red, for actions like Delete
  danger?: boolean
}

// A "⋯" button that opens a small menu of actions for one item, like Edit and Delete.
// itemName is used for screen readers, as in "Actions for Push Day".
export default function ActionMenu({ itemName, actions }: { itemName: string; actions: MenuAction[] }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return

    // Moves focus into the menu, so the keyboard can pick an action right away
    menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus()

    // Closes on a click anywhere outside the menu
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
        return
      }
      // Up and down arrows move between the actions
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
      const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])
      const index = items.indexOf(document.activeElement as HTMLButtonElement)
      const step = event.key === 'ArrowDown' ? 1 : -1
      items[(index + step + items.length) % items.length]?.focus()
      event.preventDefault()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  function select(action: MenuAction) {
    setOpen(false)
    action.onSelect()
  }

  return (
    // relative and z-10 keep it above a card's stretched link. While open it rises further,
    // so the menu covers the cards below instead of sliding under them.
    <div ref={rootRef} className={`relative shrink-0 ${open ? 'z-40' : 'z-10'}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={`Actions for ${itemName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className={`h-8 w-8 flex items-center justify-center rounded-lg transition-colors duration-200 ${
          open
            ? 'bg-white/10 text-zinc-50'
            : 'text-zinc-400 hover:bg-white/8 hover:text-zinc-50'
        }`}
      >
        <MoreIcon size={18} />
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={`Actions for ${itemName}`}
          className="popover-in card-fade origin-top-right absolute right-0 top-full mt-1 min-w-36 p-1 rounded-xl border border-white/5 bg-zinc-900/80 backdrop-blur-xl shadow-lg"
        >
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              role="menuitem"
              onClick={() => select(action)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 focus:outline-none ${
                action.danger
                  ? 'text-red-400 hover:bg-red-500/10 focus:bg-red-500/10'
                  : 'text-zinc-200 hover:bg-white/8 focus:bg-white/8'
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
