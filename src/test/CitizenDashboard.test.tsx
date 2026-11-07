import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../context/LanguageContext';
import { CitizenDashboard } from '../features/citizen/CitizenDashboard';

const renderDashboard = () => {
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <CitizenDashboard />
      </LanguageProvider>
    </MemoryRouter>
  );
};

describe('CitizenDashboard Component', () => {
  it('renders personal complaints overview with demonstration citizen context', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Your Complaints/i })).toBeInTheDocument();
      expect(screen.getAllByText(/Muhammad Bilal/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/KHI-2026-7842/i)).toBeInTheDocument();
      expect(screen.getByText(/KHI-2026-5120/i)).toBeInTheDocument();
    });
  });

  it('filters personal complaints in real-time when searching by text query', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/KHI-2026-7842/i)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search your complaints by reference or title/i);
    fireEvent.change(searchInput, { target: { value: 'Bijli' } });

    await waitFor(() => {
      // Electrical pole item should be visible
      expect(screen.getByText(/KHI-2026-5120/i)).toBeInTheDocument();
      // Water pipeline item should not be visible
      expect(screen.queryByText(/KHI-2026-7842/i)).not.toBeInTheDocument();
    });
  });

  it('shows empty search state with clear filter trigger when query finds no matches', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/KHI-2026-7842/i)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search your complaints by reference or title/i);
    fireEvent.change(searchInput, { target: { value: 'NonExistentXYZ' } });

    await waitFor(() => {
      expect(screen.getByText(/No personal complaints match/i)).toBeInTheDocument();
    });

    const clearLink = screen.getByText(/Clear search filter/i);
    fireEvent.click(clearLink);

    await waitFor(() => {
      expect(screen.getByText(/KHI-2026-7842/i)).toBeInTheDocument();
    });
  });
});
