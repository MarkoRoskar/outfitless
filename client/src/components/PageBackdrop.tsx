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
      {/* Dark all over. On a phone it's only this: the cards fill nearly the whole width, so a
          fade toward the middle would leave the photo black everywhere you can see it. */}
      <div className="absolute inset-0 bg-black/90 sm:bg-black/70" />
      {/* From tablet width up, darker still in the middle behind the content, so the photo shows
          most at the left and right edges. Each step is "how dark (0 to 1), how far across".
          The darkness grows slowly near the edges and faster near the middle, so the fade feels
          gentle. Move the 20%/35% (and 65%/80%) steps to change where it speeds up. */}
      <div className="absolute inset-0 hidden sm:block bg-[linear-gradient(to_right,rgb(0_0_0/0.5)_0%,rgb(0_0_0/0.6)_20%,rgb(0_0_0/0.8)_35%,rgb(0_0_0/0.9)_50%,rgb(0_0_0/0.8)_65%,rgb(0_0_0/0.6)_80%,rgb(0_0_0/0.5)_100%)]" />
    </div>
  )
}
