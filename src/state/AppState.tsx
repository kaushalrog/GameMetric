import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AppStateContext, type AppStateValue } from './context'
import { decodeStoredState, DEFAULT_APP_STATE, STORAGE_VERSION, type AppStateData } from './model'

const STORAGE_KEY = 'gamemetric.app-state'

function readState(): AppStateData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return decodeStoredState(stored)
    const previousTheme = localStorage.getItem('gamemetric-theme')
    return { ...DEFAULT_APP_STATE, theme: previousTheme === 'light' ? 'light' : 'dark' }
  } catch {
    return DEFAULT_APP_STATE
  }
}

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppStateData>(readState)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, data }))
      localStorage.setItem('gamemetric-theme', data.theme)
    } catch {
      // Browser storage can fail; the in-memory session remains usable.
    }
  }, [data])

  const value = useMemo<AppStateValue>(() => ({
    data,
    setTheme: (theme) => setData((current) => ({ ...current, theme })),
    toggleFavorite: (type, id) => setData((current) => {
      const list = current.favorites[type] as string[]
      const next = list.includes(id) ? list.filter((item) => item !== id) : [...list, id]
      return { ...current, favorites: { ...current.favorites, [type]: next } }
    }),
    isFavorite: (type, id) => (data.favorites[type] as string[]).includes(id),
    addRecent: (entry) => setData((current) => ({
      ...current,
      recent: [{ ...entry, id: createId(), timestamp: Date.now() }, ...current.recent.filter((item) => !(item.calculator === entry.calculator && item.inputSummary === entry.inputSummary))].slice(0, 20),
    })),
    removeRecent: (id) => setData((current) => ({ ...current, recent: current.recent.filter((item) => item.id !== id) })),
    clearRecent: () => setData((current) => ({ ...current, recent: [] })),
    saveSetup: (setup, id) => setData((current) => ({ ...current, setups: id ? current.setups.map((item) => item.id === id ? { ...setup, id } : item) : [...current.setups, { ...setup, id: createId() }] })),
    removeSetup: (id) => setData((current) => ({ ...current, setups: current.setups.filter((item) => item.id !== id) })),
    duplicateSetup: (id) => setData((current) => {
      const found = current.setups.find((item) => item.id === id)
      return found ? { ...current, setups: [...current.setups, { ...found, id: createId(), name: `${found.name} copy` }] } : current
    }),
    saveTraining: (session) => setData((current) => ({ ...current, trainingHistory: [{ ...session, id: createId(), timestamp: Date.now() }, ...current.trainingHistory].slice(0, 50) })),
    removeTraining: (id) => setData((current) => ({ ...current, trainingHistory: current.trainingHistory.filter((session) => session.id !== id) })),
    setTrainingPreferences: (preferences) => setData((current) => {
      const trainingPreferences = { ...current.trainingPreferences, ...preferences }
      if (JSON.stringify(trainingPreferences) === JSON.stringify(current.trainingPreferences)) return current
      return { ...current, trainingPreferences }
    }),
  }), [data])

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}