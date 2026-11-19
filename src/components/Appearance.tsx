import { useRef, useState } from 'react'
import { siteThemes } from '../lib/themes.ts'
import type { SiteTheme } from '../lib/themes.ts'

const track = new URL('../assets/disco.mp3', import.meta.url).href

export function Appearance({ theme, onChange }: { theme: SiteTheme; onChange: (theme: SiteTheme) => void }) {
  const audio = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)

  function play() {
    const player = audio.current
    if (!player) return
    player.volume = 0.55
    void player.play().catch(() => setPlaying(false))
  }

  function select(next: SiteTheme) {
    onChange(next)
    if (next === 'disco') {
      play()
    } else {
      const player = audio.current
      player?.pause()
      if (player?.currentTime) player.currentTime = 0
    }
  }

  return (
    <div className="head-controls">
      <label className="appearance"><span>Site theme</span>
        <select aria-label="Appearance" value={theme} onChange={(event) => select(event.target.value as SiteTheme)}>
          {Object.entries(siteThemes).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select>
      </label>
      <audio ref={audio} src={track} preload="none" loop
        onPlaying={() => setPlaying(true)} onPause={() => setPlaying(false)} onError={() => setPlaying(false)}/>
      {theme === 'disco' && <button type="button" className="music-toggle"
        aria-label="Disco music" aria-pressed={playing} onClick={() => {
          if (audio.current?.paused) play()
          else audio.current?.pause()
        }}>
        <span className="music-bars" aria-hidden="true"><i/><i/><i/></span>
        {playing ? 'Pause music' : 'Play music'}
      </button>}
    </div>
  )
}
