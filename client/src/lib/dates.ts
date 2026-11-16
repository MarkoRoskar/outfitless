// Dates in the app's language (English) rather than the browser's, so they match the rest of the
// text. en-GB puts the day before the month and leaves out the commas: "Thu 12 Nov".

// "Thu 12 Nov", with the year added for an earlier year: "Mon 29 Dec 2025"
export function formatDay(date: string | Date) {
  const day = new Date(date)
  const sameYear = day.getFullYear() === new Date().getFullYear()
  return day.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}

// "12 Nov", for chart axes where space is tight
export function formatShortDay(date: string | Date) {
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
