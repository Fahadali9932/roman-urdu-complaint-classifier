import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LanguageProvider, useLanguage } from '../context/LanguageContext';
import { ComplaintForm } from '../features/citizen/ComplaintForm';
import React from 'react';

const renderForm = () => render(<BrowserRouter><LanguageProvider><ComplaintForm /></LanguageProvider></BrowserRouter>);

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  React.useEffect(() => { if (language !== 'ur') setLanguage('ur'); }, [language, setLanguage]);
  return null;
};

describe('Simplified Write your complaint flow', () => {
  it('renders a light three-step form with a thick progress bar and no subject input', () => {
    renderForm();
    expect(screen.getByRole('heading', { level: 1, name: /write your complaint/i })).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '12');
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/subject/i)).not.toBeInTheDocument();
  });

  it('validates contact details before advancing to the location stage', async () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(await screen.findByText(/enter your full name/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Fatima Noor' } });
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '03001234567' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(await screen.findByRole('heading', { level: 2, name: /tell us where/i })).toBeInTheDocument();
  });

  it('requires mandatory home address before advancing from location stage', async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Fatima Noor' } });
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '03001234567' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    await screen.findByRole('heading', { level: 2, name: /tell us where/i });

    const locality = screen.getByLabelText(/area \/ locality/i);
    fireEvent.change(locality, { target: { value: 'Clifton' } });
    fireEvent.change(screen.getByLabelText(/street, block or nearby landmark/i), { target: { value: 'Block 4' } });

    // Attempt to continue without home address
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(await screen.findByText(/enter your home address/i)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: /describe what happened/i })).not.toBeInTheDocument();

    // Fill home address and advance
    fireEvent.change(screen.getByLabelText(/home address/i), { target: { value: 'House 12-B, Clifton Block 4' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(await screen.findByRole('heading', { level: 2, name: /describe what happened/i })).toBeInTheDocument();
  });

  it('keeps the resolver and privacy boundary, then opens the verified confirmation outcome', async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Fatima Noor' } });
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '03129876543' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    const locality = await screen.findByLabelText(/area \/ locality/i);
    fireEvent.change(locality, { target: { value: 'DHA Phase 6' } });
    expect(await screen.findByText(/automatically identified/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/street, block or nearby landmark/i), { target: { value: '26th Street' } });
    fireEvent.change(screen.getByLabelText(/home address/i), { target: { value: 'House 42-A, Street 26, Phase 6' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(await screen.findByRole('heading', { level: 2, name: /describe what happened/i })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/complaint description/i), { target: { value: 'The streetlight has not worked for two weeks.' } });
    expect(screen.getByTestId('word-count-display')).toHaveTextContent('8');
    fireEvent.click(screen.getByRole('button', { name: /submit complaint/i }));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    expect(screen.getByText(/case reference number/i)).toBeInTheDocument();
    expect(screen.queryByText(/no real complaint was delivered/i)).not.toBeInTheDocument();
    expect(screen.queryByText('03129876543')).not.toBeInTheDocument();
    expect(screen.queryByText('House 42-A, Street 26, Phase 6')).not.toBeInTheDocument();
  });

  it('preserves the Urdu RTL experience', async () => {
    render(<BrowserRouter><LanguageProvider><LanguageSwitcher /><ComplaintForm /></LanguageProvider></BrowserRouter>);
    expect(await screen.findByRole('heading', { level: 1, name: /اپنی شکایت درج کریں/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/پورا نام/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /آگے بڑھیں/i })).toBeInTheDocument();
  });
});
