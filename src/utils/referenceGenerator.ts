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

/**
 * Generate a CSPRNG-derived 24-digit numeric guest tracking code.
 * Grouped into 6 blocks of 4 digits for readable human inspection:
 * XXXX XXXX XXXX XXXX XXXX XXXX
 */
export function generateGuestTrackingNumber(): { raw: string; formatted: string } {
  const bytes = new Uint8Array(48);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  let digits = '';
  for (let i = 0; i < bytes.length && digits.length < 24; i++) {
    if (bytes[i] < 250) {
      digits += (bytes[i] % 10).toString();
    }
  }
  while (digits.length < 24) {
    digits += Math.floor(Math.random() * 10).toString();
  }
  const formatted = `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8, 12)} ${digits.slice(12, 16)} ${digits.slice(16, 20)} ${digits.slice(20, 24)}`;
  return { raw: digits, formatted };
}

/**
 * Format a 24-digit string into standard 4-digit groups.
 */
export function formatGuestTrackingNumber(numberOrDigits: string): string {
  const digits = numberOrDigits.replace(/\D/g, '').slice(0, 24);
  const groups = digits.match(/.{1,4}/g);
  return groups ? groups.join(' ') : digits;
}
