export function calculateFovMetrics(horizontalFovDegrees: number, aspectWidth: number, aspectHeight: number) {
  if (!Number.isFinite(horizontalFovDegrees) || horizontalFovDegrees <= 0 || horizontalFovDegrees >= 180) {
    throw new Error('Horizontal FOV must be between 0° and 180°.')
  }
  if (!Number.isFinite(aspectWidth) || !Number.isFinite(aspectHeight) || aspectWidth <= 0 || aspectHeight <= 0) {
    throw new Error('Aspect ratio dimensions must be greater than 0.')
  }

  const aspect = aspectWidth / aspectHeight
  if (!Number.isFinite(aspect) || aspect <= 0) throw new Error('Aspect ratio is outside the supported range.')
  const tangent = Math.tan((horizontalFovDegrees * Math.PI) / 360)
  return {
    horizontal: horizontalFovDegrees,
    vertical: (2 * Math.atan(tangent / aspect) * 180) / Math.PI,
    diagonal: (2 * Math.atan(tangent * Math.hypot(1, 1 / aspect)) * 180) / Math.PI,
  }
}