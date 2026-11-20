import { CloseIcon } from './icons'

// Puts a toolbar's filters (and its search) back to how the page opens, in one tap. Styled like
// the toolbar's dropdowns beside it, and only there while something is changed, so an untouched
// toolbar stays as it was. On phones, where the toolbar is two columns, it takes a row of its
// own but only as wide as its text.
export default function ClearFiltersButton({ shown, onClear }: { shown: boolean; onClear: () => void }) {
  if (!shown) return null
  return (
    <button
      type="button"
      onClick={onClear}
      className="popover-in col-span-2 justify-self-start sm:col-auto shrink-0 h-10 px-3 inline-flex items-center gap-1.5 rounded-xl border border-white/8 bg-black/45 text-sm font-medium text-zinc-300 hover:bg-black/60 hover:border-white/15 hover:text-zinc-50 transition-colors duration-200"
    >
      <CloseIcon size={14} />
      Clear filters
    </button>
  )
}
