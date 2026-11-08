import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../context/LanguageContext';
import { CitizenDashboard } from '../features/citizen/CitizenDashboard';

describe('CitizenDashboard Component', () => {
  it('shows an honest empty state without example complaint folders', () => {
    render(
      <MemoryRouter>
        <LanguageProvider>
          <CitizenDashboard />
        </LanguageProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /your complaints/i })).toBeInTheDocument();
    expect(screen.getByText(/no complaints yet/i)).toBeInTheDocument();
    expect(screen.getByText(/does not send or save complaints yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/KHI-2026-/i)).not.toBeInTheDocument();
  });
});
