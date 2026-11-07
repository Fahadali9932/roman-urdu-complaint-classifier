/**
 * Reference number generator for Karachi civic complaints.
 * Format: KHI-YYYY-XXXX (e.g. KHI-2026-7842)
 */

export function generateMockReference(year: number = 2026): string {
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `KHI-${year}-${randomSuffix}`;
}

export function isValidReferenceFormat(ref: string): boolean {
  if (!ref) return false;
  const regex = /^KHI-\d{4}-\d{4}$/i;
  return regex.test(ref.trim());
}
