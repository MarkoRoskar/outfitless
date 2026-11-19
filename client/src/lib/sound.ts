let audioContext: AudioContext | null = null

// Browsers only allow sound after the user has interacted, so call this from a click
export function unlockSound() {
  audioContext ??= new AudioContext()
  audioContext.resume().catch(() => {})
}

// One note of a sound: when it starts (seconds after the sound starts), its pitch, how long it
// rings, the wave's shape and how loud it is next to the sound's other notes. A note can also
// glide to another pitch (glideTo, like a slide whistle), stay at full loudness for a while
// before fading (hold), or be a burst of noise instead of a pitch (noise, like a party popper,
// where freq is the pitch the noise centres on).
interface Tone {
  at: number
  freq: number
  length: number
  wave?: OscillatorType
  gain?: number
  glideTo?: number
  hold?: number
  noise?: boolean
}

// Half a second of white noise, made once, for the noise notes
let noiseBuffer: AudioBuffer | null = null
function getNoise(context: AudioContext) {
  if (!noiseBuffer) {
    noiseBuffer = context.createBuffer(1, context.sampleRate / 2, context.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  return noiseBuffer
}

// The sounds the rest timer can make, all made in code so there's no audio file to load. Each
// one's notes are balanced so they sound about as loud as each other at the same volume.
export const restSounds = {
  beeps: {
    label: 'Beeps',
    tones: [0, 0.25, 0.5].map((at) => ({ at, freq: 880, length: 0.15 })),
  },
  chime: {
    label: 'Chime',
    tones: [
      { at: 0, freq: 659.25, length: 0.6, wave: 'triangle' },
      { at: 0.18, freq: 987.77, length: 1, wave: 'triangle' },
    ],
  },
  bell: {
    label: 'Bell',
    // A bell's overtones aren't whole multiples of its note, which is what makes it ring
    tones: [
      { at: 0, freq: 1046.5, length: 1.8, gain: 0.65 },
      { at: 0, freq: 2888, length: 0.9, gain: 0.25 },
      { at: 0, freq: 5651, length: 0.4, gain: 0.1 },
    ],
  },
  countdown: {
    label: 'Countdown',
    // Two short low notes, then a long high one, like the start of a race
    tones: [
      { at: 0, freq: 440, length: 0.18 },
      { at: 0.45, freq: 440, length: 0.18 },
      { at: 0.9, freq: 880, length: 0.6 },
    ],
  },
  buzzer: {
    label: 'Buzzer',
    // A square wave sounds much louder than a smooth one, so it's turned down
    tones: [0, 0.3, 0.6].map((at) => ({ at, freq: 220, length: 0.2, wave: 'square', gain: 0.3 })),
  },
} satisfies Record<string, { label: string; tones: Tone[] }>

// The sounds for finishing a workout: short and bright, like winning
const C5 = 523.25, E5 = 659.25, G5 = 783.99, C6 = 1046.5, E6 = 1318.5, G6 = 1568
export const finishSounds = {
  celebration: {
    label: 'Celebration',
    // A party popper's pop, a slide whistle going up ("wiii"), then sparkles landing on a bright chord
    tones: [
      { at: 0, freq: 1800, length: 0.12, noise: true, gain: 0.9 },
      { at: 0.06, freq: 520, glideTo: 2100, length: 0.5, hold: 0.38, wave: 'triangle', gain: 0.55 },
      ...[E6, G6, C6 * 2, G6, E6 * 2].map((freq, index) => ({ at: 0.5 + index * 0.06, freq, length: 0.3, gain: 0.3 })),
      ...[C6, E6, G6].map((freq) => ({ at: 0.62, freq, length: 1.3, gain: 0.22 })),
    ],
  },
  coin: {
    label: 'Coin',
    // Two quick high notes, like picking up a coin
    tones: [
      { at: 0, freq: 987.77, length: 0.09, wave: 'square', gain: 0.3 },
      { at: 0.08, freq: E6, length: 0.5, wave: 'square', gain: 0.3 },
    ],
  },
  fanfare: {
    label: 'Fanfare',
    // A trumpet-like call: three quick notes rising, then a long high one with a chord under it
    tones: [
      { at: 0, freq: G5, length: 0.14, wave: 'triangle' },
      { at: 0.13, freq: C6, length: 0.14, wave: 'triangle' },
      { at: 0.26, freq: E6, length: 0.14, wave: 'triangle' },
      { at: 0.42, freq: G6, length: 0.9, wave: 'triangle', gain: 0.8 },
      { at: 0.42, freq: C6, length: 0.9, wave: 'triangle', gain: 0.45 },
      { at: 0.42, freq: E6, length: 0.9, wave: 'triangle', gain: 0.35 },
    ],
  },
  levelUp: {
    label: 'Level up',
    // A fast run up the chord, like a game's level-up
    tones: [C5, E5, G5, C6, E6, G6].map((freq, index) => ({ at: index * 0.07, freq, length: index === 5 ? 0.6 : 0.12, wave: 'square', gain: 0.28 })),
  },
  chord: {
    label: 'Chord',
    // A warm major chord, each note joining a moment after the last, ringing out
    tones: [C5, E5, G5, C6].map((freq, index) => ({ at: index * 0.06, freq, length: 1.6, gain: 0.4 })),
  },
} satisfies Record<string, { label: string; tones: Tone[] }>


// The two sounds that can be set up in Settings, each with its own sounds and saved choices
export type SoundKind = 'rest' | 'finish'
const kinds = {
  rest: { sounds: restSounds as Record<string, { label: string; tones: Tone[] }>, fallback: 'beeps', on: 'restSound', type: 'restSoundType', volume: 'restSoundVolume' },
  finish: { sounds: finishSounds as Record<string, { label: string; tones: Tone[] }>, fallback: 'celebration', on: 'finishSound', type: 'finishSoundType', volume: 'finishSoundVolume' },
}

// The sounds of one kind, as id and label, for Settings
export function soundOptions(kind: SoundKind) {
  return Object.entries(kinds[kind].sounds).map(([id, sound]) => ({ id, label: sound.label }))
}

// Plays one of a kind's sounds at a volume from 0 to 100. Silent until unlockSound has run from a click.
export function playSound(kind: SoundKind, id: string, volume: number) {
  const sound = kinds[kind].sounds[id]
  if (!audioContext || volume <= 0 || !sound) return
  // Loudness is heard on a curve, so the slider squares: half way sounds about half as loud.
  // The default (60) is as loud as the beep has always been.
  const peak = 0.9 * (volume / 100) ** 2

  for (const tone of sound.tones) {
    const start = audioContext.currentTime + tone.at
    const end = start + tone.length
    const gain = audioContext.createGain()
    const level = peak * (tone.gain ?? 1)

    // Starts and fades out smoothly instead of switching on and off, which would click
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.linearRampToValueAtTime(level, start + 0.008)
    if (tone.hold) gain.gain.setValueAtTime(level, start + tone.hold)
    gain.gain.exponentialRampToValueAtTime(0.0001, end)
    gain.connect(audioContext.destination)

    let source: AudioScheduledSourceNode
    if (tone.noise) {
      // Noise through a filter, so it's a pop around freq rather than a hiss
      const noise = audioContext.createBufferSource()
      noise.buffer = getNoise(audioContext)
      const filter = audioContext.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.value = tone.freq
      filter.Q.value = 0.8
      noise.connect(filter)
      filter.connect(gain)
      source = noise
    } else {
      const oscillator = audioContext.createOscillator()
      oscillator.type = tone.wave ?? 'sine'
      oscillator.frequency.setValueAtTime(tone.freq, start)
      if (tone.glideTo) oscillator.frequency.exponentialRampToValueAtTime(tone.glideTo, start + tone.length * 0.85)
      oscillator.connect(gain)
      source = oscillator
    }
    source.start(start)
    source.stop(end + 0.02)
  }
}

// The rest timer's sound, if it's switched on (in Settings or on the timer), as chosen in Settings
export function playRestEndSound() {
  if (isSoundOn('rest')) playSound('rest', getSound('rest'), getVolume('rest'))
}

// The sound for finishing a workout, if it's switched on, as chosen in Settings
export function playFinishSound() {
  if (isSoundOn('finish')) playSound('finish', getSound('finish'), getVolume('finish'))
}

// The homepage's beeps, which stay the default whatever is chosen in Settings
export function playBeeps() {
  playSound('rest', 'beeps', DEFAULT_VOLUME)
}

// The sound settings are saved in this browser, since what suits depends on the device (a phone
// in the gym, headphones on). Storage can be blocked, like in a private window, and then the
// defaults apply: on, the first sound (beeps, celebration), 60%.
export const DEFAULT_VOLUME = 60

function load(key: string) {
  try { return localStorage.getItem(key) } catch { return null }
}

function save(key: string, value: string) {
  try { localStorage.setItem(key, value) } catch { /* not remembered */ }
}

export function isSoundOn(kind: SoundKind) {
  return load(kinds[kind].on) !== 'off'
}

export function setSoundOn(kind: SoundKind, on: boolean) {
  save(kinds[kind].on, on ? 'on' : 'off')
}

export function getSound(kind: SoundKind) {
  const saved = load(kinds[kind].type)
  return saved !== null && saved in kinds[kind].sounds ? saved : kinds[kind].fallback
}

export function setSound(kind: SoundKind, id: string) {
  save(kinds[kind].type, id)
}

export function getVolume(kind: SoundKind) {
  const saved = Number(load(kinds[kind].volume) ?? DEFAULT_VOLUME)
  return Number.isFinite(saved) ? Math.min(Math.max(saved, 0), 100) : DEFAULT_VOLUME
}

export function setVolume(kind: SoundKind, volume: number) {
  save(kinds[kind].volume, String(volume))
}

// The rest timer's on/off, also switched on the timer itself
export const isRestSoundOn = () => isSoundOn('rest')
export const setRestSoundOn = (on: boolean) => setSoundOn('rest', on)
