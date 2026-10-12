export interface DpiConversionInput {
  currentDpi: number
  currentSensitivity: number
  targetDpi: number
}

export function convertDpiSensitivity({
  currentDpi,
  currentSensitivity,
  targetDpi,
}: DpiConversionInput) {
  if (!Number.isFinite(currentDpi) || currentDpi <= 0) {
    throw new Error('Current DPI must be greater than 0.')
  }

  if (!Number.isFinite(currentSensitivity) || currentSensitivity <= 0) {
    throw new Error('Current sensitivity must be greater than 0.')
  }

  if (!Number.isFinite(targetDpi) || targetDpi <= 0) {
    throw new Error('Target DPI must be greater than 0.')
  }

  const newSensitivity = (currentSensitivity * currentDpi) / targetDpi
  const edpi = currentSensitivity * currentDpi
  if (!Number.isFinite(newSensitivity) || newSensitivity <= 0 || !Number.isFinite(edpi) || edpi <= 0) {
    throw new Error('The converted result exceeds the supported numeric range.')
  }

  return {
    newSensitivity,
    edpi,
    dpis: {
      currentDpi,
      targetDpi,
    },
  }
}
