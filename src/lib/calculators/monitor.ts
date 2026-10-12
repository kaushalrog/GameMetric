export interface MonitorInput {
  diagonalInches: number
  widthPixels: number
  heightPixels: number
  refreshRateHz: number
}

function positiveFinite(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} must be greater than 0.`)
}

function greatestCommonDivisor(left: number, right: number): number {
  return right === 0 ? left : greatestCommonDivisor(right, left % right)
}

export function calculateMonitorMetrics(input: MonitorInput) {
  positiveFinite(input.diagonalInches, 'Diagonal size')
  positiveFinite(input.widthPixels, 'Horizontal resolution')
  positiveFinite(input.heightPixels, 'Vertical resolution')
  positiveFinite(input.refreshRateHz, 'Refresh rate')
  if (input.diagonalInches > 200 || input.refreshRateHz > 1000) throw new Error('Display size or refresh rate exceeds the supported range.')
  if (!Number.isInteger(input.widthPixels) || !Number.isInteger(input.heightPixels) || input.widthPixels > 65536 || input.heightPixels > 65536) {
    throw new Error('Resolution must use whole pixels and remain within the supported range.')
  }

  const diagonalPixels = Math.hypot(input.widthPixels, input.heightPixels)
  const ppi = diagonalPixels / input.diagonalInches
  const divisor = greatestCommonDivisor(input.widthPixels, input.heightPixels)
  const metrics = {
    aspectRatio: `${input.widthPixels / divisor}:${input.heightPixels / divisor}`,
    ppi,
    pixelPitchMm: 25.4 / ppi,
    totalPixels: input.widthPixels * input.heightPixels,
    frameTimeMs: 1000 / input.refreshRateHz,
  }
  if (!Object.values(metrics).every((value) => typeof value === 'string' || (Number.isFinite(value) && value > 0))) {
    throw new Error('The display result exceeds the supported numeric range.')
  }

  return metrics
}

export function calculatePollingIntervalMs(pollingRateHz: number) {
  positiveFinite(pollingRateHz, 'Polling rate')
  if (pollingRateHz > 10000) throw new Error('Polling rate exceeds the supported range.')
  return 1000 / pollingRateHz
}

export function calculateFrameIntervalMs(framesPerSecond: number) {
  positiveFinite(framesPerSecond, 'Frame rate')
  if (framesPerSecond > 10000) throw new Error('Frame rate exceeds the supported range.')
  return 1000 / framesPerSecond
}