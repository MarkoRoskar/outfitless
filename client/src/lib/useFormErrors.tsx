import { useCallback, useRef, useState } from 'react'
import type { FormEvent } from 'react'

type Field = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

// What to do to fix a field, from the browser's own check of it (required, type="email", min,
// max, step, minLength), in the app's words instead of the browser's bubble. A field can name
// what it wants in data-what ("a name", "a new password"), for "Enter a name.".
function messageFor(field: Field) {
  const v = field.validity
  if (field instanceof HTMLInputElement && field.type === 'number') {
    if (v.badInput) return 'Enter a number.'
    if (v.valueMissing || v.rangeUnderflow || v.rangeOverflow) {
      const { min, max } = field
      if (min !== '' && max !== '') return `Enter a number from ${min} to ${max}.`
      if (min !== '') return `Enter a number of at least ${min}.`
      if (max !== '') return `Enter a number up to ${max}.`
      return 'Enter a number.'
    }
    if (v.stepMismatch) return field.step === '1' || field.step === '' ? 'Use a whole number.' : `Use steps of ${field.step}.`
  }
  if (v.valueMissing) {
    if (field.dataset.what) return `Enter ${field.dataset.what}.`
    if (field.type === 'email') return 'Enter your email address.'
    if (field.type === 'password') return 'Enter your password.'
    return 'Fill this in.'
  }
  if (v.typeMismatch && field.type === 'email') return 'Enter a valid email address, like you@example.com.'
  if (v.tooShort && 'minLength' in field) return `Use at least ${field.minLength} characters.`
  if (v.tooLong && 'maxLength' in field) return `Use at most ${field.maxLength} characters.`
  return field.validationMessage
}

const isField = (el: unknown): el is Field =>
  el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement

// The form's checks shown as red lines under the fields that need fixing, instead of the
// browser's bubbles. Spread form onto the <form>, give each checked field a name, and put
// error(name) right under it. On submit, any field that fails stops the form's own onSubmit,
// shows what to do under it, gets a red border (aria-invalid in index.css) and the first one
// gets the focus. Fixing a field takes its message away as you type.
//
// fail(name, message) does the same for a check the form's onSubmit makes itself, like two
// passwords that don't match, and returns false so it can end the submit: return fail(...).
// A name that isn't a field (like a group of buttons) works too; clear(name) takes it away.
export function useFormErrors() {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const formRef = useRef<HTMLFormElement | null>(null)

  const onSubmitCapture = useCallback((e: FormEvent<HTMLFormElement>) => {
    const form = e.currentTarget
    formRef.current = form
    if (form.checkValidity()) {
      for (const el of Array.from(form.elements)) if (isField(el)) el.setAttribute('aria-invalid', 'false')
      setErrors({})
      return
    }
    // Before the form's own onSubmit, which then doesn't run
    e.preventDefault()
    e.stopPropagation()
    const found: Record<string, string> = {}
    let first: Field | null = null
    for (const el of Array.from(form.elements)) {
      if (!isField(el) || !el.name) continue
      const invalid = !el.validity.valid
      el.setAttribute('aria-invalid', String(invalid))
      if (invalid) {
        found[el.name] = messageFor(el)
        first ??= el
      }
    }
    setErrors(found)
    first?.focus()
  }, [])

  // As a field changes, its message follows: gone once it's right, otherwise what's still wrong
  const onInput = useCallback((e: FormEvent<HTMLFormElement>) => {
    const el = e.target
    if (!isField(el) || !el.name) return
    setErrors((old) => {
      if (!(el.name in old)) return old
      const next = { ...old }
      if (el.validity.valid) {
        delete next[el.name]
        el.setAttribute('aria-invalid', 'false')
      } else {
        next[el.name] = messageFor(el)
      }
      return next
    })
  }, [])

  const fail = useCallback((name: string, message: string) => {
    const el = formRef.current?.elements.namedItem(name)
    if (isField(el)) {
      el.setAttribute('aria-invalid', 'true')
      el.focus()
    }
    setErrors((old) => ({ ...old, [name]: message }))
    return false
  }, [])

  // Takes a message away, for a choice that isn't a field, like buttons to pick from
  const clear = useCallback((name: string) => {
    setErrors((old) => {
      if (!(name in old)) return old
      const next = { ...old }
      delete next[name]
      return next
    })
  }, [])

  const error = (name: string) =>
    errors[name] ? <p role="alert" className="field-error text-xs text-red-500">{errors[name]}</p> : null

  return { form: { noValidate: true, onSubmitCapture, onInput }, error, fail, clear }
}
