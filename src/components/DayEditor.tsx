import { useLayoutEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { formatDate, validCount } from '../lib/calendar.ts'
import type { Selection } from './Graph.tsx'
import { Icon } from './Icon.tsx'

interface Props {
  selection: Selection
  count: number
  onUpdate: (count: number) => void
  onClose: (focus: boolean) => void
}

export function DayEditor({ selection, count, onUpdate, onClose }: Props) {
  const [draft, setDraft] = useState(String(count))
  const form = useRef<HTMLFormElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const value = /^\d+$/.test(draft) ? Number(draft) : NaN

  useLayoutEffect(() => {
    const panel = form.current
    if (!panel) return
    function align() {
      if (!panel) return
      const rect = selection.anchor.getBoundingClientRect()
      const panelHeight = panel.offsetHeight
      const left = Math.min(window.innerWidth - panel.offsetWidth - 10, Math.max(10, rect.left + rect.width / 2 - panel.offsetWidth / 2))
      const top = rect.bottom + panelHeight + 10 < window.innerHeight ? rect.bottom + 8 : rect.top - panelHeight - 8
      panel.style.left = Math.max(10, left) + 'px'
      panel.style.top = Math.max(10, top) + 'px'
    }
    align()
    input.current?.focus()
    input.current?.select()
    window.addEventListener('resize', align)
    window.addEventListener('scroll', align, true)
    return () => {
      window.removeEventListener('resize', align)
      window.removeEventListener('scroll', align, true)
    }
  }, [selection])

  useLayoutEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !form.current?.contains(event.target) &&
          !selection.anchor.contains(event.target)) onClose(false)
    }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [selection.anchor, onClose])

  function step(by: number) {
    const next = Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, (validCount(value) ? value : count) + by))
    setDraft(String(next))
    onUpdate(next)
  }

  function apply(event: FormEvent) {
    event.preventDefault()
    if (validCount(value)) {
      onUpdate(value)
      onClose(true)
    }
  }

  return createPortal(
    <form className="day-editor" role="dialog" aria-labelledby="edit-date" ref={form} onSubmit={apply}
      onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); onClose(true) } }}>
      <div className="day-title">
        <strong id="edit-date">{formatDate(selection.date)}</strong>
        <button type="button" className="icon-button" aria-label="Close editor" onClick={() => onClose(true)}><Icon name="close"/></button>
      </div>
      <label htmlFor="day-count">Planned commits</label>
      <div className="stepper">
        <button type="button" aria-label="Remove one commit" onClick={() => step(-1)}>−</button>
        <input ref={input} id="day-count" inputMode="numeric" pattern="[0-9]+" value={draft}
          onChange={(event) => setDraft(event.target.value)} aria-invalid={!validCount(value)}/>
        <button type="button" aria-label="Add one commit" onClick={() => step(1)}>+</button>
      </div>
      <div className="day-actions">
        <button type="button" onClick={() => { setDraft('0'); onUpdate(0) }}>Reset</button>
        <button className="primary" disabled={!validCount(value)}>Apply</button>
      </div>
    </form>,
    document.body,
  )
}
