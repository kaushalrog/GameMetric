import { createContext } from 'react'
import type { AppStateData, RecentCalculation, SavedSetup, TrainingPreferences, TrainingSession } from './model'

export interface AppStateValue {
  data: AppStateData
  setTheme(theme: AppStateData['theme']): void
  toggleFavorite(type: 'calculators' | 'games', id: string): void
  isFavorite(type: 'calculators' | 'games', id: string): boolean
  addRecent(entry: Omit<RecentCalculation, 'id' | 'timestamp'>): void
  removeRecent(id: string): void
  clearRecent(): void
  saveSetup(setup: Omit<SavedSetup, 'id'>, id?: string): void
  removeSetup(id: string): void
  duplicateSetup(id: string): void
  saveTraining(session: Omit<TrainingSession, 'id' | 'timestamp'>): void
  removeTraining(id: string): void
  setTrainingPreferences(preferences: Partial<TrainingPreferences>): void
}

export const AppStateContext = createContext<AppStateValue | null>(null)
