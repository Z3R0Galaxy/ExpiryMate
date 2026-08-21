import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'expirymate-theme'

// Mirrors the inline script in index.html, which sets the same attribute
// before first paint to avoid a flash of the wrong theme — this just needs
// to agree with it once React takes over.
//
// Dark mode is the site default: a first-time visitor with no stored
// preference gets dark rather than following the OS's light/dark setting.
// Anyone who explicitly toggles to light still gets that choice remembered
// (see the stored-preference check above it).
function getInitialTheme(): Theme {
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return 'dark'
}

/**
 * Manual light/dark toggle, remembered across visits. Deliberately a
 * one-time-read default (system preference or the last explicit choice)
 * rather than continuing to follow the OS setting live once the user has
 * picked one themselves — a user who explicitly toggled to dark shouldn't
 * get flipped back to light just because their OS switched at sunset.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    window.localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  function toggleTheme() {
    setTheme(current => (current === 'light' ? 'dark' : 'light'))
  }

  return { theme, toggleTheme }
}
