import { useEffect } from 'react'
import { playInterfaceSound, prepareSound } from './brushSound.ts'

function hoverTarget(target: EventTarget | null) {
  return target instanceof Element ? target.closest('.plot button.cell') : null
}

export function useInterfaceSounds(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return

    let lastHover = -Infinity
    const warmUp = () => { void prepareSound() }
    const click = () => { void playInterfaceSound('click') }
    const hover = (event: PointerEvent) => {
      const control = hoverTarget(event.target)
      if (event.pointerType === 'touch' || !control || control.matches(':disabled') ||
          control.contains(hoverTarget(event.relatedTarget))) return
      const now = performance.now()
      if (now - lastHover < 40) return
      lastHover = now
      void playInterfaceSound('hover')
    }
    const input = (event: Event) => {
      const slider = event.target
      if (!(slider instanceof HTMLInputElement) || slider.type !== 'range') return
      const min = Number(slider.min || '0')
      const max = Number(slider.max || '100')
      const progress = (slider.valueAsNumber - min) / Math.max(1, max - min)
      void playInterfaceSound('slide', 0.85 + 0.3 * progress)
    }

    document.addEventListener('pointerdown', warmUp, true)
    document.addEventListener('keydown', warmUp, true)
    document.addEventListener('click', click, true)
    document.addEventListener('pointerover', hover, true)
    document.addEventListener('input', input, true)
    return () => {
      document.removeEventListener('pointerdown', warmUp, true)
      document.removeEventListener('keydown', warmUp, true)
      document.removeEventListener('click', click, true)
      document.removeEventListener('pointerover', hover, true)
      document.removeEventListener('input', input, true)
    }
  }, [enabled])
}
