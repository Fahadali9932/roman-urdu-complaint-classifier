import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LanguageProvider } from '../context/LanguageContext';
import { ComplaintTracker } from '../features/citizen/ComplaintTracker';

describe('ComplaintTracker Component', () => {
  it('keeps the tracking route honest until saved complaints are available', () => {
    render(
      <MemoryRouter initialEntries={['/track/KHI-2026-7842']}>
        <LanguageProvider>
          <Routes>
            <Route path="/track/:referenceNumber" element={<ComplaintTracker />} />
          </Routes>
        </LanguageProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /complaint progress/i })).toBeInTheDocument();
    expect(screen.getByText(/when complaints can be sent and saved/i)).toBeInTheDocument();
    expect(screen.queryByText(/KHI-2026-7842/i)).not.toBeInTheDocument();
  });
});
