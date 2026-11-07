import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LanguageProvider } from '../context/LanguageContext';
import { ComplaintTracker } from '../features/citizen/ComplaintTracker';

const renderTracker = (initialPath = '/track/KHI-2026-7842') => {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <LanguageProvider>
        <Routes>
          <Route path="/track" element={<ComplaintTracker />} />
          <Route path="/track/:referenceNumber" element={<ComplaintTracker />} />
        </Routes>
      </LanguageProvider>
    </MemoryRouter>
  );
};

describe('ComplaintTracker Component', () => {
  it('renders complaint details for default sample reference number', async () => {
    renderTracker('/track/KHI-2026-7842');

    await waitFor(() => {
      expect(screen.getAllByText('KHI-2026-7842').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Pani ki main line leak aur supply bandish/i)).toBeInTheDocument();
      expect(screen.getByText(/Karachi Water & Sewerage Corporation/i)).toBeInTheDocument();
      expect(screen.getByText(/District East/i)).toBeInTheDocument();
      expect(screen.getByText(/Event History & Timeline/i)).toBeInTheDocument();
    });
  });

  it('displays not found message when reference number does not exist', async () => {
    renderTracker('/track/KHI-9999-0000');

    await waitFor(() => {
      expect(screen.getByText(/No complaint found with reference number/i)).toBeInTheDocument();
      expect(screen.getByText('KHI-9999-0000')).toBeInTheDocument();
    });
  });

  it('switches to another complaint when clicking a sample reference button', async () => {
    renderTracker('/track/KHI-2026-7842');

    await waitFor(() => {
      expect(screen.getByText(/Pani ki main line leak aur supply bandish/i)).toBeInTheDocument();
    });

    const sampleButtons = screen.getAllByRole('button', { name: 'KHI-2026-3914' });
    fireEvent.click(sampleButtons[0]);

    await waitFor(() => {
      expect(screen.getAllByText('KHI-2026-3914').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Kachray ke dher aur garbage collection ghayab/i)).toBeInTheDocument();
      expect(screen.getByText(/Sindh Solid Waste Management Board/i)).toBeInTheDocument();
    });
  });
});
