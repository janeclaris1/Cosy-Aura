/** Pure ledger math — safe for client and server bundles. */
export function roundLedger(value: number): number {
  return Math.round(value * 100) / 100;
}
