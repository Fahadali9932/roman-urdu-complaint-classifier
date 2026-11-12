import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LanguageProvider } from '../context/LanguageContext';
import { ComplaintForm } from '../features/citizen/ComplaintForm';

const renderForm = () => render(<BrowserRouter><LanguageProvider><ComplaintForm /></LanguageProvider></BrowserRouter>);

const reachLocation = async () => {
  renderForm();
  fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Tariq Mehmood' } });
  fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '03001234567' } });
  fireEvent.click(screen.getByRole('button', { name: /continue/i }));
  await screen.findByRole('heading', { level: 2, name: /tell us where/i });
};

describe('Complaint form safeguards', () => {
  it('resolves locality changes without retaining a stale district', async () => {
    await reachLocation();
    const locality = screen.getByLabelText(/area \/ locality/i);
    fireEvent.change(locality, { target: { value: 'Federal B Area' } });
    await waitFor(() => expect(screen.getByTestId('resolved-district')).toHaveTextContent(/district central/i));
    fireEvent.change(locality, { target: { value: 'DHA Phase 6' } });
    await waitFor(() => expect(screen.getByTestId('resolved-district')).toHaveTextContent(/district south/i));
  });

  it('asks for manual district confirmation for an unknown locality', async () => {
    await reachLocation();
    fireEvent.change(screen.getByLabelText(/area \/ locality/i), { target: { value: 'Goth Unlisted Rural Area' } });
    await waitFor(() => expect(screen.getByRole('combobox', { name: /karachi district/i })).toBeInTheDocument());
  });

  it('keeps a home address client-only', async () => {
    await reachLocation();
    fireEvent.change(screen.getByLabelText(/home address/i), { target: { value: 'Private Street House 42' } });
    expect(screen.getByLabelText(/home address/i)).toHaveValue('Private Street House 42');
    expect(localStorage.getItem('applicantAddress')).toBeNull();
    expect(sessionStorage.getItem('applicantAddress')).toBeNull();
  });

  it('requires a home address before proceeding from the location stage', async () => {
    await reachLocation();
    fireEvent.change(screen.getByLabelText(/area \/ locality/i), { target: { value: 'Saddar' } });
    fireEvent.change(screen.getByLabelText(/street, block or nearby landmark/i), { target: { value: 'Frere Road' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    expect(screen.getByText(/enter your home address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/home address/i)).toHaveFocus();
    expect(screen.queryByLabelText(/complaint description/i)).not.toBeInTheDocument();
  });

  it('enforces the 200-word description limit', async () => {
    await reachLocation();
    fireEvent.change(screen.getByLabelText(/area \/ locality/i), { target: { value: 'Saddar' } });
    fireEvent.change(screen.getByLabelText(/street, block or nearby landmark/i), { target: { value: 'Frere Road' } });
    fireEvent.change(screen.getByLabelText(/home address/i), { target: { value: 'House 99, Saddar' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    const description = await screen.findByLabelText(/complaint description/i);
    fireEvent.change(description, { target: { value: Array.from({ length: 205 }, (_, index) => `word${index}`).join(' ') } });
    expect(screen.getByTestId('word-count-display')).toHaveTextContent('205');
    expect(screen.getByText(/within 200 words/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit complaint/i })).toBeDisabled();
  });
});
