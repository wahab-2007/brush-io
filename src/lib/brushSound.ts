let audio: AudioContext | undefined

export async function playBrushSound() {
  try {
    audio ??= new AudioContext()
    if (audio.state === 'suspended') await audio.resume()
    const start = audio.currentTime
    const tone = audio.createOscillator()
    const volume = audio.createGain()

    tone.type = 'sine'
    tone.frequency.setValueAtTime(470, start)
    tone.frequency.exponentialRampToValueAtTime(160, start + 0.064)
    volume.gain.setValueAtTime(0, start)
    volume.gain.linearRampToValueAtTime(0.075, start + 0.004)
    volume.gain.exponentialRampToValueAtTime(0.001, start + 0.085)

    tone.connect(volume).connect(audio.destination)
    tone.start(start)
    tone.stop(start + 0.09)
  } catch {
    // Sound is optional when audio is unavailable or blocked by the browser.
  }
}
