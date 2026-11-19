import { useEffect } from 'react'
import { playInterfaceSound, prepareSound } from './brushSound.ts'

function hoverTarget(target: EventTarget | null) {
  return target instanceof Element ? target.closest('.plot button.cell') : null
}

export function useInterfaceSounds() {
  useEffect(() => {
    let lastHover = -Infinity
    const warmUp = () => { void prepareSound() }
    const click = (event: MouseEvent) => {
      if (!hoverTarget(event.target)) void playInterfaceSound('click')
    }
    const hover = (event: PointerEvent) => {
      const control = hoverTarget(event.target)
      if (event.pointerType === 'touch' || !control || control.matches(':disabled') ||
          control.contains(hoverTarget(event.relatedTarget))) return
      const now = performance.now()
      if (now - lastHover < 40) return
      lastHover = now
      void playInterfaceSound('hover')
    }
    document.addEventListener('pointerdown', warmUp, true)
    document.addEventListener('keydown', warmUp, true)
    document.addEventListener('click', click, true)
    document.addEventListener('pointerover', hover, true)
    return () => {
      document.removeEventListener('pointerdown', warmUp, true)
      document.removeEventListener('keydown', warmUp, true)
      document.removeEventListener('click', click, true)
      document.removeEventListener('pointerover', hover, true)
    }
  }, [])
}
