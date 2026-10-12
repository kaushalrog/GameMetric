export const REFERENCE_FIXTURES = {
  edpi: { dpi: 800, sensitivity: 0.35, expected: 280 },
  dpiScaling: { currentDpi: 800, currentSensitivity: 0.4, targetDpi: 1600, expectedSensitivity: 0.2, expectedEdpi: 320 },
  cs2Cm360: { dpi: 800, sensitivity: 1, yawDegreesPerCountAtSensitivityOne: 0.022, expectedCountsPer360: 360 / 0.022, expectedInchesPer360: (360 / 0.022 / 800), expectedCentimetersPer360: (360 / 0.022 / 800) * 2.54 },
  cs2ToValorant: { fromGameId: 'cs2' as const, toGameId: 'valorant' as const, dpi: 800, sensitivity: 1.2, expectedSensitivity: 1.2 * 0.022 / 0.07 },
  fov16By9: { horizontalDegrees: 90, width: 16, height: 9, expectedVerticalDegrees: 58.7155 },
  monitor24In1080p240Hz: { diagonalInches: 24, widthPixels: 1920, heightPixels: 1080, refreshRateHz: 240, expectedAspect: '16:9', expectedPpi: 91.7878, expectedPixelPitchMm: 25.4 / 91.7878, expectedFrameIntervalMs: 1000 / 240 },
  fps240: { framesPerSecond: 240, expectedFrameIntervalMs: 1000 / 240 },
  polling1000Hz: { rateHz: 1000, expectedIntervalMs: 1 },
} as const
