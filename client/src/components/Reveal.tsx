import type { ReactNode } from 'react'
import { useReveal } from '../lib/useReveal'
import type { RevealOptions } from '../lib/useReveal'

// Wraps its children in an element that fades in and rises into place (see lib/useReveal.ts)
export default function Reveal({ as: Tag = 'div', className = '', children, ...options }: RevealOptions & {
  as?: 'div' | 'li' | 'span' | 'section'
  className?: string
  children: ReactNode
}) {
  const reveal = useReveal(options)
  return (
    <Tag {...reveal} className={`${reveal.className} ${className}`}>
      {children}
    </Tag>
  )
}
