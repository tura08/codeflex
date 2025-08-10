export function computeWeightedScore(
  vars: { weight: number; score: number }[],
): number {
  const totalW = vars.reduce((a, v) => a + v.weight, 0)
  if (totalW === 0) return 0
  const sum = vars.reduce((a, v) => a + v.weight * v.score, 0)
  return +(sum / totalW).toFixed(2)
}
