import { describe, expect, it } from 'vitest'
import { calculateFrameIntervalMs, calculateMonitorMetrics, calculatePollingIntervalMs } from './monitor'
import { REFERENCE_FIXTURES } from './referenceFixtures'

describe('monitor calculator', () => {
  it('calculates 24-inch 1080p display metrics', () => {
    const fixture = REFERENCE_FIXTURES.monitor24In1080p240Hz
    const result = calculateMonitorMetrics(fixture)
    expect(result.aspectRatio).toBe(fixture.expectedAspect)
    expect(result.ppi, `Expected PPI ${fixture.expectedPpi}, received ${result.ppi}`).toBeCloseTo(fixture.expectedPpi, 3)
    expect(result.pixelPitchMm, `Expected pixel pitch ${fixture.expectedPixelPitchMm} mm, received ${result.pixelPitchMm} mm`).toBeCloseTo(fixture.expectedPixelPitchMm, 3)
    expect(result.totalPixels).toBe(2073600)
    expect(result.frameTimeMs).toBeCloseTo(fixture.expectedFrameIntervalMs, 4)
  })

  it('rejects invalid display values', () => {
    expect(() => calculateMonitorMetrics({ diagonalInches: 0, widthPixels: 1920, heightPixels: 1080, refreshRateHz: 60 })).toThrow()
    expect(() => calculateMonitorMetrics({ diagonalInches: 24, widthPixels: 1920.5, heightPixels: 1080, refreshRateHz: 60 })).toThrow()
    expect(() => calculateMonitorMetrics({ diagonalInches: Number.MAX_VALUE, widthPixels: 1920, heightPixels: 1080, refreshRateHz: 60 })).toThrow()
    expect(() => calculateMonitorMetrics({ diagonalInches: 24, widthPixels: Number.NaN, heightPixels: 1080, refreshRateHz: 60 })).toThrow()
  })

  it('converts polling rate to its nominal interval', () => {
    expect(calculatePollingIntervalMs(1000)).toBe(1)
    expect(() => calculatePollingIntervalMs(Number.NaN)).toThrow()
  })

  it('converts 240 FPS to its frame duration', () => {
    expect(calculateFrameIntervalMs(240)).toBeCloseTo(4.1666667, 7)
    expect(() => calculateFrameIntervalMs(Number.POSITIVE_INFINITY)).toThrow()
  })
})