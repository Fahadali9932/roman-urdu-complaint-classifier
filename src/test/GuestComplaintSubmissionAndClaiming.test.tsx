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

    // Step 2: Fill location
    const locality = await screen.findByLabelText(/area \/ locality/i);
    fireEvent.change(locality, { target: { value: 'Gulshan-e-Iqbal' } });
    fireEvent.change(screen.getByLabelText(/street, block or nearby landmark/i), { target: { value: 'Block 13-D' } });
    fireEvent.change(screen.getByLabelText(/home address/i), { target: { value: 'Flat 402, Block 13-D' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // Step 3: Verify informational notice
    await screen.findByRole('heading', { level: 2, name: /describe what happened/i });
    const notice = screen.getByTestId('guest-submission-notice');
    expect(notice).toBeInTheDocument();
    expect(screen.getByText(/no account required to submit a complaint\./i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /you can submit your complaint directly\. to track its progress or view updates later, you'll need to create an account\./i
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

    // Step 2: Fill location
    const locality = await screen.findByLabelText(/علاقہ \/ محلہ/i);
    fireEvent.change(locality, { target: { value: 'Gulshan-e-Iqbal' } });
    fireEvent.change(screen.getByLabelText(/گلی، بلاک یا قریبی نشانی/i), { target: { value: 'Block 13-D' } });
    fireEvent.change(screen.getByLabelText(/رہائشی پتہ/i), { target: { value: 'فلیٹ 402' } });
    fireEvent.click(screen.getByRole('button', { name: /آگے بڑھیں/i }));

    // Step 3: Check Urdu notice
    await screen.findByRole('heading', { level: 2, name: /اپنے الفاظ میں بتائیں کہ کیا ہوا/i });
    expect(screen.getByText(/شکایت درج کرنے کے لیے اکاؤنٹ بنانا لازمی نہیں ہے۔/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /آپ اپنی شکایت براہ راست جمع کروا سکتے ہیں۔ بعد میں اس کی پیش رفت جانچنے یا اپ ڈیٹس دیکھنے کے لیے آپ کو اکاؤنٹ بنانا ہوگا۔/i
      )
    ).toBeInTheDocument();
  });

  it('submits a guest complaint without sign-in and returns both reference number and claim code', async () => {
    renderWithContext(<ComplaintForm />);

    // Step 1
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Ali Raza' } });
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '03112345678' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // Step 2
    const locality = await screen.findByLabelText(/area \/ locality/i);
    fireEvent.change(locality, { target: { value: 'Clifton' } });
    fireEvent.change(screen.getByLabelText(/street, block or nearby landmark/i), { target: { value: 'Block 2' } });
    fireEvent.change(screen.getByLabelText(/home address/i), { target: { value: 'House 14' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // Step 3
    await screen.findByRole('heading', { level: 2, name: /describe what happened/i });
    fireEvent.change(screen.getByLabelText(/complaint description/i), {
      target: { value: 'Sadak par bohot gehra khadda hai asphalt tooti hui hai KMC road repair chahiye' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit complaint/i }));

    // Verify modal
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    expect(screen.getByRole('heading', { level: 2, name: /complaint submitted successfully/i })).toBeInTheDocument();
    expect(screen.getByText(/official case reference number/i)).toBeInTheDocument();
    expect(screen.getByText(/private claim code/i)).toBeInTheDocument();
    expect(screen.getByText(/save your claim code securely/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account to track/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /return home/i })).toBeInTheDocument();
  });

  it('renders Claim Guest Complaint modal on Citizen Dashboard and successfully links complaint', async () => {
    // Submit a fresh complaint to mock service
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

    // Verify Claim button is present
    const claimButton = await screen.findByRole('button', { name: /claim guest complaint/i });
    expect(claimButton).toBeInTheDocument();

    // Open claim modal
    fireEvent.click(claimButton);
    expect(await screen.findByRole('heading', { name: /claim guest complaint/i })).toBeInTheDocument();

    // Enter reference number and claim code
    fireEvent.change(screen.getByLabelText(/reference number/i), {
      target: { value: submission.referenceNumber },
    });
    fireEvent.change(screen.getByLabelText(/private claim code/i), {
      target: { value: submission.claimCode },
    });

    // Submit claim
    fireEvent.click(screen.getByRole('button', { name: /claim & link complaint/i }));

    // Verify success message
    await waitFor(() => {
      expect(screen.getByText(/complaint linked to your account successfully!/i)).toBeInTheDocument();
    });

    // Verify trying to claim again fails
    const reClaim = await complaintService.claimComplaint(submission.referenceNumber, submission.claimCode!);
    expect(reClaim.success).toBe(false);
    expect(reClaim.error).toMatch(/already been claimed/i);

    // Verify claiming with invalid code fails
    const invalidClaim = await complaintService.claimComplaint('KHI-2026-INVALID', 'CLM-WRONG-CODE-0000');
    expect(invalidClaim.success).toBe(false);
  });
});
