import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../context/LanguageContext';
import { ComplaintTracker } from '../features/citizen/ComplaintTracker';
import { complaintService } from '../services';

describe('AWAAZ-E-AWAM — Gate C: One-Number 24-Digit Guest Tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the 24-digit tracking input by default with security copy', () => {
    render(
      <MemoryRouter initialEntries={['/track']}>
        <LanguageProvider>
          <ComplaintTracker />
        </LanguageProvider>
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/Tracking number \(24 digits\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Check status/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Your personal details are never exposed/i)
    ).toBeInTheDocument();
  });

  it('formats digits into 4-character chunks and rejects incomplete input', async () => {
    render(
      <MemoryRouter initialEntries={['/track']}>
        <LanguageProvider>
          <ComplaintTracker />
        </LanguageProvider>
      </MemoryRouter>
    );

    const input = screen.getByLabelText(/Tracking number/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '804172639150' } });
    expect(input.value).toBe('8041 7263 9150');

    const submitBtn = screen.getByRole('button', { name: /Check status/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Please enter a complete 24-digit tracking number/i)
      ).toBeInTheDocument();
    });
  });

  it('shows friendly helper when pasting a CLM claim code into the tracking input', () => {
    render(
      <MemoryRouter initialEntries={['/track']}>
        <LanguageProvider>
          <ComplaintTracker />
        </LanguageProvider>
      </MemoryRouter>
    );

    const input = screen.getByLabelText(/Tracking number/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'CLM-ABCD-EFGH-JKLM' } });

    expect(
      screen.getByText(/This looks like a private claim code/i)
    ).toBeInTheDocument();
  });

  it('displays minimal public status with ZERO PII when tracking succeeds', async () => {
    vi.spyOn(complaintService, 'trackGuestComplaint').mockResolvedValueOnce({
      found: true,
      public_status: 'in_progress',
      display_status: 'Work started',
      public_category: 'Roads & Infrastructure',
      submitted_at: '2026-11-16T08:00:00Z',
      updated_at: '2026-11-16T09:30:00Z',
      public_updates: [
        { status: 'submitted', at: '2026-11-16T08:00:00Z', message: 'We received your complaint.' },
        { status: 'in_progress', at: '2026-11-16T09:30:00Z', message: 'The department has started work.' },
      ],
    });

    render(
      <MemoryRouter initialEntries={['/track']}>
        <LanguageProvider>
          <ComplaintTracker />
        </LanguageProvider>
      </MemoryRouter>
    );

    const input = screen.getByLabelText(/Tracking number/i);
    fireEvent.change(input, { target: { value: '804172639150284603716628' } });

    const submitBtn = screen.getByRole('button', { name: /Check status/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Work started')).toBeInTheDocument();
      expect(screen.getByText('Roads & Infrastructure')).toBeInTheDocument();
      expect(screen.getByText('The department has started work.')).toBeInTheDocument();
    });

    // Zero PII audit: ensure no sensitive keys are rendered in the document
    expect(screen.queryByText(/Phone/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Email/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Address/i)).not.toBeInTheDocument();
  });
});
