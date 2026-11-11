import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LanguageProvider } from '../context/LanguageContext';
import { ComplaintForm } from '../features/citizen/ComplaintForm';

const renderForm = () => render(<BrowserRouter><LanguageProvider><ComplaintForm /></LanguageProvider></BrowserRouter>);

const fillIssueAndLocation = () => {
  fireEvent.change(screen.getByLabelText(/complaint subject \/ title/i), { target: { value: 'Broken drainage cover' } });
  fireEvent.change(screen.getByLabelText(/complaint description/i), { target: { value: 'Main gutter ka dhakkan toota hua hai.' } });
  fireEvent.change(screen.getByLabelText(/area \/ locality/i), { target: { value: 'DHA Phase 6' } });
  fireEvent.change(screen.getByLabelText(/public issue location/i), { target: { value: 'Near Boat Basin' } });
};

describe('ComplaintForm compact intake', () => {
  it('combines issue and location into one first phase with honest detail progress', async () => {
    renderForm();
    expect(screen.getByRole('heading', { level: 1, name: /make the issue clear/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /start with what happened and where/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/complaint subject \/ title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/area \/ locality/i)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');

    fillIssueAndLocation();
    await waitFor(() => expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2'));
    expect(screen.getByDisplayValue(/District South/i)).toBeInTheDocument();
  });

  it('preserves exact required-field and 200-word validation before continuing', async () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: /add contact details/i }));
    await waitFor(() => {
      expect(screen.getByText(/subject is required/i)).toBeInTheDocument();
      expect(screen.getByText(/locality\/area is required/i)).toBeInTheDocument();
    });

    const description = screen.getByLabelText(/complaint description/i);
    fireEvent.change(description, { target: { value: Array.from({ length: 201 }, (_, index) => `word${index}`).join(' ') } });
    expect(screen.getByTestId('word-count-display')).toHaveTextContent('201');
    expect(screen.getByRole('button', { name: /add contact details/i })).toBeDisabled();
  });

  it('opens one editable, non-submitting review sheet after the two concise phases', async () => {
    renderForm();
    fillIssueAndLocation();
    fireEvent.click(screen.getByRole('button', { name: /add contact details/i }));
    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: /add a way to reach you/i })).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Amina Khan' } });
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '03001234567' } });
    fireEvent.click(screen.getByRole('button', { name: /open review/i }));

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    expect(screen.getByText(/nothing has been submitted/i)).toBeInTheDocument();
    expect(screen.queryByText('03001234567')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /edit issue or location/i }));
    expect(screen.getByLabelText(/complaint subject \/ title/i)).toHaveValue('Broken drainage cover');
  });
});
