import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { PublicFooter } from '../components/layout/PublicFooter';
import { LanguageProvider } from '../context/LanguageContext';

describe('PublicFooter Component', () => {
  it('renders one-line desktop headline YOUR VOICE MATTERS without duplicate CTA buttons', () => {
    const { container } = render(
      <LanguageProvider>
        <BrowserRouter>
          <PublicFooter />
        </BrowserRouter>
      </LanguageProvider>
    );

    const headline = screen.getByRole('heading', { level: 2, name: /YOUR VOICE MATTERS\./i });
    expect(headline).toBeInTheDocument();
    expect(headline.className).toContain('font-display');

    // Asserts no promotional CTA buttons exist in footer
    const primaryCtas = container.querySelectorAll('.footer-cta-primary');
    expect(primaryCtas.length).toBe(0);

    // Asserts minimal navigation links exist
    expect(screen.getByRole('link', { name: /about us/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /how it works/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /my complaints/i })).toBeInTheDocument();

    // Asserts concise academic attribution
    expect(screen.getByText(/greenwich university/i)).toBeInTheDocument();
    expect(screen.getByText(/final year project • greenwich university/i)).toBeInTheDocument();
  });
});
