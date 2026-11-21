import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LanguageProvider } from '../context/LanguageContext';
import { ComplaintTracker } from '../features/citizen/ComplaintTracker';

describe('ComplaintTracker Component', () => {
  it('keeps only one 24-digit tracking method, even on legacy reference URLs', () => {
    render(
      <MemoryRouter initialEntries={['/track/KHI-2026-7842']}>
        <LanguageProvider>
          <Routes>
            <Route path="/track/:referenceNumber" element={<ComplaintTracker />} />
          </Routes>
        </LanguageProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /track your complaint/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/24-digit tracking number/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /claim to account/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/private claim code/i)).not.toBeInTheDocument();
  });
});
