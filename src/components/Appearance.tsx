import { useId, useRef, useState } from 'react'
import { siteThemes } from '../lib/themes.ts'
import type { SiteTheme } from '../lib/themes.ts'

const track = new URL('../assets/disco.mp3', import.meta.url).href

export function Appearance({ theme, onChange }: { theme: SiteTheme; onChange: (theme: SiteTheme) => void }) {
  const menuId = useId()
  const menu = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
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
    menu.current?.hidePopover()
    trigger.current?.focus({ preventScroll: true })
    if (next === 'disco') {
      play()
    } else {
      const player = audio.current
      player?.pause()
      if (player?.currentTime) player.currentTime = 0
    }
  }

  return (
    <div className="theme-controls">
      <button type="button" className="theme-trigger" ref={trigger} aria-haspopup="dialog"
        popoverTarget={menuId} data-theme={theme}>
        Theme
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="m2.5 4.5 3.5 3.5 3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <audio ref={audio} src={track} preload="none" loop
        onPlaying={() => setPlaying(true)} onPause={() => setPlaying(false)} onError={() => setPlaying(false)}/>
      <div id={menuId} className="theme-picker" ref={menu} popover="auto" role="dialog" aria-label="Site themes">
        {(Object.entries(siteThemes) as [SiteTheme, string][]).map(([value, label]) =>
          <button type="button" key={value} aria-pressed={theme === value} onClick={() => select(value)}>{label}</button>,
        )}
        {theme === 'disco' && <button type="button" className="music-toggle"
          aria-label="Disco music" aria-pressed={playing} onClick={() => {
            if (audio.current?.paused) play()
            else audio.current?.pause()
          }}>
          <span className="music-bars" aria-hidden="true"><i/><i/><i/></span>
          {playing ? 'Pause music' : 'Play music'}
        </button>}
      </div>
    </div>
  )
}
