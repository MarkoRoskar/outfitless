import type { ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { navLink } from '../lib/styles'
import { useAuthStore } from '../store/authStore'
import { DumbbellIcon, HistoryIcon, HomeIcon, ListIcon, RepeatIcon, SettingsIcon } from './icons'

// The app's main pages. end on Home stops "/" from matching every other page.
const pages = [
  { to: '/', label: 'Home', icon: HomeIcon, end: true },
  { to: '/workouts', label: 'Workouts', icon: DumbbellIcon, end: false },
  { to: '/routines', label: 'Routines', icon: RepeatIcon, end: false },
  { to: '/exercises', label: 'Exercises', icon: ListIcon, end: false },
  { to: '/history', label: 'History', icon: HistoryIcon, end: false },
]

// The current page's link is white, the others gray
const topLink = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'text-sm font-medium text-zinc-50' : navLink

export default function Navbar({ right }: { right?: ReactNode }) {
  const { token, logout } = useAuthStore()
  const navigate = useNavigate()

  return (
    <>
      <nav className="sticky top-0 z-30 flex items-center justify-between px-6 sm:px-10 h-14 border-b border-white/5 bg-surface/20 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="" className="h-9 w-9" />
            <span className="font-brand text-xl font-extrabold">out<span className="text-accent">FIT</span>less</span>
          </Link>
          {/* On phones these links move to the tab bar at the bottom. The logo already leads home. */}
          {token && (
            <div className="hidden md:flex items-center gap-6">
              {pages.slice(1).map((page) => (
                <NavLink key={page.to} to={page.to} className={topLink}>{page.label}</NavLink>
              ))}
            </div>
          )}
        </div>

        {token
          ? (
            <div className="flex items-center gap-4">
              {/* Settings: the account, password, rest timer sound and deleting the account */}
              <NavLink
                to="/settings"
                aria-label="Settings"
                title="Settings"
                className={({ isActive }) => `h-8 w-8 -mx-1 flex items-center justify-center rounded-lg transition-colors duration-200 ${
                  isActive ? 'text-zinc-50' : 'text-zinc-400 hover:text-zinc-50 hover:bg-white/8'
                }`}
              >
                <SettingsIcon size={18} />
              </NavLink>
              <button onClick={() => { logout(); navigate('/') }} className={navLink}>Log out</button>
            </div>
          )
          : right}
      </nav>

      {/* Phone tab bar: fixed to the bottom, where a thumb reaches mid-workout. The data-tab-bar
          attribute lets index.css add matching space at the bottom of the page. */}
      {token && (
        <nav
          data-tab-bar
          aria-label="Main"
          className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-white/5 bg-surface/50 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
        >
          <ul className="grid grid-cols-5">
            {pages.map(({ to, label, icon: PageIcon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-1 pt-2.5 pb-2 text-[11px] font-medium transition-colors duration-200 ${
                      isActive ? 'text-accent' : 'text-zinc-400'
                    }`
                  }
                >
                  <PageIcon size={20} />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </>
  )
}
