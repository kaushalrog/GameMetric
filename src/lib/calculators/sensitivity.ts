import { GAME_MAP, type GameId } from '../games'

export interface SensitivityCalculationInput {
  fromGameId: GameId
  toGameId: GameId
  sensitivity: number
  dpi: number
}

export interface CalculationResult {
  convertedSensitivity: number
  edpi: number
  cm360: number
  in360: number
  counts360: number
  sourceYaw: number
  targetYaw: number
  sourceGame: string
  targetGame: string
}

export type SensitivityMatchMode = '360-distance' | 'monitor-distance' | 'viewspeed' | 'custom'

export interface SensitivityMatchInput extends SensitivityCalculationInput {
  mode: SensitivityMatchMode
  sourceFov?: number
  targetFov?: number
  monitorDistancePercent?: number
}

export type SensitivityMatchResult =
  | { available: true; mode: Exclude<SensitivityMatchMode, 'viewspeed'>; result: CalculationResult; monitorDistancePercent?: number }
  | { available: false; mode: 'viewspeed'; reason: string }

export function calculateEdpi(dpi: number, sensitivity: number) {
  if (!Number.isFinite(dpi) || dpi <= 0) {
    throw new Error('DPI must be greater than 0.')
  }

  if (!Number.isFinite(sensitivity) || sensitivity <= 0) {
    throw new Error('Sensitivity must be greater than 0.')
  }

  const edpi = dpi * sensitivity
  if (!Number.isFinite(edpi) || edpi <= 0) throw new Error('The eDPI result exceeds the supported numeric range.')
  return edpi
}

export function calculateCm360({
  sensitivity,
  dpi,
  yaw,
}: {
  sensitivity: number
  dpi: number
  yaw: number
}) {
  if (!Number.isFinite(dpi) || dpi <= 0) {
    throw new Error('DPI must be greater than 0.')
  }

  if (!Number.isFinite(sensitivity) || sensitivity <= 0) {
    throw new Error('Sensitivity must be greater than 0.')
  }

  if (!Number.isFinite(yaw) || yaw <= 0) {
    throw new Error('Yaw must be a finite value greater than 0.')
  }

  const counts360 = 360 / (sensitivity * yaw)
  const cm360 = (counts360 / dpi) * 2.54
  const in360 = cm360 / 2.54
  if (![counts360, cm360, in360].every((value) => Number.isFinite(value) && value > 0)) throw new Error('The cm/360 result exceeds the supported numeric range.')

  return {
    cm360,
    in360,
    counts360,
    degreesPerCount: sensitivity * yaw,
  }
}

export function convertSensitivity({
  fromGameId,
  toGameId,
  sensitivity,
  dpi,
}: SensitivityCalculationInput): CalculationResult {
  const sourceGame = GAME_MAP[fromGameId]
  const targetGame = GAME_MAP[toGameId]

  if (!sourceGame || !targetGame) {
    throw new Error('This game is not currently supported.')
  }

  const sourceYaw = sourceGame.sensitivity.yaw
  const targetYaw = targetGame.sensitivity.yaw
  if (!['verified', 'partially-verified'].includes(sourceGame.sensitivity.status) || !['verified', 'partially-verified'].includes(targetGame.sensitivity.status) || sourceYaw === undefined || targetYaw === undefined) {
    throw new Error('Sensitivity conversion is unavailable because a verified yaw value is not available for one or both games.')
  }

  if (!Number.isFinite(sensitivity) || sensitivity <= 0) {
    throw new Error('Sensitivity must be greater than 0.')
  }

  if (!Number.isFinite(dpi) || dpi <= 0) {
    throw new Error('DPI must be greater than 0.')
  }

  const convertedSensitivity = sensitivity * (sourceYaw / targetYaw)
  if (!Number.isFinite(convertedSensitivity) || convertedSensitivity <= 0) {
    throw new Error('The converted sensitivity is outside the supported numeric range.')
  }
  const targetDistance = calculateCm360({
    sensitivity: convertedSensitivity,
    dpi,
    yaw: targetYaw,
  })

  return {
    convertedSensitivity,
    edpi: calculateEdpi(dpi, convertedSensitivity),
    cm360: targetDistance.cm360,
    in360: targetDistance.in360,
    counts360: targetDistance.counts360,
    sourceYaw,
    targetYaw,
    sourceGame: sourceGame.name,
    targetGame: targetGame.name,
  }
}

export function matchSensitivity(input: SensitivityMatchInput): SensitivityMatchResult {
  if (input.mode === 'viewspeed') {
    return {
      available: false,
      mode: 'viewspeed',
      reason: 'Viewspeed matching is unavailable because verified camera parameters are not available for these games.',
    }
  }

  const baseResult = convertSensitivity(input)

  if (input.mode === '360-distance') {
    return { available: true, mode: input.mode, result: baseResult }
  }

  const percent = input.monitorDistancePercent ?? (input.mode === 'custom' ? undefined : 50)
  if (!Number.isFinite(percent) || percent! <= 0 || percent! > 100) {
    throw new Error('Monitor distance must be greater than 0% and no more than 100%.')
  }
  if (!Number.isFinite(input.sourceFov) || !Number.isFinite(input.targetFov) || input.sourceFov! <= 0 || input.sourceFov! >= 180 || input.targetFov! <= 0 || input.targetFov! >= 180) {
    throw new Error('Enter source and target horizontal FOV values between 0° and 180°.')
  }

  const sourceAngle = Math.atan((percent! / 100) * Math.tan((input.sourceFov! * Math.PI) / 360))
  const targetAngle = Math.atan((percent! / 100) * Math.tan((input.targetFov! * Math.PI) / 360))
  const convertedSensitivity = baseResult.convertedSensitivity * (sourceAngle / targetAngle)
  if (!Number.isFinite(convertedSensitivity) || convertedSensitivity <= 0) {
    throw new Error('The monitor-distance result exceeds the supported numeric range.')
  }
  const targetGame = GAME_MAP[input.toGameId]
  if (!targetGame || !['verified', 'partially-verified'].includes(targetGame.sensitivity.status) || targetGame.sensitivity.yaw === undefined) {
    throw new Error('Sensitivity conversion is unavailable because a verified target yaw value is not available.')
  }
  const distance = calculateCm360({ sensitivity: convertedSensitivity, dpi: input.dpi, yaw: targetGame.sensitivity.yaw })

  return {
    available: true,
    mode: input.mode,
    monitorDistancePercent: percent,
    result: {
      ...baseResult,
      convertedSensitivity,
      edpi: calculateEdpi(input.dpi, convertedSensitivity),
      cm360: distance.cm360,
      in360: distance.in360,
      counts360: distance.counts360,
    },
  }
}
