import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { LandingPage } from '../features/landing/LandingPage';
import { LanguageProvider } from '../context/LanguageContext';

describe('LandingPage Component', () => {
  it('renders refined WRITE section with PUT IT IN WORDS and zero promotional CTAs', () => {
    const { container } = render(
      <LanguageProvider>
        <BrowserRouter>
          <LandingPage />
        </BrowserRouter>
      </LanguageProvider>
    );

    // Hero contains primary action
    const heroSection = container.querySelector('#hero');
    expect(heroSection).toBeInTheDocument();

    // Write-intro section
    const writeIntro = container.querySelector('#write-intro');
    expect(writeIntro).toBeInTheDocument();
    // The sticky sheet needs a real viewport-sized canvas; without this the
    // editorial content sits at the top and leaves a large blank lower half.
    expect(writeIntro).toHaveClass('min-h-[100svh]');

    // Check WRITE headline
    const writeHeading = screen.getByRole('heading', { level: 2, name: /PUT IT IN WORDS\./i });
    expect(writeHeading).toBeInTheDocument();

    // Ensure NO promotional CTA buttons in writeIntro
    const writeIntroLinks = writeIntro?.querySelectorAll('a');
    expect(writeIntroLinks?.length || 0).toBe(0);

    // Ensure architectural ghosted background typography exists
    expect(writeIntro?.textContent).toContain('WRITE');
    expect(writeIntro?.querySelector('[aria-hidden="true"]')).toHaveClass('top-1/2');
  });
});
