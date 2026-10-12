import { CALCULATORS } from '../lib/registry'
import { GAME_LIBRARY, type GameId } from '../lib/games'

export const STORAGE_VERSION = 2

export interface RecentCalculation {
  id: string
  calculator: string
  timestamp: number
  inputSummary: string
  resultSummary: string
  fromGame?: GameId
  toGame?: GameId
  values?: Record<string, number | string>
}

export interface SavedSetup {
  id: string
  name: string
  dpi: number
  pollingRate: number
  resolutionWidth: number
  resolutionHeight: number
  refreshRate: number
  monitorSize: number
  game: GameId
  sensitivity: number
  fov: number
  adsMultiplier: number
}

export interface TrainingSession {
  id: string
  mode: string
  timestamp: number
  targets: number
  hits: number
  misses: number
  accuracy: number
  averageReactionMs: number
  bestReactionMs: number
  durationMs?: number
}

export interface TrainingPreferences {
  mode: 'Reaction Click' | 'Target Click' | 'Flick'
  targetSize: number
  targetGoal: number
  durationSeconds: number
  sound: boolean
  arenaStyle: 'grid' | 'plain' | 'crosshair'
}

export interface AppStateData {
  theme: 'dark' | 'light'
  favorites: { calculators: string[]; games: GameId[] }
  recent: RecentCalculation[]
  setups: SavedSetup[]
  trainingHistory: TrainingSession[]
  trainingPreferences: TrainingPreferences
}

export const DEFAULT_APP_STATE: AppStateData = {
  theme: 'dark',
  favorites: { calculators: [], games: [] },
  recent: [],
  setups: [],
  trainingHistory: [],
  trainingPreferences: { mode: 'Target Click', targetSize: 56, targetGoal: 20, durationSeconds: 60, sound: false, arenaStyle: 'grid' },
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isGameId(value: unknown): value is GameId {
  return typeof value === 'string' && GAME_LIBRARY.some((game) => game.id === value)
}

export function normalizeAppState(value: unknown): AppStateData {
  if (!isRecord(value)) return DEFAULT_APP_STATE
  const favorites = isRecord(value.favorites) ? value.favorites : {}
  const calculatorIds = CALCULATORS.map((calculator) => calculator.id)
  const setupLimits: Record<string, number> = { dpi: 100000, pollingRate: 10000, resolutionWidth: 65536, resolutionHeight: 65536, refreshRate: 1000, monitorSize: 200, sensitivity: 1000, fov: 179, adsMultiplier: 100 }
  const recent = Array.isArray(value.recent) ? value.recent.filter((entry): entry is RecentCalculation =>
    isRecord(entry) && typeof entry.id === 'string' && typeof entry.calculator === 'string' && calculatorIds.includes(entry.calculator) && Number.isFinite(entry.timestamp) && typeof entry.inputSummary === 'string' && typeof entry.resultSummary === 'string',
  ).sort((left, right) => right.timestamp - left.timestamp).slice(0, 20) : []
  const setups = Array.isArray(value.setups) ? value.setups.filter((entry): entry is SavedSetup =>
    isRecord(entry) && typeof entry.id === 'string' && typeof entry.name === 'string' && entry.name.trim().length > 0 && isGameId(entry.game) && Object.entries(setupLimits).every(([key, maximum]) => Number.isFinite(entry[key]) && Number(entry[key]) > 0 && Number(entry[key]) <= maximum),
  ) : []
  const trainingHistory = Array.isArray(value.trainingHistory) ? value.trainingHistory.filter((entry): entry is TrainingSession =>
    isRecord(entry) && typeof entry.id === 'string' && typeof entry.mode === 'string' && Number.isFinite(entry.timestamp) && Number.isFinite(entry.accuracy) && Number(entry.accuracy) >= 0 && Number(entry.accuracy) <= 100 && Number.isFinite(entry.targets) && Number(entry.targets) >= 0 && Number.isFinite(entry.hits) && Number(entry.hits) >= 0 && Number.isFinite(entry.misses) && Number(entry.misses) >= 0 && Number.isFinite(entry.averageReactionMs) && Number(entry.averageReactionMs) >= 0 && Number.isFinite(entry.bestReactionMs) && Number(entry.bestReactionMs) >= 0,
  ).sort((left, right) => right.timestamp - left.timestamp).slice(0, 50) : []
  const preferences = isRecord(value.trainingPreferences) ? value.trainingPreferences : {}
  const trainingPreferences: TrainingPreferences = {
    mode: preferences.mode === 'Reaction Click' || preferences.mode === 'Flick' ? preferences.mode : 'Target Click',
    targetSize: Number.isFinite(preferences.targetSize) ? Math.min(88, Math.max(28, Number(preferences.targetSize))) : DEFAULT_APP_STATE.trainingPreferences.targetSize,
    targetGoal: [10, 20, 50].includes(Number(preferences.targetGoal)) ? Number(preferences.targetGoal) : DEFAULT_APP_STATE.trainingPreferences.targetGoal,
    durationSeconds: [30, 60, 120].includes(Number(preferences.durationSeconds)) ? Number(preferences.durationSeconds) : DEFAULT_APP_STATE.trainingPreferences.durationSeconds,
    sound: preferences.sound === true,
    arenaStyle: preferences.arenaStyle === 'plain' || preferences.arenaStyle === 'crosshair' ? preferences.arenaStyle : 'grid',
  }

  return {
    theme: value.theme === 'light' ? 'light' : 'dark',
    favorites: {
      calculators: Array.isArray(favorites.calculators) ? [...new Set(favorites.calculators.filter((id): id is string => typeof id === 'string' && calculatorIds.includes(id)))] : [],
      games: Array.isArray(favorites.games) ? [...new Set(favorites.games.filter(isGameId))] : [],
    },
    recent,
    setups,
    trainingHistory,
    trainingPreferences,
  }
}

export function migrateStoredState(version: number, value: unknown): AppStateData {
  let data = value
  let currentVersion = version
  while (currentVersion < STORAGE_VERSION) {
    if (currentVersion === 1) {
      const previous = isRecord(data) ? data : {}
      data = { ...previous, trainingPreferences: previous.trainingPreferences ?? DEFAULT_APP_STATE.trainingPreferences }
      currentVersion = 2
      continue
    }
    return DEFAULT_APP_STATE
  }
  return currentVersion === STORAGE_VERSION ? normalizeAppState(data) : DEFAULT_APP_STATE
}

export function decodeStoredState(serialized: string | null): AppStateData {
  if (!serialized) return DEFAULT_APP_STATE
  try {
    const envelope: unknown = JSON.parse(serialized)
    if (!isRecord(envelope) || typeof envelope.version !== 'number') return DEFAULT_APP_STATE
    return migrateStoredState(envelope.version, envelope.data)
  } catch {
    return DEFAULT_APP_STATE
  }
}
