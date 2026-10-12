import { describe, expect, it } from 'vitest'
import { calculateFovMetrics } from './fov'
import { REFERENCE_FIXTURES } from './referenceFixtures'

describe('FOV projection conversion', () => {
  it('converts horizontal FOV using rectilinear projection', () => {
    const fixture = REFERENCE_FIXTURES.fov16By9
    const result = calculateFovMetrics(fixture.horizontalDegrees, fixture.width, fixture.height)
    expect(result.vertical, `Expected vertical FOV ${fixture.expectedVerticalDegrees}°, received ${result.vertical}°`).toBeCloseTo(fixture.expectedVerticalDegrees, 3)
    expect(result.diagonal).toBeCloseTo(97.8508, 3)
  })

  it('rejects invalid field-of-view and aspect inputs', () => {
    expect(() => calculateFovMetrics(180, 16, 9)).toThrow()
    expect(() => calculateFovMetrics(90, 0, 9)).toThrow()
    expect(() => calculateFovMetrics(Number.NaN, 16, 9)).toThrow()
    expect(() => calculateFovMetrics(90, Number.POSITIVE_INFINITY, 9)).toThrow()
  })

  it('keeps valid small decimal angles finite', () => {
    const result = calculateFovMetrics(0.01, 16, 9)
    expect(result.vertical).toBeGreaterThan(0)
    expect(Number.isFinite(result.diagonal)).toBe(true)
  })
})