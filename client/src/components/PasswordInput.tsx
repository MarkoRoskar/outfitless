import { useState } from 'react'
import { EyeIcon, EyeOffIcon } from './icons'

interface Props {
  id?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  autoComplete?: string
  required?: boolean
  className?: string
}

export default function PasswordInput({ id, value, onChange, placeholder = '••••••••', autoComplete, required, className }: Props) {
  const [show, setShow] = useState(false)

  return (
    <div className="relative">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        // Urbanist draws the password dots very small. Verdana's are large, and it's on almost every device.
        className={`w-full pr-10 ${className} ${show ? '' : 'font-[Verdana,system-ui,sans-serif] text-base tracking-[0.12em]'}`}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-300 transition-colors duration-200"
        tabIndex={-1}
      >
        {show ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  )
}
