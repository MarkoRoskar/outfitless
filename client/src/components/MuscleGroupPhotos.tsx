import { useEffect, useRef, useState } from 'react'
import back from '../assets/muscles/back.webp'
import biceps from '../assets/muscles/biceps.webp'
import chest from '../assets/muscles/chest.webp'
import core from '../assets/muscles/core.webp'
import fullBody from '../assets/muscles/full-body.webp'
import legs from '../assets/muscles/legs.webp'
import other from '../assets/muscles/other.webp'
import shoulders from '../assets/muscles/shoulders.webp'
import triceps from '../assets/muscles/triceps.webp'

// One photo per muscle group, keyed like muscleGroupLabels. All from Unsplash, free to use under
// the Unsplash License: chest Aiden Craver, back Anastase Maragos, legs Alef Morais, shoulders
// and biceps Samuel Girven, triceps Mina Rad, core Akram Huseyn, full body Rodrigo
// Rodrigues, other Russell Moore. Cropped square to 480 px (assets/muscles).
const photos: Record<string, string> = {
  chest, back, legs, shoulders, biceps, triceps, core, full_body: fullBody, other,
}

// How wide each slice is, a little wider than a closed card is tall, so a photo shows as a
// recognizable square rather than a thin band. The strip grows with each group up to its
// widest (--photos-max in index.css), after which the slices share that width.
const SLICE_PX = 104

// How far in from its left edge the strip is still faded out (its mask in index.css). Text
// reaching only that far isn't really on a photo.
const FADE_PX = 40

// Whether any of the card's text runs into the strip, like a long workout's exercise list or a
// long name. Each bit of text is measured as drawn, cut short where its box hides the rest (a
// name ending in "…"), and skipped if it's only for screen readers.
function textOverlaps(card: Element, strip: Element) {
  const box = strip.getBoundingClientRect()
  const left = box.left + FADE_PX
  const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT)
  const range = document.createRange()
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement
    if (!node.textContent?.trim() || !parent || strip.contains(node)) continue
    const clip = parent.getBoundingClientRect()
    if (clip.width <= 1 || clip.height <= 1) continue
    range.selectNodeContents(node)
    for (const rect of range.getClientRects()) {
      const right = Math.min(rect.right, clip.right)
      if (right > left && rect.left < box.right && rect.bottom > box.top && rect.top < box.bottom) return true
    }
  }
  return false
}

// The photos behind the right side of an exercise card: one slanted slice per muscle group, side
// by side and equally wide, fading into the card toward the left so the name stays on plain
// background. Black and white and dark, they light up and get their color back when the card is
// hovered (.muscle-photos in index.css; the card needs the group class). Purely decoration.
// height is how far down the card they reach (the whole card when not given), so an open card's
// note can be left on plain card. right is where they end, in px from the card's right edge: by
// default just before the ⌄ and ⋯ buttons, further in to leave something else beside them clear.
//
// Where the card's text runs into them, they stay black and white even on hover and go a little
// darker, so the text is easy to read (muted in index.css). Checked whenever the card changes size.
export default function MuscleGroupPhotos({ groups, height, right = 84 }: { groups: string[]; height?: number; right?: number }) {
  const shown = groups.filter((group) => photos[group])
  const stripRef = useRef<HTMLDivElement>(null)
  const [muted, setMuted] = useState(false)

  useEffect(() => {
    const strip = stripRef.current
    // The card is the nearest list item, or whatever the photos are laid over
    const card = strip?.closest('li') ?? strip?.parentElement?.parentElement
    if (!strip || !card) return
    const measure = () => setMuted(textOverlaps(card, strip))
    measure()
    let ignore = false
    // The text's width depends on the font, which may still be loading
    document.fonts?.ready.then(() => { if (!ignore) measure() })
    const observer = new ResizeObserver(measure)
    observer.observe(card)
    observer.observe(strip)
    return () => { ignore = true; observer.disconnect() }
  }, [shown.length, height, right])

  if (shown.length === 0) return null
  return (
    <div
      aria-hidden="true"
      // Below the closed card's height they fade out slowly toward their end (the note's line or
      // the card's bottom), so an open card has no hard edge. A closed card is barely touched.
      className="pointer-events-none absolute inset-x-0 top-0 h-full overflow-hidden rounded-2xl mask-[linear-gradient(to_bottom,black_64px,transparent)]"
      style={height === undefined ? undefined : { height }}
    >
      {/* It stops short of the card's ⌄ and ⋯ buttons (two 32 px buttons inside the 16 px padding),
          so they stay on plain card, and ends in the last slice's slanted edge */}
      <div
        ref={stripRef}
        className={`muscle-photos ${muted ? 'is-muted' : ''} absolute inset-y-0 flex`}
        style={{ right, width: `min(${shown.length * SLICE_PX}px, var(--photos-max))` }}
      >
        {shown.map((group) => (
          <div key={group} className="muscle-photo-slice relative flex-1 overflow-hidden">
            {/* Framed a little above the middle, where the bar, the face or the working muscle usually is */}
            <div className="absolute inset-y-0 -inset-x-6 bg-cover bg-[position:center_35%]" style={{ backgroundImage: `url(${photos[group]})` }} />
          </div>
        ))}
      </div>
    </div>
  )
}
