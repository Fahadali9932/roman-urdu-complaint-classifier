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
  it('renders stats overview and list of complaints', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Citizen Overview Dashboard/i })).toBeInTheDocument();
      expect(screen.getByText(/Total Logged/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Under Review/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/KHI-2026-7842/i)).toBeInTheDocument();
    });
  });

  it('filters complaints in real-time when searching by text query', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/KHI-2026-7842/i)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search by reference, title, or locality/i);
    fireEvent.change(searchInput, { target: { value: 'Korangi' } });

    await waitFor(() => {
      // Korangi item should be visible
      expect(screen.getByText(/KHI-2026-3914/i)).toBeInTheDocument();
      // Gulshan / Water pipeline item should not be visible
      expect(screen.queryByText(/KHI-2026-7842/i)).not.toBeInTheDocument();
    });
  });

  it('shows empty state with clear filters button when search finds no matches', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/KHI-2026-7842/i)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search by reference, title, or locality/i);
    fireEvent.change(searchInput, { target: { value: 'NonExistentPlaceXYZ' } });

    await waitFor(() => {
      expect(screen.getByText(/No Complaints Found/i)).toBeInTheDocument();
    });

    const clearButton = screen.getByRole('button', { name: /Clear Filters/i });
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(screen.getByText(/KHI-2026-7842/i)).toBeInTheDocument();
    });
  });
});
