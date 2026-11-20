// Whether deleting something asks first, as chosen with "Remember my choice" in the delete
// dialog or in Settings. Saved on this device. Storage can be blocked, like in some private
// windows: then it always asks, the safe default.
const KEY = 'askBeforeDeleting'

export function asksBeforeDeleting() {
  try {
    return localStorage.getItem(KEY) !== 'false'
  } catch {
    return true
  }
}

export function setAsksBeforeDeleting(ask: boolean) {
  try {
    if (ask) localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, 'false')
  } catch {
    // Not saved, so it keeps asking
  }
}
