import { useEffect, useState } from 'react'
import { ChevronDownIcon } from './icons'

// How far down, in screen heights, before the button shows: a long list's worth, not a short page
const SHOW_AFTER_SCREENS = 1.5

// A round button at the bottom right that takes a long page back to the top, for lists that grow
// long, like Exercises and History. It fades in once the page has been scrolled down a way and out
// again near the top. On phones it sits just above the tab bar. The scroll is smooth unless the
// device asks for less motion.
export default function BackToTop() {
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const update = () => setShown(window.scrollY > window.innerHeight * SHOW_AFTER_SCREENS)
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  function toTop() {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  }

  return (
    <button
      type="button"
      onClick={toTop}
      aria-label="Back to top"
      title="Back to top"
      // Out of the tab order while hidden, so keyboard users don't land on an invisible button
      tabIndex={shown ? 0 : -1}
      aria-hidden={!shown}
      className={`fixed z-20 right-4 md:right-8 bottom-[calc(env(safe-area-inset-bottom)+5rem)] md:bottom-8 h-11 w-11 flex items-center justify-center rounded-full border border-white/10 bg-black/70 backdrop-blur-md text-zinc-200 shadow-lg shadow-black/40 hover:text-accent hover:border-accent/50 transition-all duration-200 ${
        shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
      }`}
    >
      <ChevronDownIcon size={20} className="rotate-180" />
    </button>
  )
}
