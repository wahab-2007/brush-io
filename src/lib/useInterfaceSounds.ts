import { useEffect } from 'react'
import { playInterfaceSound, prepareSound } from './brushSound.ts'

export function useInterfaceSounds() {
  useEffect(() => {
    const warmUp = () => { void prepareSound() }
    const click = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element && target.closest('.plot button.cell'))) void playInterfaceSound('click')
    }
    document.addEventListener('pointerdown', warmUp, true)
    document.addEventListener('keydown', warmUp, true)
    document.addEventListener('click', click, true)
    return () => {
      document.removeEventListener('pointerdown', warmUp, true)
      document.removeEventListener('keydown', warmUp, true)
      document.removeEventListener('click', click, true)
    }
  }, [])
}
