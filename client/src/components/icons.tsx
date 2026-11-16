import type { ReactNode } from 'react'

// Every icon in the app comes from here, so they all share one look: a 24×24 grid,
// rounded 2px lines and the current text color. size sets the width and height in pixels.
type IconProps = { size?: number; className?: string }

function Icon({ size = 16, className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  )
}

export const ArrowLeftIcon = (props: IconProps) => (
  <Icon {...props}><path d="M19 12H5M11 6l-6 6 6 6" /></Icon>
)

export const ArrowRightIcon = (props: IconProps) => (
  <Icon {...props}><path d="M5 12h14M13 6l6 6-6 6" /></Icon>
)

// Three dots for a "more actions" menu. Filled circles, since outlined dots vanish at this size.
export const MoreIcon = ({ size = 16, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
    <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
  </svg>
)

export const SearchIcon = (props: IconProps) => (
  <Icon {...props}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></Icon>
)

export const PlusIcon = (props: IconProps) => (
  <Icon {...props}><path d="M12 5v14M5 12h14" /></Icon>
)

// Marks that an item has a note
export const NoteIcon = (props: IconProps) => (
  <Icon {...props}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4" /></Icon>
)

// Opens the Settings page
export const SettingsIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </Icon>
)

// The rest timer's beep, on and off
export const SoundOnIcon = (props: IconProps) => (
  <Icon {...props}><path d="M11 5L6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /></Icon>
)
export const SoundOffIcon = (props: IconProps) => (
  <Icon {...props}><path d="M11 5L6 9H3v6h3l5 4zM22 9l-6 6M16 9l6 6" /></Icon>
)

// Opens a page's "how this page works" help
export const InfoIcon = (props: IconProps) => (
  <Icon {...props}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></Icon>
)

// Marks a helper hint
export const LightbulbIcon = (props: IconProps) => (
  <Icon {...props}><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2V17h6v-.3c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z" /></Icon>
)

// Marks a card that opens another page
export const ChevronRightIcon = (props: IconProps) => (
  <Icon {...props}><path d="M9 6l6 6-6 6" /></Icon>
)

// Shows a section can be expanded. Rotate it to show it's open.
export const ChevronDownIcon = (props: IconProps) => (
  <Icon {...props}><path d="M6 9l6 6 6-6" /></Icon>
)

export const CheckIcon = (props: IconProps) => (
  <Icon {...props}><path d="M5 12.5l4.5 4.5L19 7" /></Icon>
)

export const CloseIcon = (props: IconProps) => (
  <Icon {...props}><path d="M6 6l12 12M18 6L6 18" /></Icon>
)

// Show and hide for password fields
export const EyeIcon = (props: IconProps) => (
  <Icon {...props}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></Icon>
)

export const EyeOffIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-10-8-10-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19M2 2l20 20" />
  </Icon>
)

// Navigation icons for the phone tab bar
export const HomeIcon = (props: IconProps) => (
  <Icon {...props}><path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></Icon>
)

export const DumbbellIcon = (props: IconProps) => (
  <Icon {...props}><path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12" /></Icon>
)

// Routines rotate through their workouts, so a repeat arrow
export const RepeatIcon = (props: IconProps) => (
  <Icon {...props}><path d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3" /></Icon>
)

export const ListIcon = (props: IconProps) => (
  <Icon {...props}><path d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01" /></Icon>
)

export const HistoryIcon = (props: IconProps) => (
  <Icon {...props}><path d="M3 12a9 9 0 1 0 2.6-6.4L3 8M3 3v5h5M12 7v5l3 2" /></Icon>
)

// Filled, unlike the others, because a play triangle reads poorly as an outline at small sizes
export const PlayIcon = ({ size = 16, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
    <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
  </svg>
)

export const TrendUpIcon = (props: IconProps) => (
  <Icon {...props}><path d="M3 17l6-6 4 4 8-8M15 7h6v6" /></Icon>
)

export const TrendDownIcon = (props: IconProps) => (
  <Icon {...props}><path d="M3 7l6 6 4-4 8 8M15 17h6v-6" /></Icon>
)

export const TimerIcon =(props: IconProps) => (
  <Icon {...props}><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2 2M9 2h6" /></Icon>
)
