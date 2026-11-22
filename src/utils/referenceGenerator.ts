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

/** 60-bit claim secret for the local demonstration adapter (12 base32 symbols). */
export function generateClaimCode(): string {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  if (typeof globalThis.crypto?.getRandomValues !== 'function') {
    throw new Error('Secure random number generation is unavailable on this device.');
  }
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const characters = Array.from(bytes, (byte) => alphabet[byte & 31]).join('');
  return `CLM-${characters.slice(0, 4)}-${characters.slice(4, 8)}-${characters.slice(8, 12)}`;
}

/**
 * Generate a CSPRNG-derived 24-digit numeric guest tracking code.
 * Grouped into 6 blocks of 4 digits for readable human inspection:
 * XXXX XXXX XXXX XXXX XXXX XXXX
 */
export function generateGuestTrackingNumber(): { raw: string; formatted: string } {
  // A guest tracking number is an access secret. Never silently degrade to
  // Math.random(), which is predictable and unsuitable for bearer credentials.
  if (typeof globalThis.crypto?.getRandomValues !== 'function') {
    throw new Error('Secure random number generation is unavailable on this device.');
  }
  let digits = '';
  // Rejection sampling avoids modulo bias while producing 24 decimal digits.
  // Three full batches are ample; failure is safer than a weak fallback.
  for (let batch = 0; batch < 3 && digits.length < 24; batch++) {
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(48));
    for (const byte of bytes) {
      if (byte < 250) {
        digits += (byte % 10).toString();
        if (digits.length === 24) break;
      }
    }
  }
  if (digits.length !== 24) {
    throw new Error('Unable to generate a secure guest tracking number.');
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
