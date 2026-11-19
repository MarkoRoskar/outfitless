import { useCallback, useEffect, useRef, useState } from 'react'
import type { AnimationEvent, CSSProperties } from 'react'

export interface RevealOptions {
  delay?: number
  variant?: 'up' | 'pop' | 'none'
  onLoad?: boolean
}

// Fades an element in and lifts it into place the first time it scrolls into view (the styles
// are .reveal in index.css). delay staggers neighbors, so a list comes in one item at a time.
// "pop" also grows it from slightly smaller. "none" leaves the animating to its children, which
// can style themselves under .is-visible. Once shown it stays, so scrolling back up doesn't
// replay it. onLoad plays it as soon as it's on the page instead, for what's on screen from the
// start, like a page's title.
//
// The hook is for an element that has to stay itself, like a list item that can be dragged:
// spread what it returns onto the element (with ref merged into any ref it has). Otherwise use
// <Reveal> (components/Reveal.tsx), which wraps its children in one.
export function useReveal({ delay = 0, variant = 'up', onLoad = false }: RevealOptions = {}) {
  const elementRef = useRef<HTMLElement | null>(null)
  const [visible, setVisible] = useState(false)
  // Set when the animation has played, which takes it off the element (.reveal-done)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const element = elementRef.current
    if (onLoad) {
      // One frame later, so the hidden state is drawn first and the change animates
      const frame = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(frame)
    }
    // Very old browsers without IntersectionObserver just show everything
    if (!element || typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    // It counts as in view once it's a little way above the bottom of the screen, so it isn't
    // over before anyone sees it
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [onLoad])

  const ref = useCallback((element: HTMLElement | null) => {
    elementRef.current = element
  }, [])

  // Only its own animation ending counts, not one of its children's
  function onAnimationEnd(event: AnimationEvent) {
    if (event.target === event.currentTarget && event.animationName.startsWith('reveal-')) setDone(true)
  }

  return {
    ref,
    'data-variant': variant,
    className: `reveal ${visible ? 'is-visible' : ''} ${done ? 'reveal-done' : ''}`,
    style: { '--reveal-delay': `${delay}ms` } as CSSProperties,
    onAnimationEnd,
  }
}

// The delay for the item at this place in a list, so the items on screen come in one after
// another. It starts over every 10 (a page of the list), and stops growing after a few, so a long
// list doesn't keep anyone waiting.
export function listRevealDelay(index: number) {
  return Math.min(index % 10, 6) * 50
}
