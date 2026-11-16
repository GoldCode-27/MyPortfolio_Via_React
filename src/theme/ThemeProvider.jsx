import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { ThemeContext } from './ThemeContext.js'

const THEME_STORAGE_KEY = 'theme'
const THEMES = ['light', 'dark', 'system']
const subscribeToMount = () => () => {}
const getClientMountedSnapshot = () => true
const getServerMountedSnapshot = () => false

function isTheme(value) {
  return THEMES.includes(value)
}

function readStoredTheme() {
  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
    return isTheme(storedTheme) ? storedTheme : 'system'
  } catch {
    return 'system'
  }
}

function getSystemTheme() {
  const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)')
  return mediaQuery?.matches ? 'dark' : 'light'
}

function saveTheme(theme) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Theme selection still works for this page when storage is unavailable.
  }
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readStoredTheme)
  const [systemTheme, setSystemTheme] = useState(getSystemTheme)
  const mounted = useSyncExternalStore(
    subscribeToMount,
    getClientMountedSnapshot,
    getServerMountedSnapshot,
  )
  const resolvedTheme = theme === 'system' ? systemTheme : theme

  const setTheme = useCallback((nextTheme) => {
    if (isTheme(nextTheme)) setThemeState(nextTheme)
  }, [])

  useEffect(() => {
    const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)')
    const updateSystemTheme = (event) => {
      setSystemTheme(event.matches ? 'dark' : 'light')
    }

    if (mediaQuery) {
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', updateSystemTheme)
      } else {
        mediaQuery.addListener?.(updateSystemTheme)
      }
    }

    const syncThemeFromStorage = (event) => {
      if (event.key !== THEME_STORAGE_KEY && event.key !== null) return
      setThemeState(isTheme(event.newValue) ? event.newValue : 'system')
    }

    window.addEventListener('storage', syncThemeFromStorage)

    return () => {
      if (mediaQuery?.removeEventListener) {
        mediaQuery.removeEventListener('change', updateSystemTheme)
      } else {
        mediaQuery?.removeListener?.(updateSystemTheme)
      }
      window.removeEventListener('storage', syncThemeFromStorage)
    }
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = resolvedTheme
    root.dataset.themeMode = theme
    root.classList.add('theme-ready')

    const themeColor = document.querySelector('meta[name="theme-color"]')
    if (themeColor) {
      themeColor.setAttribute('content', resolvedTheme === 'dark' ? '#0b1220' : '#f7f7f7')
    }
  }, [resolvedTheme, theme])

  useEffect(() => {
    saveTheme(theme)
  }, [theme])

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme, mounted }),
    [theme, resolvedTheme, setTheme, mounted],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
