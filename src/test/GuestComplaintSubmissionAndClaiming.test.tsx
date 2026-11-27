import { describe, expect, it } from 'vitest';
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

    // Step 2: Attach required issue photo
    await screen.findByRole('heading', { level: 2, name: /issue photograph/i });
    const dummyFile1 = new File(['mock photo bytes'], 'issue-photo.jpg', { type: 'image/jpeg' });
    fireEvent.change(screen.getByLabelText(/upload issue photo from files/i), { target: { files: [dummyFile1] } });
    await screen.findByText(/photo attached/i);
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // Step 3: Fill location
    const locality = await screen.findByLabelText(/area \/ locality/i);
    fireEvent.change(locality, { target: { value: 'Gulshan-e-Iqbal' } });
    fireEvent.change(screen.getByLabelText(/street, block or nearby landmark/i), { target: { value: 'Block 13-D' } });
    fireEvent.change(screen.getByLabelText(/home address/i), { target: { value: 'Flat 402, Block 13-D' } });
    fireEvent.change(screen.getByLabelText(/^Latitude$/i), { target: { value: '24.9056' } });
    fireEvent.change(screen.getByLabelText(/^Longitude$/i), { target: { value: '67.0822' } });
    fireEvent.click(screen.getByRole('button', { name: /verify location/i }));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // Step 3: Verify informational notice
    await screen.findByRole('heading', { level: 2, name: /describe what happened/i });
    const notice = screen.getByTestId('guest-submission-notice');
    expect(notice).toBeInTheDocument();
    expect(screen.getByText(/no account required to submit a complaint\./i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /save the private 24-digit tracking number on your receipt/i
      )
    ).toBeInTheDocument();

    // Verify blocking login alert does NOT appear
    expect(screen.queryByText(/citizen sign-in required/i)).not.toBeInTheDocument();
  });

  it('displays the exact Urdu informational notice in RTL mode', async () => {
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

    // Step 2: Attach required issue photo
    await screen.findByRole('heading', { level: 2, name: /مسئلے کی تصویر/i });
    const dummyFile2 = new File(['mock photo bytes'], 'issue-photo.jpg', { type: 'image/jpeg' });
    fireEvent.change(screen.getByLabelText(/upload issue photo from files/i), { target: { files: [dummyFile2] } });
    await screen.findByText(/تصویر منسلک ہو گئی/i);
    fireEvent.click(screen.getByRole('button', { name: /آگے بڑھیں/i }));

    // Step 3: Fill location
    const locality = await screen.findByLabelText(/علاقہ \/ محلہ/i);
    fireEvent.change(locality, { target: { value: 'Gulshan-e-Iqbal' } });
    fireEvent.change(screen.getByLabelText(/گلی، بلاک یا قریبی نشانی/i), { target: { value: 'Block 13-D' } });
    fireEvent.change(screen.getByLabelText(/رہائشی پتہ/i), { target: { value: 'فلیٹ 402' } });
    fireEvent.change(screen.getByLabelText(/^Latitude$/i), { target: { value: '24.9056' } });
    fireEvent.change(screen.getByLabelText(/^Longitude$/i), { target: { value: '67.0822' } });
    fireEvent.click(screen.getByRole('button', { name: /مقام کی تصدیق کریں/i }));
    fireEvent.click(screen.getByRole('button', { name: /آگے بڑھیں/i }));

    // Step 3: Check Urdu notice
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

    // Step 2: Attach required issue photo
    await screen.findByRole('heading', { level: 2, name: /issue photograph/i });
    const dummyFile3 = new File(['mock photo bytes'], 'issue-photo.jpg', { type: 'image/jpeg' });
    fireEvent.change(screen.getByLabelText(/upload issue photo from files/i), { target: { files: [dummyFile3] } });
    await screen.findByText(/photo attached/i);
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // Step 3
    const locality = await screen.findByLabelText(/area \/ locality/i);
    fireEvent.change(locality, { target: { value: 'Clifton' } });
    fireEvent.change(screen.getByLabelText(/street, block or nearby landmark/i), { target: { value: 'Block 2' } });
    fireEvent.change(screen.getByLabelText(/home address/i), { target: { value: 'House 14' } });
    fireEvent.change(screen.getByLabelText(/^Latitude$/i), { target: { value: '24.8138' } });
    fireEvent.change(screen.getByLabelText(/^Longitude$/i), { target: { value: '67.0300' } });
    fireEvent.click(screen.getByRole('button', { name: /verify location/i }));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // Step 3
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

  it('keeps the old claim-code API for historical data but removes the unusable citizen claim modal', async () => {
    const submission = await complaintService.submitComplaint({
      citizenName: 'Zainab Bibi',
      citizenPhone: '03211234567',
      district: 'District East',
      locality: 'Gulshan-e-Iqbal',
      publicLocation: 'Block 10',
      residentialAddress: 'House 10',
      title: 'Water pipe leak',
      description: 'Pani ki line leak hai KWSC water issue',
    });

    expect(submission.referenceNumber).toBeDefined();
    expect(submission.claimCode).toBeDefined();

    renderWithContext(<CitizenDashboard />);
    expect(screen.queryByRole('button', { name: /claim guest complaint/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /track complaint/i }).length).toBeGreaterThan(0);

    // The service contract is intentionally kept for old claims, not offered as a new guest flow.
    const claim = await complaintService.claimComplaint(submission.referenceNumber, submission.claimCode!);
    expect(claim.success).toBe(true);

    // Verify trying to claim again fails
    const reClaim = await complaintService.claimComplaint(submission.referenceNumber, submission.claimCode!);
    expect(reClaim.success).toBe(false);
    expect(reClaim.error).toMatch(/already been claimed/i);

    // Verify claiming with invalid code fails
    const invalidClaim = await complaintService.claimComplaint('KHI-2026-INVALID', 'CLM-WRONG-CODE-0000');
    expect(invalidClaim.success).toBe(false);
  });
});
