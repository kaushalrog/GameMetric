export type HardwareTier = 'entry' | 'mid' | 'high'
export type WorkloadClass = 'GPU-limited' | 'CPU-limited' | 'Mixed' | 'Insufficient data'

export interface PerformanceEstimateInput {
  cpuTier: HardwareTier | ''
  gpuTier: HardwareTier | ''
  ramGb: number
  resolution: '1080p' | '1440p' | '4k'
  targetFps: number
  preset: 'low' | 'medium' | 'high' | 'ultra'
  game: string
}

export interface HardwareGameBenchmarkSample {
  game: string
  gpu: string
  cpu: string
  resolution: string
  quality: string
  fps: number
  source: string
  verifiedAt: string
}

export const VERIFIED_BENCHMARKS: HardwareGameBenchmarkSample[] = []

export function estimateWorkload(input: PerformanceEstimateInput) {
  if (!input.cpuTier || !input.gpuTier || !Number.isFinite(input.ramGb) || input.ramGb <= 0 || input.ramGb > 2048 || !Number.isFinite(input.targetFps) || input.targetFps <= 0 || input.targetFps > 1000 || !input.game.trim()) {
    return { classification: 'Insufficient data' as const, reasons: ['Select a game, CPU tier, GPU tier, memory amount and target frame rate.'] }
  }

  const tierRank: Record<HardwareTier, number> = { entry: 0, mid: 1, high: 2 }
  const cpuRank = tierRank[input.cpuTier]
  const gpuRank = tierRank[input.gpuTier]
  const gpuDemand = (input.resolution === '4k' ? 2 : input.resolution === '1440p' ? 1 : 0) + (input.preset === 'ultra' ? 1 : input.preset === 'high' ? 0.5 : 0)
  const cpuDemand = input.targetFps >= 240 ? 2 : input.targetFps >= 144 ? 1 : 0
  const reasons: string[] = []

  if (input.resolution !== '1080p') reasons.push(`At ${input.resolution}, pixel workload generally increases and can shift more pressure to the GPU.`)
  if (input.targetFps >= 144) reasons.push(`A ${input.targetFps} FPS target increases CPU frame-production pressure, especially at lower resolutions.`)
  if (input.ramGb < 16) reasons.push('Less than 16 GB of system memory can constrain some current games and background workloads.')
  if (reasons.length === 0) reasons.push('The selected resolution, preset and frame-rate target do not strongly favor one component in this simplified estimate.')

  let classification: WorkloadClass = 'Mixed'
  const gpuPressure = gpuDemand - gpuRank
  const cpuPressure = cpuDemand - cpuRank
  if (gpuPressure - cpuPressure >= 1) classification = 'GPU-limited'
  else if (cpuPressure - gpuPressure >= 1) classification = 'CPU-limited'

  return { classification, reasons }
}