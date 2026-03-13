/**
 * Simulates a binomial random variable: number of successes in n trials with probability p.
 * Uses normal approximation for n > 80 to avoid expensive loops.
 */
export function rollBinomial(n: number, p: number): number {
  if (n <= 0) return 0;
  if (p <= 0) return 0;
  if (p >= 1) return n;
  if (n <= 80) {
    let k = 0;
    for (let i = 0; i < n; i++) if (Math.random() < p) k++;
    return k;
  }
  const mean = n * p;
  const variance = n * p * (1 - p);
  const std = Math.sqrt(Math.max(0, variance));
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  const approx = Math.round(mean + z * std);
  return Math.max(0, Math.min(n, approx));
}
