import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';
import { LanguageProvider, useLanguage } from '../context/LanguageContext';
import { ComplaintForm } from '../features/citizen/ComplaintForm';
import { CitizenDashboard } from '../features/citizen/CitizenDashboard';
import { complaintService } from '../services';

const renderWithContext = (ui: React.ReactNode) =>
  render(
    <BrowserRouter>
      <LanguageProvider>{ui}</LanguageProvider>
    </BrowserRouter>
  );

const mockGeolocation = (lat = 24.8607, lon = 67.0011) => {
  Object.defineProperty(navigator, 'geolocation', {
    writable: true,
    configurable: true,
    value: {
      getCurrentPosition: (success: any) =>
        success({
          coords: {
            latitude: lat,
            longitude: lon,
            accuracy: 10,
          },
        }),
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

const attachLiveLocation = async (lat = 24.8607, lon = 67.0011) => {
  mockGeolocation(lat, lon);
  const addBtn = screen.getByRole('button', { name: /add location|مقام شامل کریں|update location|مقام تبدیل کریں/i });
  fireEvent.click(addBtn);
  await screen.findByText(/location attached\.|مقام منسلک ہو گیا۔/i);
};

const UrduSwitcher: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  React.useEffect(() => {
    if (language !== 'ur') setLanguage('ur');
  }, [language, setLanguage]);
  return null;
};

describe('AWAAZ-E-AWAM — Guest Complaint Submission & Ownership Claiming', () => {
  it('displays the exact English informational notice on Step 3 above description', async () => {
    renderWithContext(<ComplaintForm />);

    // Step 1: Fill applicant details
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Tariq Mehmood' } });
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '03001234567' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // Step 2: Camera capture
    await screen.findByRole('heading', { level: 2, name: /capture or attach/i });
    await captureCameraPhoto();
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // Step 3: Fill location
    const locality = await screen.findByLabelText(/area \/ locality/i);
    fireEvent.change(locality, { target: { value: 'Gulshan-e-Iqbal' } });
    fireEvent.change(screen.getByLabelText(/street, block or nearby landmark/i), { target: { value: 'Block 13-D' } });
    fireEvent.change(screen.getByLabelText(/home address/i), { target: { value: 'Flat 402, Block 13-D' } });
    await attachLiveLocation(24.9056, 67.0822);
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // Step 4: Verify informational notice
    await screen.findByRole('heading', { level: 2, name: /describe what happened/i });
    const notice = screen.getByTestId('guest-submission-notice');
    expect(notice).toBeInTheDocument();
    expect(screen.getByText(/no account required to submit a complaint\./i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /save the private 24-digit tracking number on your receipt/i
      )
    ).toBeInTheDocument();
  });

  it('displays the exact Urdu informational notice on Step 3 above description', async () => {
    render(
      <BrowserRouter>
        <LanguageProvider>
          <UrduSwitcher />
          <ComplaintForm />
        </LanguageProvider>
      </BrowserRouter>
    );

    // Step 1: Fill applicant details
    fireEvent.change(await screen.findByLabelText(/پورا نام/i), { target: { value: 'طارق محمود' } });
    fireEvent.change(screen.getByLabelText(/موبائل نمبر/i), { target: { value: '03001234567' } });
    fireEvent.click(screen.getByRole('button', { name: /آگے بڑھیں/i }));

    // Step 2: Camera capture
    await screen.findByRole('heading', { level: 2, name: /مسئلے کی تصویر/i });
    await captureCameraPhoto();
    fireEvent.click(screen.getByRole('button', { name: /آگے بڑھیں/i }));

    // Step 3: Fill location
    const locality = await screen.findByLabelText(/علاقہ \/ محلہ/i);
    fireEvent.change(locality, { target: { value: 'Gulshan-e-Iqbal' } });
    fireEvent.change(screen.getByLabelText(/گلی، بلاک یا قریبی نشانی/i), { target: { value: 'Block 13-D' } });
    fireEvent.change(screen.getByLabelText(/رہائشی پتہ/i), { target: { value: 'فلیٹ 402' } });
    await attachLiveLocation(24.9056, 67.0822);
    fireEvent.click(screen.getByRole('button', { name: /آگے بڑھیں/i }));

    // Step 4: Check Urdu notice
    await screen.findByRole('heading', { level: 2, name: /اپنے الفاظ میں بتائیں کہ کیا ہوا/i });
    expect(screen.getByText(/شکایت درج کرنے کے لیے اکاؤنٹ بنانا لازمی نہیں ہے۔/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /24 ہندسوں کا نجی ٹریکنگ نمبر محفوظ رکھیں/i
      )
    ).toBeInTheDocument();
  });

  it('submits a guest complaint without sign-in and returns both reference number and claim code', async () => {
    renderWithContext(<ComplaintForm />);

    // Step 1
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Ali Raza' } });
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '03112345678' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // Step 2: Camera capture
    await screen.findByRole('heading', { level: 2, name: /capture or attach/i });
    await captureCameraPhoto();
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // Step 3
    const locality = await screen.findByLabelText(/area \/ locality/i);
    fireEvent.change(locality, { target: { value: 'Clifton' } });
    fireEvent.change(screen.getByLabelText(/street, block or nearby landmark/i), { target: { value: 'Block 2' } });
    fireEvent.change(screen.getByLabelText(/home address/i), { target: { value: 'House 14' } });
    await attachLiveLocation(24.8138, 67.0300);
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // Step 4
    await screen.findByRole('heading', { level: 2, name: /describe what happened/i });
    fireEvent.change(screen.getByLabelText(/complaint description/i), {
      target: { value: 'Sadak par bohot gehra khadda hai asphalt tooti hui hai KMC road repair chahiye' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit complaint/i }));

    // Verify modal
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    expect(screen.getByRole('heading', { level: 2, name: /complaint received/i })).toBeInTheDocument();
    // V13.14 single-code guest receipt: ONE private tracking code, no KHI or CLM codes
    expect(screen.getByText(/your private tracking code/i)).toBeInTheDocument();
    expect(screen.queryByText(/official case reference number/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/private claim code/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy code/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /track complaint/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /return home/i })).toBeInTheDocument();
  });
});
