import { useLayoutEffect, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

export type PaintDelta = 1 | -1

type Stroke = {
  id: symbol
  pointer: number
  mask: number
  delta: PaintDelta
  started: number
  date?: string
  lastDate: string
  timer?: number
}

export function useCellPaint(
  dates: readonly string[],
  enabled: boolean,
  apply: (date: string, delta: PaintDelta, stroke: symbol) => void,
) {
  const active = useRef<Stroke | undefined>(undefined)
  const applyLatest = useRef(apply)
  useLayoutEffect(() => { applyLatest.current = apply }, [apply])

  function stop() {
    window.clearTimeout(active.current?.timer)
    active.current = undefined
  }

  useLayoutEffect(() => {
    const endPointer = (event: PointerEvent) => {
      if (event.pointerId === active.current?.pointer) stop()
    }
    window.addEventListener('pointerup', endPointer, true)
    window.addEventListener('pointercancel', endPointer, true)
    window.addEventListener('blur', stop)
    return () => {
      stop()
      window.removeEventListener('pointerup', endPointer, true)
      window.removeEventListener('pointercancel', endPointer, true)
      window.removeEventListener('blur', stop)
    }
  }, [dates, enabled])

  function repeat(stroke: Stroke, delay: number) {
    window.clearTimeout(stroke.timer)
    stroke.timer = window.setTimeout(function tick() {
      if (active.current !== stroke || !stroke.date) return
      applyLatest.current(stroke.date, stroke.delta, stroke.id)
      const held = performance.now() - stroke.started
      repeat(stroke, Math.max(45, 190 - held * 0.08))
    }, delay)
  }

  function start(date: string, event: ReactPointerEvent<HTMLButtonElement>) {
    if (!enabled || active.current || event.pointerType === 'touch' || (event.button !== 0 && event.button !== 2)) return
    const stroke: Stroke = {
      id: Symbol(), pointer: event.pointerId, mask: event.button === 2 ? 2 : 1,
      delta: event.button === 2 ? -1 : 1, started: performance.now(), date, lastDate: date,
    }
    active.current = stroke
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    apply(date, stroke.delta, stroke.id)
    repeat(stroke, 300)
  }

  function enter(date: string, event: ReactPointerEvent<HTMLButtonElement>) {
    const stroke = active.current
    if (!stroke || event.pointerId !== stroke.pointer) return
    if (!(event.buttons & stroke.mask)) {
      stop()
      return
    }
    stroke.date = date
    if (stroke.lastDate !== date) {
      stroke.lastDate = date
      apply(date, stroke.delta, stroke.id)
    }
    repeat(stroke, Math.max(45, 300 - (performance.now() - stroke.started) * 0.12))
  }

  function leave(date: string) {
    const stroke = active.current
    if (!stroke || date !== stroke.date) return
    window.clearTimeout(stroke.timer)
    stroke.date = undefined
  }

  return { start, enter, leave }
}
