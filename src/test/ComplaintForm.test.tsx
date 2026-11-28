import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LanguageProvider, useLanguage } from '../context/LanguageContext';
import { ComplaintForm } from '../features/citizen/ComplaintForm';
import React from 'react';

const renderForm = () => render(<BrowserRouter><LanguageProvider><ComplaintForm /></LanguageProvider></BrowserRouter>);

const mockGeolocation = (lat = 24.8607, lon = 67.0011, error?: { code: number; message: string }) => {
  Object.defineProperty(navigator, 'geolocation', {
    writable: true,
    configurable: true,
    value: {
      getCurrentPosition: (success: any, failure: any) => {
        if (error) {
          failure?.(error);
        } else {
          success?.({
            coords: {
              latitude: lat,
              longitude: lon,
              accuracy: 10,
            },
          });
        }
      },
      watchPosition: vi.fn(),
      clearWatch: vi.fn(),
    },
  });
};

const captureCameraPhoto = async () => {
  const startBtn = screen.getByRole('button', { name: /capture photo|تصویر کھینچیں/i });
  fireEvent.click(startBtn);

  const snapBtn = await screen.findByRole('button', { name: /^capture$|^تصویر لیں$/i });
  fireEvent.click(snapBtn);

  const useBtn = await screen.findByRole('button', { name: /use photo|تصویر استعمال کریں/i });
  fireEvent.click(useBtn);

  await screen.findByText(/photo captured\.|تصویر محفوظ ہو گئی۔/i);
};

const attachLiveLocation = async (lat = 24.8138, lon = 67.0300) => {
  mockGeolocation(lat, lon);
  const addBtn = screen.getByRole('button', { name: /add location|مقام شامل کریں|update location|مقام تبدیل کریں/i });
  fireEvent.click(addBtn);
  await screen.findByText(/location attached\.|مقام منسلک ہو گیا۔/i);
};

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  React.useEffect(() => { if (language !== 'ur') setLanguage('ur'); }, [language, setLanguage]);
  return null;
};

describe('Simplified Write your complaint flow', () => {
  it('renders a light four-step form with a thick progress bar and no subject input', () => {
    renderForm();
    expect(screen.getByRole('heading', { level: 1, name: /write your complaint/i })).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '8');
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/subject/i)).not.toBeInTheDocument();
  });

  it('validates contact details and requires photo before advancing to the location stage', async () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(await screen.findByText(/enter your full name/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Fatima Noor' } });
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '03001234567' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // Stage 2: Photo Capture
    expect(await screen.findByRole('heading', { level: 2, name: /capture or attach/i })).toBeInTheDocument();
    // Continue button is disabled without photo
    const continueBtn = screen.getByRole('button', { name: /continue/i });
    expect(continueBtn).toBeDisabled();

    // Capture valid photo via camera flow and proceed
    await captureCameraPhoto();
    expect(continueBtn).not.toBeDisabled();
    fireEvent.click(continueBtn);

    // Stage 3: Location
    expect(await screen.findByRole('heading', { level: 2, name: /tell us where/i })).toBeInTheDocument();
  });

  it('requires mandatory home address and mandatory live location before advancing from location stage', async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Fatima Noor' } });
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '03001234567' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    await screen.findByRole('heading', { level: 2, name: /capture or attach/i });
    await captureCameraPhoto();
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    await screen.findByRole('heading', { level: 2, name: /tell us where/i });

    const locality = screen.getByLabelText(/area \/ locality/i);
    fireEvent.change(locality, { target: { value: 'Clifton' } });
    fireEvent.change(screen.getByLabelText(/street, block or nearby landmark/i), { target: { value: 'Block 4' } });

    // Location continue button is disabled until location is attached
    const continueBtn = screen.getByRole('button', { name: /continue/i });
    expect(continueBtn).toBeDisabled();

    // Attempt to attach location outside Sindh -> blocked
    mockGeolocation(33.6844, 73.0479);
    const addBtn = screen.getByRole('button', { name: /add location/i });
    fireEvent.click(addBtn);
    expect(await screen.findByTestId('outside-sindh-alert')).toHaveTextContent(/outside our service area/i);
    expect(continueBtn).toBeDisabled();

    // Enter valid Sindh location & home address
    fireEvent.change(screen.getByLabelText(/home address/i), { target: { value: 'House 12-B, Clifton Block 4' } });
    await attachLiveLocation(24.8138, 67.0300);

    expect(continueBtn).not.toBeDisabled();
    fireEvent.click(continueBtn);
    expect(await screen.findByRole('heading', { level: 2, name: /describe what happened/i })).toBeInTheDocument();
  });

  it('keeps the resolver and privacy boundary, then opens the verified confirmation outcome', async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Fatima Noor' } });
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '03129876543' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    await screen.findByRole('heading', { level: 2, name: /capture or attach/i });
    await captureCameraPhoto();
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    const locality = await screen.findByLabelText(/area \/ locality/i);
    fireEvent.change(locality, { target: { value: 'DHA Phase 6' } });
    expect(await screen.findByText(/automatically identified/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/street, block or nearby landmark/i), { target: { value: '26th Street' } });
    fireEvent.change(screen.getByLabelText(/home address/i), { target: { value: 'House 42-A, Street 26, Phase 6' } });
    
    await attachLiveLocation(24.8138, 67.0300);
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    expect(await screen.findByRole('heading', { level: 2, name: /describe what happened/i })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/complaint description/i), { target: { value: 'The streetlight has not worked for two weeks.' } });
    expect(screen.getByTestId('word-count-display')).toHaveTextContent('8');
    fireEvent.click(screen.getByRole('button', { name: /submit complaint/i }));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    expect(screen.getByText(/tracking code/i)).toBeInTheDocument();
    expect(screen.queryByText(/case reference number/i)).not.toBeInTheDocument();
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
