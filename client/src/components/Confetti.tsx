import { useEffect, useRef } from 'react'

// A burst of confetti over the whole screen, for finishing a workout. Two cannons at the bottom
// corners fire up and inwards, and the pieces flutter down, spinning and tilting like paper,
// then fade. Drawn on a canvas, so it costs nothing once it's over, and nothing can be clicked on
// it. Left out for anyone who has asked for less motion.

// The app's greens, with white and a little gold, so it reads as a win
const COLORS = ['#AFFA00', '#CFED89', '#FFFFFF', '#FACC15', '#7FD400']
const PER_CANNON = 70
// Seconds until every piece has faded
const DURATION = 3.6
// How hard the air slows the pieces: their speed shrinks by e^-AIR each second
const AIR = Math.log(1 / 0.02)

interface Piece {
  x: number
  y: number
  vx: number
  vy: number
  width: number
  height: number
  color: string
  rotation: number
  spin: number
  // The flutter: the piece turns over around its long side, so it narrows and widens
  tilt: number
  tiltSpeed: number
  // Pieces fire over the first fraction of a second rather than all at once
  delay: number
  // How fast it falls once the air has slowed it, so pieces drift down at different speeds
  fall: number
}

export default function Confetti({ delay = 0 }: { delay?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context || reduced) return

    const width = window.innerWidth
    const height = window.innerHeight
    const ratio = window.devicePixelRatio || 1
    canvas.width = width * ratio
    canvas.height = height * ratio
    context.scale(ratio, ratio)

    // The air slows a piece hard (to 2% of its speed after a second), so each one shoots up fast,
    // stops at its peak about 0.7 s later, then flutters down. The distance a piece travels is
    // its starting speed / AIR, so speeds are set from the screen's size: the highest pieces just
    // reach the top, the lowest stop a little above the middle, and they cross up to half way.
    const random = (min: number, max: number) => min + Math.random() * (max - min)
    const pieces: Piece[] = [0, 1].flatMap((side) =>
      Array.from({ length: PER_CANNON }, () => {
        return {
          x: side === 0 ? -10 : width + 10,
          y: height + 10,
          vx: (side === 0 ? 1 : -1) * random(0.08, 0.5) * width * AIR,
          vy: -random(0.5, 1.05) * height * AIR,
          width: random(6, 11),
          height: random(9, 16),
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          rotation: random(0, Math.PI * 2),
          spin: random(-9, 9),
          tilt: random(0, Math.PI * 2),
          tiltSpeed: random(6, 14),
          delay: random(0, 0.18),
          fall: random(120, 220),
        }
      }),
    )

    let frame = 0
    let start: number | null = null
    let last = 0
    function draw(time: number) {
      start ??= time + delay
      const elapsed = (time - start) / 1000
      const step = Math.min((time - (last || time)) / 1000, 1 / 30)
      last = time
      context!.clearRect(0, 0, width, height)

      for (const piece of pieces) {
        if (elapsed < piece.delay) continue
        // The air takes its speed away, settling into its gentle fall, with a sway as it flutters
        const drag = Math.exp(-AIR * step)
        piece.vx *= drag
        piece.vy = piece.vy * drag + piece.fall * (1 - drag)
        piece.x += (piece.vx + Math.sin(piece.tilt * 0.5) * 30) * step
        piece.y += piece.vy * step
        piece.rotation += piece.spin * step
        piece.tilt += piece.tiltSpeed * step

        // Fades out over the last second
        const fade = Math.min(Math.max((DURATION - elapsed) / 1, 0), 1)
        if (fade === 0 || piece.y > height + 40) continue
        context!.save()
        context!.globalAlpha = fade
        context!.translate(piece.x, piece.y)
        context!.rotate(piece.rotation)
        context!.scale(1, Math.cos(piece.tilt))
        context!.fillStyle = piece.color
        context!.fillRect(-piece.width / 2, -piece.height / 2, piece.width, piece.height)
        context!.restore()
      }

      if (elapsed < DURATION) frame = requestAnimationFrame(draw)
      else context!.clearRect(0, 0, width, height)
    }
    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [delay, reduced])

  if (reduced) return null
  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-50 h-dvh w-screen" />
}
