import { useId } from 'react'
import type { ReactNode } from 'react'

export function ToolbarPopover({ label, children }: { label: string; children: ReactNode }) {
  const id = useId()
  return <>
    <button type="button" aria-haspopup="dialog" popoverTarget={id}>{label}</button>
    <div id={id} className="toolbar-popover" role="dialog" aria-label={label} popover="auto">
      {children}
    </div>
  </>
}
