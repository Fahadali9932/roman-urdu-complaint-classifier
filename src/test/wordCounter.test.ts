import { describe, it, expect } from 'vitest';
import { countWords, validateWordLimit, MAX_COMPLAINT_WORDS } from '../utils/wordCounter';

describe('wordCounter utility', () => {
  it('returns 0 for empty or whitespace-only strings', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   ')).toBe(0);
    expect(countWords('\n\t  \n')).toBe(0);
  });

  it('counts English words correctly regardless of extra spacing', () => {
    const text = 'Water supply  pipeline is completely broken on   main road.';
    expect(countWords(text)).toBe(9);
  });

  it('counts Roman Urdu words correctly', () => {
    const romanUrduText = 'Hamare mohallay mein pichlay char din se paani ki supply mukammal band hai.';
    expect(countWords(romanUrduText)).toBe(13);
  });

  it('counts Urdu script words correctly', () => {
    const urduScriptText = 'ہمارے علاقے میں پانی کی شدید قلت ہے۔';
    expect(countWords(urduScriptText)).toBe(8);
  });

  it('validates word limit within threshold', () => {
    const text = 'Sewerage line leak in Gulshan Block 7.';
    const validation = validateWordLimit(text, 200);

    expect(validation.isValid).toBe(true);
    expect(validation.count).toBe(7);
    expect(validation.remaining).toBe(193);
    expect(validation.maxWords).toBe(200);
  });

  it('detects when words exceed the maximum 200 words limit', () => {
    // Generate string with 205 words
    const wordsArray = Array.from({ length: 205 }, (_, i) => `word${i}`);
    const overLimitText = wordsArray.join(' ');

    const validation = validateWordLimit(overLimitText, MAX_COMPLAINT_WORDS);
    expect(validation.isValid).toBe(false);
    expect(validation.count).toBe(205);
    expect(validation.remaining).toBe(-5);
  });
});
