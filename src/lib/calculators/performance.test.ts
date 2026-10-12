import { describe, expect, it } from 'vitest'
import { estimateWorkload } from './performance'

describe('performance workload estimate', () => {
  it('reports missing hardware rather than inventing a result', () => {
    expect(estimateWorkload({ cpuTier: '', gpuTier: '', ramGb: 16, resolution: '1080p', targetFps: 144, preset: 'high', game: 'A game' }).classification).toBe('Insufficient data')
  })

  it('explains higher-resolution GPU pressure', () => {
    const result = estimateWorkload({ cpuTier: 'high', gpuTier: 'entry', ramGb: 32, resolution: '4k', targetFps: 60, preset: 'ultra', game: 'A game' })
    expect(result.classification).toBe('GPU-limited')
    expect(result.reasons.join(' ')).toContain('GPU')
  })

  it('identifies CPU pressure for low-resolution high-refresh workloads', () => {
    const result = estimateWorkload({ cpuTier: 'entry', gpuTier: 'high', ramGb: 16, resolution: '1080p', targetFps: 240, preset: 'low', game: 'A game' })
    expect(result.classification).toBe('CPU-limited')
    expect(result.reasons.join(' ')).toContain('CPU')
  })

  it('does not classify extreme target values', () => {
    const result = estimateWorkload({ cpuTier: 'high', gpuTier: 'high', ramGb: 32, resolution: '1080p', targetFps: 1e308, preset: 'high', game: 'A game' })
    expect(result.classification).toBe('Insufficient data')
  })
})