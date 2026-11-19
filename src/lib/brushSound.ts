const sounds = {
  click: { high: 470, low: 165, gain: 0.065, duration: 0.09 },
  hover: { high: 610, low: 380, gain: 0.018, duration: 0.055 },
  slide: { high: 510, low: 290, gain: 0.024, duration: 0.06 },
} as const

type Cue = keyof typeof sounds
let audio: AudioContext | undefined

export async function prepareSound() {
  try {
    audio ??= new AudioContext()
    if (audio.state === 'suspended') await audio.resume()
  } catch {
    // Browsers may block audio until the user interacts with the page.
  }
}

export async function playInterfaceSound(cue: Cue, pitch = 1) {
  if (cue !== 'hover' && audio?.state !== 'running') await prepareSound()
  if (audio?.state !== 'running') return
  const { high, low, gain, duration } = sounds[cue]
  const start = audio.currentTime
  const end = start + duration
  const tone = audio.createOscillator()
  const volume = audio.createGain()

  tone.type = 'sine'
  tone.frequency.setValueAtTime(high * pitch, start)
  tone.frequency.exponentialRampToValueAtTime(low * pitch, end)
  volume.gain.setValueAtTime(0, start)
  volume.gain.linearRampToValueAtTime(gain, start + 0.009)
  volume.gain.exponentialRampToValueAtTime(0.0001, end)

  tone.connect(volume).connect(audio.destination)
  tone.start(start)
  tone.stop(end)
}
