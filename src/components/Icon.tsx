import type { ReactNode } from 'react'

const paths: Record<string, ReactNode> = {
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 10h18m-13 4h1m3 0h1m3 0h1m-9 3h1m3 0h1"/></>,
  undo: <><path d="M9 14l-5-5 5-5M4 9h10a5 5 0 1 1 0 10h-3"/></>,
  redo: <path d="m15 14 5-5-5-5m5 5H10a5 5 0 1 0 0 10h3"/>,
  reset: <><path d="M4 11a8 8 0 1 1 2 7m-2-12v5h5"/></>,
  download: <><path d="M12 3v12m-4-4 4 4 4-4M5 16v4h14v-4"/></>,
  upload: <><path d="M12 15V3m-4 4 4-4 4 4M5 16v4h14v-4"/></>,
  copy: <><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
  code: <><path d="m8 6-5 6 5 6m8-12 5 6-5 6m-3-14-2 16"/></>,
}

export function Icon({ name }: { name: keyof typeof paths }) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}
