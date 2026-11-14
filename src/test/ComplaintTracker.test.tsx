import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LanguageProvider } from '../context/LanguageContext';
import { ComplaintTracker } from '../features/citizen/ComplaintTracker';

describe('ComplaintTracker Component', () => {
  it('requires the private claim code and account sign-in before tracking a guest complaint', () => {
    render(
      <MemoryRouter initialEntries={['/track/KHI-2026-7842']}>
        <LanguageProvider>
          <Routes>
            <Route path="/track/:referenceNumber" element={<ComplaintTracker />} />
          </Routes>
        </LanguageProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /track complaint/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/complaint reference number/i)).toHaveValue('KHI-2026-7842');
    expect(screen.getByLabelText(/private claim code/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in to claim and track/i })).toBeInTheDocument();
  });
});
