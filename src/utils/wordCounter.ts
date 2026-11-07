/**
 * Utility for counting words across English, Roman Urdu, and Nastaliq Urdu script.
 * Enforces the strict 200-word limit required for complaints.
 */

export const MAX_COMPLAINT_WORDS = 200;

export function countWords(text: string): number {
  if (!text || !text.trim()) {
    return 0;
  }

  // Split on any whitespace sequence, including tabs and newlines
  const words = text.trim().split(/\s+/);
  return words.filter((word) => word.length > 0).length;
}

export interface WordLimitValidation {
  isValid: boolean;
  count: number;
  remaining: number;
  maxWords: number;
  percentage: number;
}

export function validateWordLimit(
  text: string,
  maxWords: number = MAX_COMPLAINT_WORDS
): WordLimitValidation {
  const count = countWords(text);
  const remaining = maxWords - count;
  const percentage = Math.min(Math.round((count / maxWords) * 100), 100);

  return {
    isValid: count > 0 && count <= maxWords,
    count,
    remaining,
    maxWords,
    percentage,
  };
}
