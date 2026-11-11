import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LanguageProvider } from '../context/LanguageContext';
import { ComplaintForm } from '../features/citizen/ComplaintForm';

const renderForm = () =>
  render(
    <BrowserRouter>
      <LanguageProvider>
        <ComplaintForm />
      </LanguageProvider>
    </BrowserRouter>
  );

const navigateToStage2 = async () => {
  renderForm();
  fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Tariq Mehmood' } });
  fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '03001234567' } });
  fireEvent.click(screen.getByRole('button', { name: /continue/i }));
  await waitFor(() => {
    expect(screen.getByRole('heading', { level: 1, name: /where should we look/i })).toBeInTheDocument();
  });
};

describe('ComplaintForm professional interaction safeguards', () => {
  it('resolves locality changes without retaining a stale district', async () => {
    await navigateToStage2();

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
    await navigateToStage2();

    fireEvent.change(screen.getByLabelText(/area \/ locality/i), { target: { value: 'Goth Unlisted Rural Area' } });
    await waitFor(() => {
      expect(screen.getByText(/district needs confirmation/i)).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /karachi district/i })).toBeInTheDocument();
    });
  });

  it('keeps personal data client-only and supports an optional home address', async () => {
    await navigateToStage2();

    fireEvent.click(screen.getByRole('button', { name: /add home address/i }));
    const addressInput = screen.getByLabelText(/home address/i);
    fireEvent.change(addressInput, { target: { value: 'Private Street House 42' } });

    expect(addressInput).toHaveValue('Private Street House 42');
    expect(localStorage.getItem('applicantAddress')).toBeNull();
    expect(sessionStorage.getItem('applicantAddress')).toBeNull();
  });

  it('enforces 200-word limit safeguard on Stage 3 complaint description', async () => {
    await navigateToStage2();

    fireEvent.change(screen.getByLabelText(/area \/ locality/i), { target: { value: 'Saddar' } });
    await waitFor(() => expect(screen.getByDisplayValue(/District South/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /continue to complaint/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /tell us what happened/i })).toBeInTheDocument();
    });

    const description = screen.getByLabelText(/describe your complaint/i);
    const longText = Array.from({ length: 205 }, (_, i) => `word${i}`).join(' ');
    fireEvent.change(description, { target: { value: longText } });

    expect(screen.getByTestId('word-count-display')).toHaveTextContent('205');
    expect(screen.getByText(/exceeds the 200-word limit/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit complaint/i })).toBeDisabled();
  });
});
