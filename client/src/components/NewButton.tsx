import { PlusIcon } from './icons'

// The "+ New" button that opens a page's create dialog. It sits at the right end of the row
// above the list, next to the search box where there is one. It's made like the search box and
// filters beside it (near black with a faint edge, toolbarField in styles.ts), with the plus and
// the word in fit green, and its edge turns green on hover, so it fits the row and still reads
// as the way to add something.
export default function NewButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 h-10 px-4 inline-flex items-center gap-1.5 rounded-xl border border-white/8 bg-black/45 text-sm font-semibold text-accent hover:bg-black/60 hover:border-accent/50 transition-all duration-200 active:scale-[0.98]"
    >
      <PlusIcon size={16} />
      New
    </button>
  )
}
