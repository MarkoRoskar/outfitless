// Numbers typed into a set but not ticked yet, kept in the browser so a reload or a login doesn't lose them.
// Storage can be full or blocked, and a draft isn't worth an error, so failures are ignored.

interface SetDraft {
  reps: string
  weight: string
}

const prefix = (sessionId: string) => `set-draft:${sessionId}:`
const draftKey = (sessionId: string, exerciseIndex: number, setIndex: number) =>
  `${prefix(sessionId)}${exerciseIndex}:${setIndex}`

export function loadSetDraft(sessionId: string, exerciseIndex: number, setIndex: number): SetDraft | null {
  try {
    const saved = localStorage.getItem(draftKey(sessionId, exerciseIndex, setIndex))
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

export function saveSetDraft(sessionId: string, exerciseIndex: number, setIndex: number, draft: SetDraft) {
  try {
    localStorage.setItem(draftKey(sessionId, exerciseIndex, setIndex), JSON.stringify(draft))
  } catch {
    // The numbers stay on screen, they just won't survive a reload
  }
}

// Called when a session ends, since its drafts are no longer needed
export function clearSetDrafts(sessionId: string) {
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(prefix(sessionId)))
      .forEach((key) => localStorage.removeItem(key))
  } catch {
    // Leftover drafts do no harm, because they're only read for this session
  }
}
