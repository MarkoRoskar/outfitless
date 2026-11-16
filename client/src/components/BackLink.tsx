import { Link } from 'react-router-dom'
import { ArrowLeftIcon } from './icons'

// The "← Workouts" link above a detail page's title, so every detail page starts the same way
export default function BackLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="self-start inline-flex items-center gap-1.5 text-sm font-medium text-zinc-400 hover:text-zinc-50 transition-colors duration-200"
    >
      <ArrowLeftIcon size={16} />
      {children}
    </Link>
  )
}
