import { primaryButton } from '../lib/styles'
import { PlusIcon } from './icons'

// The "+ New" button that opens a page's create dialog. It sits at the right end of the row
// above the list, next to the search box where there is one.
export default function NewButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className={`shrink-0 inline-flex items-center gap-1.5 ${primaryButton}`}>
      <PlusIcon size={16} />
      New
    </button>
  )
}
