export interface CalculatorDefinition {
  id: string
  title: string
  description: string
  route: string
  badge: string
  icon: string
  implemented: true
}

export const CALCULATORS: CalculatorDefinition[] = [
  { id: 'sensitivity', title: 'Mouse Sensitivity', description: 'Convert aim sensitivity between supported games.', route: '/calculators/sensitivity', badge: 'MOST USED', icon: '🎯', implemented: true },
  { id: 'edpi', title: 'eDPI Calculator', description: 'Compare DPI and in-game sensitivity as one figure.', route: '/calculators/edpi', badge: 'BASIC', icon: '📐', implemented: true },
  { id: 'dpi', title: 'DPI Converter', description: 'Keep the same desktop and game input speed at a new DPI.', route: '/calculators/dpi', badge: 'STANDARD', icon: '⚙️', implemented: true },
  { id: 'fov', title: 'FOV Calculator', description: 'Convert horizontal, vertical and diagonal field of view.', route: '/calculators/fov', badge: 'VISUAL', icon: '🧭', implemented: true },
  { id: 'monitor', title: 'Monitor Calculator', description: 'Calculate pixel density, aspect ratio and frame interval.', route: '/calculators/monitor', badge: 'DISPLAY', icon: '🖥️', implemented: true },
  { id: 'performance', title: 'Performance Estimator', description: 'Classify likely workload pressure with visible assumptions.', route: '/calculators/performance', badge: 'ESTIMATE', icon: '💻', implemented: true },
  { id: 'aim-training', title: 'Aim Trainer', description: 'Practice target clicks and review measured results.', route: '/tools/sensitivity-lab', badge: 'PRACTICE', icon: '🧠', implemented: true },
  { id: 'learn', title: 'Learn', description: 'Understand the measurements behind your setup.', route: '/learn', badge: 'GUIDES', icon: '▤', implemented: true },
]

export function getCalculator(id: string) {
  return CALCULATORS.find((calculator) => calculator.id === id)
}