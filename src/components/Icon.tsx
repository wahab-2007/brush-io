import type { ReactNode } from 'react'

const paths: Record<string, ReactNode> = {
  undo: <><path d="M9 14l-5-5 5-5M4 9h10a5 5 0 1 1 0 10h-3"/></>,
  redo: <path d="m15 14 5-5-5-5m5 5H10a5 5 0 1 0 0 10h3"/>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
  code: <><path d="m8 6-5 6 5 6m8-12 5 6-5 6m-3-14-2 16"/></>,
}

export function Icon({ name }: { name: keyof typeof paths }) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}
