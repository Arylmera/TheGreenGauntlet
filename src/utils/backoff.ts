export function exponentialBackoff(
  baseMs: number,
  attempt: number,
  maxMs: number,
): number {
  if (attempt <= 0) return baseMs;
  return Math.min(baseMs * 2 ** (attempt - 1), maxMs);
}
