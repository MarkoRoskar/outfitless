import background from '../assets/background-hero.webp'

// The homepage's photo behind the whole screen, darkened so text and the see-through cards
// stay easy to read anywhere on it. It's fixed, so it stays put while the page scrolls over it.
// Put it right after <Navbar />. The page's <main> needs `relative` to be drawn above it.
export default function PageBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 bg-zinc-950 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${background})` }}
    >
      {/* Phones: one top-to-bottom fade instead of the side fade below, because the cards fill
          nearly the whole width. The bottom of the photo (floor and weight plates) is much darker
          than the top, so it's darkened less to show about as much. "How dark (0 to 1), how far
          down": 0.9 down to 40% of the screen, then lighter to 0.75 at the bottom. */}
      <div className="absolute inset-0 sm:hidden bg-[linear-gradient(to_bottom,rgb(0_0_0/0.9)_0%,rgb(0_0_0/0.9)_40%,rgb(0_0_0/0.75)_100%)]" />
      {/* Tablet width and up: dark all over */}
      <div className="absolute inset-0 hidden sm:block bg-black/83" />
      {/* From tablet width up, darker still in the middle behind the content, so the photo shows
          most at the left and right edges. Each step is "how dark (0 to 1), how far across".
          The darkness grows slowly near the edges and faster near the middle, so the fade feels
          gentle. Move the 20%/35% (and 65%/80%) steps to change where it speeds up. */}
      <div className="absolute inset-0 hidden sm:block bg-[linear-gradient(to_right,rgb(0_0_0/0.50)_0%,rgb(0_0_0/0.6)_20%,rgb(0_0_0/0.75)_35%,rgb(0_0_0/0.8)_50%,rgb(0_0_0/0.75)_65%,rgb(0_0_0/0.6)_80%,rgb(0_0_0/0.50)_100%)]" />
    </div>
  )
}
