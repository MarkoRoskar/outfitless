import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'

// Fades its content in and lifts it into place the first time it scrolls into view (the styles
// are .reveal in index.css). delay staggers neighbors, so a list comes in one item at a time.
// "pop" also grows it from slightly smaller. "none" leaves the animating to its children, which
// can style themselves under .is-visible. Once shown it stays, so scrolling back up doesn't
// replay it. onLoad plays it as soon as the page opens instead, for what's on screen from the
// start, like the homepage's first screen.
export default function Reveal({ as: Tag = 'div', delay = 0, variant = 'up', onLoad = false, className = '', children }: {
  as?: 'div' | 'li' | 'span'
  delay?: number
  variant?: 'up' | 'pop' | 'none'
  onLoad?: boolean
  className?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const element = ref.current
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

  return (
    <Tag
      ref={ref as never}
      data-variant={variant}
      className={`reveal ${visible ? 'is-visible' : ''} ${className}`}
      style={{ '--reveal-delay': `${delay}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  )
}
