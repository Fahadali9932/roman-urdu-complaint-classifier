import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageProvider, useLanguage } from '../context/LanguageContext';
import { LanguageToggle } from '../components/common/LanguageToggle';

// Helper component that displays translated label
const TestConsumer = () => {
  const { t, language, isRTL } = useLanguage();
  return (
    <div>
      <LanguageToggle />
      <span data-testid="current-lang">{language}</span>
      <span data-testid="is-rtl">{isRTL ? 'rtl' : 'ltr'}</span>
      <h1 data-testid="hero-heading">{t('heroTitle')}</h1>
    </div>
  );
};

describe('LanguageToggle and LanguageContext', () => {
  beforeEach(() => {
    document.documentElement.setAttribute('dir', 'ltr');
    document.documentElement.setAttribute('lang', 'en');
  });

  it('initializes in English by default with LTR layout', () => {
    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    );

    expect(screen.getByTestId('current-lang').textContent).toBe('en');
    expect(screen.getByTestId('is-rtl').textContent).toBe('ltr');
    expect(document.documentElement.getAttribute('dir')).toBe('ltr');
    expect(document.documentElement.getAttribute('lang')).toBe('en');
    expect(screen.getByTestId('hero-heading').textContent).toContain('Speak in Your Voice');
  });

  it('switches to Urdu and updates document direction to RTL on toggle click', () => {
    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    );

    const toggleButton = screen.getByRole('button', { name: /toggle interface language/i });
    fireEvent.click(toggleButton);

    expect(screen.getByTestId('current-lang').textContent).toBe('ur');
    expect(screen.getByTestId('is-rtl').textContent).toBe('rtl');
    expect(document.documentElement.getAttribute('dir')).toBe('rtl');
    expect(document.documentElement.getAttribute('lang')).toBe('ur');
    expect(screen.getByTestId('hero-heading').textContent).toContain('آپ کی اپنی زبان');
  });
});
