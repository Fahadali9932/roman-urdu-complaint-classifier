import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LanguageProvider } from '../context/LanguageContext';
import { ComplaintForm } from '../features/citizen/ComplaintForm';

const renderForm = () => render(<BrowserRouter><LanguageProvider><ComplaintForm /></LanguageProvider></BrowserRouter>);

describe('ComplaintForm professional interaction safeguards', () => {
  it('resolves locality changes without retaining a stale district', async () => {
    renderForm();
    const locality = screen.getByLabelText(/area \/ locality/i);
    fireEvent.change(locality, { target: { value: 'Federal B Area' } });
    await waitFor(() => expect(screen.getByDisplayValue(/District Central/i)).toBeInTheDocument());
    fireEvent.change(locality, { target: { value: 'DHA Phase 6' } });
    await waitFor(() => {
      expect(screen.queryByDisplayValue(/District Central/i)).not.toBeInTheDocument();
      expect(screen.getByDisplayValue(/District South/i)).toBeInTheDocument();
    });
  });

  it('asks for district confirmation for an ambiguous manual locality', async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText(/area \/ locality/i), { target: { value: 'Goth Unlisted Rural Area' } });
    await waitFor(() => {
      expect(screen.getByText(/district needs confirmation/i)).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /karachi district/i })).toBeInTheDocument();
    });
  });

  it('keeps personal data client-only and supports an optional address', async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText(/complaint subject \/ title/i), { target: { value: 'Streetlight fault' } });
    fireEvent.change(screen.getByLabelText(/complaint description/i), { target: { value: 'Streetlight has been out for two days.' } });
    fireEvent.change(screen.getByLabelText(/area \/ locality/i), { target: { value: 'Clifton Block 2' } });
    fireEvent.change(screen.getByLabelText(/public issue location/i), { target: { value: 'Near Boat Basin' } });
    fireEvent.click(screen.getByRole('button', { name: /add contact details/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /add residential address/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /add residential address/i }));
    fireEvent.change(screen.getByLabelText(/applicant address/i), { target: { value: 'Private Street House 42' } });
    expect(screen.getByLabelText(/applicant address/i)).toHaveValue('Private Street House 42');
    expect(localStorage.getItem('applicantAddress')).toBeNull();
    expect(sessionStorage.getItem('applicantAddress')).toBeNull();
  });
});
