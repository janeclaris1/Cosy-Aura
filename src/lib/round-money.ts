/** Round GHS amounts to 2 decimal places (no server dependencies). */
export function roundGhs(value: number): number {
  return Math.round(value * 100) / 100;
}
