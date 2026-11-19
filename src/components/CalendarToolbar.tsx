import { useId } from 'react'
import type { ReactNode } from 'react'
import { Icon } from './Icon.tsx'

interface CalendarToolbarProps {
  year: number
  canUndo: boolean
  canRedo: boolean
  canClear: boolean
  canDownload: boolean
  onUndo: () => void
  onRedo: () => void
  onClear: () => void
  onDownload: () => void
  palette: ReactNode
  appearance: ReactNode
}

export function CalendarToolbar(props: CalendarToolbarProps) {
  const helpId = useId()
  return <header className="toolbar-wrap">
    <div className="calendar-toolbar" role="group" aria-label="Calendar toolbar">
      <button className="history-button" data-action="undo" aria-label="Undo" title={'Undo in ' + props.year}
        disabled={!props.canUndo} onClick={props.onUndo}><Icon name="undo"/></button>
      <button className="history-button" data-action="redo" aria-label="Redo" title={'Redo in ' + props.year}
        disabled={!props.canRedo} onClick={props.onRedo}><Icon name="redo"/></button>
      <button className="history-button" data-action="clear" aria-label="Clear canvas" title={'Clear ' + props.year}
        disabled={!props.canClear} onClick={props.onClear}><Icon name="close"/></button>
      {props.palette}
      <button className="primary" disabled={!props.canDownload} title={'Download script for ' + props.year}
        onClick={props.onDownload}><Icon name="code"/>Download Script</button>
      <button type="button" className="history-button help-button" aria-label="Help" aria-haspopup="dialog"
        popoverTarget={helpId}>?</button>
      {props.appearance}

      <div id={helpId} className="calendar-help" popover="auto" role="dialog" aria-label="Calendar help">
        <h2>Using the calendar</h2>
        <ul>
          <li>Scroll inside the calendar to browse years. Click a year on the left to make it active.</li>
          <li>Left-click to add one, right-click to subtract one. Hold to repeat or drag across several cells. You can also use the arrow keys and + or −.</li>
          <li>Undo, Redo, Clear, and Download Script apply to the active year. Editing a cell also makes its year active. Try the downloaded script with <code>--dry-run</code> first.</li>
          <li>Choose the chart palette with the color cubes. Your palette and site theme are saved in this browser.</li>
        </ul>
        <a href="https://github.com/wahab-2007/brush-io#tutorial">Read the tutorial</a>
      </div>
    </div>
  </header>
}
