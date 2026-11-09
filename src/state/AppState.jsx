import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../lib/api'
import {
  THEME_STORAGE_KEY,
  applyTheme,
  normalizeTheme,
  persistScene,
  readStoredScene,
  readStoredTheme
} from '../lib/themes'

const AppStateContext = createContext(null)

export const readTheme = readStoredTheme

function persistTheme(theme) {
  const next = normalizeTheme(theme)
  applyTheme(next)
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next)
  } catch {
    /* storage may be unavailable in hardened contexts */
  }
  return next
}

export function AppStateProvider({ children }) {
  const [boot, setBoot] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [theme, setTheme] = useState(readTheme)
  const [scene, setSceneState] = useState(readStoredScene)
  const [paywall, setPaywall] = useState(null)
  const bootRef = useRef(null)

  bootRef.current = boot

  const load = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true)
    else setLoading(true)

    try {
      const result = await api.bootstrap()
      if (!result.ok) throw new Error(result.error || 'Uygulama başlatılamadı.')
      setBoot(result)
      setError(null)
      return result
    } catch (cause) {
      const message = cause?.message || 'Uygulama başlatılamadı.'
      setError(message)
      return null
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    persistTheme(theme)
    api.setTheme?.(theme)
  }, [theme])

  useEffect(() => {
    const handler = (event) => {
      if (bootRef.current?.licensed) return
      setPaywall((current) => current || { module: event.detail?.module, message: event.detail?.message })
    }
    window.addEventListener('omerta:paywall', handler)
    return () => window.removeEventListener('omerta:paywall', handler)
  }, [])

  const setThemeValue = useCallback((next) => {
    setTheme(normalizeTheme(next))
  }, [])

  const setScene = useCallback((next) => {
    setSceneState(persistScene(next))
  }, [])

  const openPaywall = useCallback((reason = {}) => {
    if (bootRef.current?.licensed) return
    setPaywall((current) => current || reason)
  }, [])

  const closePaywall = useCallback(() => setPaywall(null), [])

  const activate = useCallback(
    async (key) => {
      const result = await api.activateLicense(key)
      if (result?.ok === false) return result
      const next = await load({ silent: true })
      if (next?.licensed) setPaywall(null)
      return result
    },
    [load]
  )

  const logout = useCallback(async () => {
    const result = await api.logout()
    if (result.ok) await load({ silent: true })
    return result
  }, [load])

  const value = useMemo(
    () => ({
      boot,
      error,
      loading,
      refreshing,
      theme,
      setTheme: setThemeValue,
      scene,
      setScene,
      paywall,
      openPaywall,
      closePaywall,
      activate,
      logout,
      refresh: () => load({ silent: Boolean(bootRef.current) })
    }),
    [
      boot,
      error,
      loading,
      refreshing,
      theme,
      setThemeValue,
      scene,
      setScene,
      paywall,
      openPaywall,
      closePaywall,
      activate,
      logout,
      load
    ]
  )

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState() {
  const context = useContext(AppStateContext)
  if (!context) throw new Error('useAppState must be used inside AppStateProvider')
  return context
}
