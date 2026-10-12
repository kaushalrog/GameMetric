import { describe, expect, it } from 'vitest'
import { decodeStoredState, migrateStoredState, normalizeAppState, STORAGE_VERSION } from './model'

describe('local app data validation', () => {
  it('falls back safely when the stored value is malformed', () => {
    expect(normalizeAppState(null).favorites.calculators).toEqual([])
    expect(normalizeAppState('not an object').trainingHistory).toEqual([])
  })

  it('filters unknown favorites and limits recent calculations to twenty', () => {
    const recent = Array.from({ length: 24 }, (_, index) => ({ id: `${index}`, calculator: 'edpi', timestamp: index + 1, inputSummary: `${index}`, resultSummary: `${index}` }))
    const result = normalizeAppState({ favorites: { calculators: ['edpi', 'unknown'], games: ['valorant', 'bad-game'] }, recent })
    expect(result.favorites.calculators).toEqual(['edpi'])
    expect(result.favorites.games).toEqual(['valorant'])
    expect(result.recent).toHaveLength(20)
  })

  it('sorts recent entries newest first and discards malformed setups', () => {
    const result = normalizeAppState({
      recent: [
        { id: 'older', calculator: 'edpi', timestamp: 1, inputSummary: 'old', resultSummary: 'old' },
        { id: 'newer', calculator: 'edpi', timestamp: 2, inputSummary: 'new', resultSummary: 'new' },
      ],
      setups: [{ id: 'bad', name: 'Invalid', game: 'not-a-game', dpi: 800 }],
    })
    expect(result.recent[0].id).toBe('newer')
    expect(result.setups).toEqual([])
  })

  it('discards saved setups and sessions with out-of-range measurements', () => {
    const result = normalizeAppState({
      setups: [{ id: 'extreme', name: 'Bad', game: 'valorant', dpi: Number.MAX_VALUE, pollingRate: 1000, resolutionWidth: 1920, resolutionHeight: 1080, refreshRate: 240, monitorSize: 24, sensitivity: 0.35, fov: 103, adsMultiplier: 1 }],
      trainingHistory: [{ id: 'bad-session', mode: 'Flick', timestamp: 1, targets: 10, hits: 10, misses: 0, accuracy: 150, averageReactionMs: 100, bestReactionMs: 80 }],
    })
    expect(result.setups).toEqual([])
    expect(result.trainingHistory).toEqual([])
  })

  it('migrates version 1 app data and safely falls back for a future schema', () => {
    const migrated = migrateStoredState(1, { theme: 'light', favorites: { calculators: ['edpi'] } })
    expect(migrated.theme).toBe('light')
    expect(migrated.favorites.calculators).toEqual(['edpi'])
    expect(migrated.trainingPreferences.targetGoal).toBe(20)
    expect(migrateStoredState(99, {}).favorites.calculators).toEqual([])
  })

  it('decodes malformed, missing, future, and valid versioned storage', () => {
    expect(decodeStoredState('{broken-json').favorites.calculators).toEqual([])
    expect(decodeStoredState(null).recent).toEqual([])
    expect(decodeStoredState(JSON.stringify({ version: 999, data: {} })).theme).toBe('dark')
    const decoded = decodeStoredState(JSON.stringify({ version: STORAGE_VERSION, data: { theme: 'light' } }))
    expect(decoded.theme).toBe('light')
    expect(decoded.trainingPreferences.targetGoal).toBe(20)
  })
})