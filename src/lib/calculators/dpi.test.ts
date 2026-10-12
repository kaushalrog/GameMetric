import { describe, expect, it } from 'vitest'
import { convertDpiSensitivity } from './dpi'
import { REFERENCE_FIXTURES } from './referenceFixtures'

describe('dpi conversion', () => {
  it('scales sensitivity based on DPI ratio', () => {
    const result = convertDpiSensitivity({
      currentDpi: REFERENCE_FIXTURES.dpiScaling.currentDpi,
      currentSensitivity: REFERENCE_FIXTURES.dpiScaling.currentSensitivity,
      targetDpi: REFERENCE_FIXTURES.dpiScaling.targetDpi,
    })

    expect(result.newSensitivity, `Expected target sensitivity ${REFERENCE_FIXTURES.dpiScaling.expectedSensitivity}, received ${result.newSensitivity}`).toBeCloseTo(REFERENCE_FIXTURES.dpiScaling.expectedSensitivity, 5)
    expect(result.edpi, `Expected eDPI ${REFERENCE_FIXTURES.dpiScaling.expectedEdpi}, received ${result.edpi}`).toBeCloseTo(REFERENCE_FIXTURES.dpiScaling.expectedEdpi, 5)
  })

  it('rejects non-finite input and overflow results', () => {
    expect(() => convertDpiSensitivity({ currentDpi: Number.NaN, currentSensitivity: 1, targetDpi: 800 })).toThrow()
    expect(() => convertDpiSensitivity({ currentDpi: 1e308, currentSensitivity: 10, targetDpi: 800 })).toThrow()
  })

  it('matches the standard 800 DPI to 1600 DPI reference case', () => {
    const result = convertDpiSensitivity({ currentDpi: 800, currentSensitivity: 0.4, targetDpi: 1600 })
    expect(result.newSensitivity).toBeCloseTo(0.2, 12)
    expect(result.edpi).toBe(320)
  })

  it('preserves eDPI for decimal sensitivity and rejects invalid values', () => {
    expect(convertDpiSensitivity({ currentDpi: 800, currentSensitivity: 0.35, targetDpi: 1600 }).newSensitivity).toBeCloseTo(0.175, 12)
    for (const value of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => convertDpiSensitivity({ currentDpi: value, currentSensitivity: 0.4, targetDpi: 800 })).toThrow()
      expect(() => convertDpiSensitivity({ currentDpi: 800, currentSensitivity: value, targetDpi: 1600 })).toThrow()
      expect(() => convertDpiSensitivity({ currentDpi: 800, currentSensitivity: 0.4, targetDpi: value })).toThrow()
    }
  })
})
