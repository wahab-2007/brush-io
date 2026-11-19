const sounds = {
  click: { high: 470, low: 165, gain: 0.065, duration: 0.09 },
  hover: { high: 610, low: 380, gain: 0.018, duration: 0.055 },
  add: { high: 360, low: 700, gain: 0.06, duration: 0.075 },
  remove: { high: 305, low: 110, gain: 0.06, duration: 0.095 },
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

export async function playInterfaceSound(cue: Cue) {
  if (cue !== 'hover' && audio?.state !== 'running') await prepareSound()
  if (audio?.state !== 'running') return
  const { high, low, gain, duration } = sounds[cue]
  const start = audio.currentTime
  const end = start + duration
  const tone = audio.createOscillator()
  const volume = audio.createGain()

  tone.type = 'sine'
  tone.frequency.setValueAtTime(high, start)
  tone.frequency.exponentialRampToValueAtTime(low, end)
  volume.gain.setValueAtTime(0, start)
  volume.gain.linearRampToValueAtTime(gain, start + 0.009)
  volume.gain.exponentialRampToValueAtTime(0.0001, end)

  tone.connect(volume).connect(audio.destination)
  tone.start(start)
  tone.stop(end)
}
