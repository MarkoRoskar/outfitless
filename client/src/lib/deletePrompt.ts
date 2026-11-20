// Whether deleting something asks first. "Remember my choice" in the delete dialog stops the
// asking only while you stay on that page: App forgets it whenever the page changes, and a reload
// starts asking again too, since it's only kept in memory. So several things can be deleted in a
// row, without the app staying in "never ask" mode.
let askOnThisPage = true

export function asksBeforeDeleting() {
  return askOnThisPage
}

export function stopAskingOnThisPage() {
  askOnThisPage = false
}

export function forgetDeleteChoice() {
  askOnThisPage = true
}

// An earlier version kept the choice for good on this device; that saved choice no longer applies
try {
  localStorage.removeItem('askBeforeDeleting')
} catch {
  // Storage blocked, so there's nothing saved either
}
