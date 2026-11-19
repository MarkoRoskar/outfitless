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

// How wide the fade-in at the strip's left edge is (.muscle-photos-shown in index.css). With
// less room than that after the text, nothing would show, so no photos are drawn.
const FADE_PX = 32

// A little room between the end of the card's text and where the photos start
const GAP_PX = 8

// How far into the strip, in px from its left edge, the card's text reaches: like a long
// workout's exercise list or a long name. The photos only start after it, so no text ever sits
// on a photo. Each bit of text is measured as drawn, cut short where its box
// hides the rest (a name ending in "…"), and skipped if it's only for screen readers. 0 when no
// text reaches the strip. In the card's own px, the same while the card pops in (scaled by its
// animation) as once it has landed, so the photos don't jump when the animation ends.
function textReach(card: Element, strip: Element) {
  const box = strip.getBoundingClientRect()
  // How much the card is scaled right now, by its pop-in animation (1 once it has landed)
  const scale = strip instanceof HTMLElement && strip.offsetWidth > 0 ? box.width / strip.offsetWidth : 1
  const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT)
  const range = document.createRange()
  let reach = 0
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement
    if (!node.textContent?.trim() || !parent || strip.contains(node)) continue
    const clip = parent.getBoundingClientRect()
    if (clip.width <= 1 || clip.height <= 1) continue
    range.selectNodeContents(node)
    for (const rect of range.getClientRects()) {
      const right = Math.min(rect.right, clip.right, box.right)
      if (right > box.left && rect.left < box.right && rect.bottom > box.top && rect.top < box.bottom) {
        reach = Math.max(reach, (right - box.left) / scale + GAP_PX)
      }
    }
  }
  return Math.round(reach)
}

// The photos behind the right side of an exercise card: one slanted slice per muscle group, side
// by side and equally wide, fading into the card toward the left so the name stays on plain
// background. Black and white and dark, they light up and get their color back when the card is
// hovered (.muscle-photos in index.css; the card needs the group class). Purely decoration.
// height is how far down the card they reach (the whole card when not given), so an open card's
// note can be left on plain card. right is where they end, in px from the card's right edge: by
// default just before the ⌄ and ⋯ buttons, further in to leave something else beside them clear.
//
// Where the card's text runs into their area, they start only after it, already fully faded at
// that point, and every group's photo shares the room that's left, so a long exercise list makes
// them narrower (or leaves no room at all). Checked whenever the card changes size.
export default function MuscleGroupPhotos({ groups, height, right = 84 }: { groups: string[]; height?: number; right?: number }) {
  const shown = groups.filter((group) => photos[group])
  const areaRef = useRef<HTMLDivElement>(null)
  // The area's width and how far into it the text reaches, in px. 0 before the first measure.
  const [room, setRoom] = useState({ width: 0, reach: 0 })

  useEffect(() => {
    const area = areaRef.current
    // The card is the nearest list item, or whatever the photos are laid over
    const card = area?.closest('li') ?? area?.parentElement?.parentElement
    if (!area || !card) return
    const measure = () => {
      // Its layout width, which the pop-in animation's scaling doesn't change
      const width = area.offsetWidth
      const reach = textReach(card, area)
      setRoom((old) => (old.width === width && old.reach === reach ? old : { width, reach }))
    }
    measure()
    let ignore = false
    // The text's width depends on the font, which may still be loading
    document.fonts?.ready.then(() => { if (!ignore) measure() })
    const observer = new ResizeObserver(measure)
    observer.observe(card)
    observer.observe(area)
    return () => { ignore = true; observer.disconnect() }
  }, [shown.length, height, right])

  if (shown.length === 0) return null
  const free = Math.max(room.width - room.reach, 0)
  const fits = free > FADE_PX ? shown : []
  return (
    <div
      aria-hidden="true"
      // They fade out toward their end (the line above an open card's sections, or the card's
      // bottom), over at least the last 20px, so they never stop at a hard edge
      className="pointer-events-none absolute inset-x-0 top-0 h-full overflow-hidden rounded-2xl mask-[linear-gradient(to_bottom,black_min(64px,calc(100%-20px)),transparent)]"
      style={height === undefined ? undefined : { height }}
    >
      {/* The area they may use: it stops short of the card's ⌄ and ⋯ buttons (two 32 px buttons
          inside the 16 px padding), so they stay on plain card. The photos sit at its right end,
          in what's left after the text, and end in the last slice's slanted edge. */}
      <div
        ref={areaRef}
        className="muscle-photos absolute inset-y-0"
        style={{ right, width: `min(${shown.length * SLICE_PX}px, var(--photos-max))` }}
      >
        {fits.length > 0 && (
          <div className="muscle-photos-shown absolute inset-y-0 right-0 flex" style={{ width: Math.min(fits.length * SLICE_PX, free) }}>
            {fits.map((group) => (
              <div key={group} className="muscle-photo-slice relative flex-1 overflow-hidden">
                {/* Framed a little above the middle, where the bar, the face or the working muscle usually is */}
                <div className="absolute inset-y-0 -inset-x-6 bg-cover bg-[position:center_35%]" style={{ backgroundImage: `url(${photos[group]})` }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
