import { useEffect, useState } from 'react'
import { paletteGroups, siteThemes } from './themes.ts'
import type { SiteTheme, Theme } from './themes.ts'

interface AppearancePreferences {
  mode: SiteTheme
  theme: Theme
}

const key = 'brush-io:appearance:v1'
const defaults: AppearancePreferences = { mode: 'system', theme: 'green' }
const paletteNames = new Set(Object.values(paletteGroups).flatMap((group) => Object.keys(group)))

function readAppearance(): AppearancePreferences {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? 'null') as Partial<AppearancePreferences> | null
    if (!value || typeof value !== 'object') return defaults
    return {
      mode: value.mode && Object.hasOwn(siteThemes, value.mode) ? value.mode : defaults.mode,
      theme: value.theme && paletteNames.has(value.theme) ? value.theme : defaults.theme,
    }
  } catch {
    return defaults
  }
}

export function useAppearancePreferences() {
  const [appearance, setAppearance] = useState(readAppearance)
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(appearance))
    } catch {
      // The current choices remain usable when storage is unavailable.
    }
  }, [appearance])
  return [appearance, setAppearance] as const
}
