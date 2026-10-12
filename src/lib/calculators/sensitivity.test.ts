import { describe, expect, it } from 'vitest'
import {
  calculateCm360,
  calculateEdpi,
  convertSensitivity,
  matchSensitivity,
} from './sensitivity'
import { GAME_LIBRARY } from '../games'
import { REFERENCE_FIXTURES } from './referenceFixtures'

describe('sensitivity engine', () => {
  it('converts cs2 to valorant using the supported yaw scales', () => {
    const fixture = REFERENCE_FIXTURES.cs2ToValorant
    const result = convertSensitivity(fixture)

    expect(result.convertedSensitivity, `Expected target sensitivity ${fixture.expectedSensitivity}, received ${result.convertedSensitivity}`).toBeCloseTo(fixture.expectedSensitivity, 12)
  })

  it('calculates eDPI', () => {
    const fixture = REFERENCE_FIXTURES.edpi
    expect(calculateEdpi(fixture.dpi, fixture.sensitivity)).toBe(fixture.expected)
  })

  it('calculates cm per 360 degrees', () => {
    const result = calculateCm360({ sensitivity: 1.2, dpi: 800, yaw: 0.022 })

    expect(result.cm360).toBeCloseTo((360 / (800 * 1.2 * 0.022)) * 2.54, 8)
    expect(result.in360).toBeCloseTo(result.cm360 / 2.54, 8)
    expect(result.counts360).toBeCloseTo(360 / (1.2 * 0.022), 8)
  })

  it('matches the CS2 800 DPI, 1 sensitivity unit reference case', () => {
    const fixture = REFERENCE_FIXTURES.cs2Cm360
    const result = calculateCm360({ sensitivity: fixture.sensitivity, dpi: fixture.dpi, yaw: fixture.yawDegreesPerCountAtSensitivityOne })
    expect(result.counts360, `Expected counts/360 ${fixture.expectedCountsPer360}, received ${result.counts360}`).toBeCloseTo(fixture.expectedCountsPer360, 8)
    expect(result.in360, `Expected in/360 ${fixture.expectedInchesPer360}, received ${result.in360}`).toBeCloseTo(fixture.expectedInchesPer360, 8)
    expect(result.cm360, `Expected cm/360 ${fixture.expectedCentimetersPer360}, received ${result.cm360}`).toBeCloseTo(fixture.expectedCentimetersPer360, 8)
  })

  it('rejects zero, negative, NaN, and infinite inputs', () => {
    for (const value of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => calculateEdpi(800, value)).toThrow()
      expect(() => calculateCm360({ sensitivity: value, dpi: 800, yaw: 0.022 })).toThrow()
      expect(() => calculateEdpi(value, 0.35)).toThrow()
      expect(() => calculateCm360({ sensitivity: 0.35, dpi: value, yaw: 0.022 })).toThrow()
      expect(() => calculateCm360({ sensitivity: 0.35, dpi: 800, yaw: value })).toThrow()
    }
  })

  it('changes the converted value for monitor-distance matching', () => {
    const distanceResult = matchSensitivity({
      fromGameId: 'cs2',
      toGameId: 'valorant',
      sensitivity: 1.2,
      dpi: 800,
      mode: '360-distance',
    })
    const monitorResult = matchSensitivity({
      fromGameId: 'cs2',
      toGameId: 'valorant',
      sensitivity: 1.2,
      dpi: 800,
      mode: 'monitor-distance',
      sourceFov: 90,
      targetFov: 103,
      monitorDistancePercent: 50,
    })

    expect(distanceResult.available).toBe(true)
    expect(monitorResult.available).toBe(true)
    if (distanceResult.available && monitorResult.available) {
      expect(monitorResult.result.convertedSensitivity).not.toBeCloseTo(distanceResult.result.convertedSensitivity, 3)
    }
    if (distanceResult.available) {
      expect(distanceResult.result.edpi).toBeCloseTo(distanceResult.result.convertedSensitivity * 800, 8)
      expect(distanceResult.result.cm360).toBeCloseTo((360 / (800 * distanceResult.result.convertedSensitivity * 0.07)) * 2.54, 8)
    }
    if (monitorResult.available) {
      const screenFraction = 0.5
      const sourceAngle = Math.atan(screenFraction * Math.tan((90 * Math.PI) / 360))
      const targetAngle = Math.atan(screenFraction * Math.tan((103 * Math.PI) / 360))
      const sourceAngularRate = 1.2 * 0.022 * sourceAngle
      const targetAngularRate = monitorResult.result.convertedSensitivity * 0.07 * targetAngle
      expect(targetAngularRate).toBeCloseTo(sourceAngularRate, 10)
    }
  })

  it('does not invent viewspeed parameters', () => {
    const result = matchSensitivity({
      fromGameId: 'cs2',
      toGameId: 'valorant',
      sensitivity: 1.2,
      dpi: 800,
      mode: 'viewspeed',
    })

    expect(result.available).toBe(false)
    if (!result.available) expect(result.reason).toContain('verified camera parameters')
  })

  it('refuses profiles without supported yaw data', () => {
    expect(() => convertSensitivity({ fromGameId: 'apex', toGameId: 'cs2', sensitivity: 1, dpi: 800 })).toThrow('verified yaw value')
  })

  it('does not claim direct verification for game yaw assumptions', () => {
    expect(GAME_LIBRARY.find((game) => game.id === 'valorant')?.sensitivity.status).toBe('partially-verified')
    expect(GAME_LIBRARY.find((game) => game.id === 'cs2')?.sources.some((source) => source.evidenceType === 'project-assumption')).toBe(true)
    expect(GAME_LIBRARY.find((game) => game.id === 'apex')?.sensitivity.status).toBe('unsupported')
  })

  it('rejects values whose outputs overflow', () => {
    expect(() => calculateEdpi(1e308, 10)).toThrow('numeric range')
    expect(() => calculateCm360({ sensitivity: 1, dpi: 800, yaw: 0 })).toThrow('Yaw')
  })
})
