// Tailwind classes shared across pages and components
export const fieldClass = 'card-fade rounded-xl border border-white/6 bg-white/5 px-3 text-sm text-zinc-50 placeholder:text-zinc-600 hover:border-white/25 focus:outline-none focus:border-accent transition-all duration-200'
export const inputClass = `h-10 ${fieldClass}`
// Search boxes, dropdowns and date fields that sit on the page itself, above a list: darker than
// the cards, near black with a faint edge, so they look set into the page and read as controls
// rather than more cards. Fields inside cards and dialogs keep fieldClass.
export const toolbarField = 'rounded-xl border border-white/8 bg-black/45 hover:bg-black/60 hover:border-white/15 px-3 text-sm text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:border-accent transition-all duration-200'
// A field's label: a step bigger and brighter than the small gray hints, so it reads as the title
export const labelClass = 'text-sm font-medium text-zinc-200'
// Create and save actions: green outline with a faint green fill, so they read as green
// without competing with the solid green "start or go" buttons below
export const primaryButton = 'h-10 px-5 rounded-xl border border-accent/50 bg-accent/10 text-accent text-sm font-semibold hover:bg-accent/20 hover:border-accent transition-colors duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed'
export const accentButton = 'h-10 px-5 rounded-xl bg-accent text-black text-sm font-semibold hover:bg-accent-dim transition-colors duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed'
export const authSubmitButton =`w-4/5 mx-auto mt-2 ${accentButton}`
export const secondaryButton ='h-10 px-4 rounded-xl text-sm font-medium text-zinc-400 hover:bg-white/5 hover:text-zinc-50 transition-colors duration-200'
// The final, solid red button of a dialog that deletes something
export const dangerButton = 'h-10 px-5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-500 transition-colors duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed'
// Outlined buttons, like Finish workout and Discard on a workout: they read clearly as
// buttons without the weight of a solid one. The green one is the way forward, the red one destructive.
export const accentSecondaryButton = 'h-10 px-4 rounded-xl border border-accent/40 text-sm font-semibold text-accent hover:bg-accent/10 hover:border-accent/60 transition-colors duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed'
export const dangerSecondaryButton = 'h-10 px-4 rounded-xl border border-red-500/30 text-sm font-medium text-red-400 hover:bg-red-500/10 hover:border-red-500/50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
export const navLink ='text-sm font-medium text-zinc-400 hover:text-zinc-50 transition-colors duration-200'
export const card = 'card-fade p-4 rounded-2xl bg-zinc-900/55 ring-1 ring-inset ring-white/4'
// A link or button inside a sentence of gray helper text, like "Create one in Workouts"
export const inlineLink = 'font-medium text-zinc-50 hover:text-accent transition-colors duration-200'
export const listLink = 'min-w-0 text-sm text-zinc-400 wrap-break-word hover:text-accent transition-colors duration-200'
// Text hierarchy shared by every page: a small green label, the page title, then gray body text
export const eyebrow = 'text-xs font-semibold uppercase tracking-[0.2em] text-accent-dim'
export const pageTitle = 'text-3xl font-semibold tracking-tight leading-[1.1]'
// Title of the main pages (Dashboard, Workouts, Exercises, Routines, History): the label style, larger,
// in the light green, so the bright green is left for each screen's main action
export const mainPageTitle = 'text-2xl font-semibold uppercase tracking-[0.15em] leading-[1.1] text-accent-dim'
export const bodyText = 'text-base text-zinc-400 leading-relaxed max-w-[44ch]'
// Small gray label inside a card, like "Next up"
export const sectionHeading = 'text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400'
// A heading over a whole part of a page, like Exercises and Progress on a workout: the same small
// label in a lighter green than page titles, so it stands out from the gray labels inside cards
export const pageSectionHeading = 'text-xs font-semibold uppercase tracking-[0.2em] text-accent-dim'
export const editLink ='text-sm font-medium text-zinc-400 hover:text-zinc-50 transition-colors duration-200'
// The one label that most needs noticing, the routine being followed (Active): solid green
export const statusPill = 'text-[12px] font-semibold text-black bg-accent px-2.5 py-0.5 rounded-full'
// A quieter label, like Next: the lighter green on a faint green tint, so it stands out from gray
// text without competing with Active or the bright green buttons
export const softPill = 'text-[12px] font-semibold text-accent-dim bg-accent-dim/12 px-2.5 py-0.5 rounded-full'
export const deleteLink = 'text-sm font-medium text-zinc-400 hover:text-red-400 transition-colors duration-200'
