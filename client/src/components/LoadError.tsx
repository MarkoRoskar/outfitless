import { isRateLimitedNow } from '../lib/axios'

// What a page shows when its data didn't load, with a button to try again. If the server just
// said there were too many requests, it says that instead, since trying again right away won't help.
export default function LoadError({ what, onRetry, className = '' }: {
  // What didn't load, like "your workouts"
  what: string
  onRetry: () => void
  className?: string
}) {
  return (
    <div className={`flex flex-col items-start gap-3 ${className}`}>
      <p className="text-sm text-zinc-400">
        {isRateLimitedNow()
          ? 'Too many requests in a short time. Wait a minute, then try again.'
          : `Could not load ${what}.`}
      </p>
      <button
        onClick={onRetry}
        className="text-sm font-medium text-zinc-50 hover:text-accent transition-colors duration-200"
      >
        Try again
      </button>
    </div>
  )
}
