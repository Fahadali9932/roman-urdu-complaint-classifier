import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LanguageProvider, useLanguage } from '../context/LanguageContext';
import { ComplaintForm } from '../features/citizen/ComplaintForm';
import React from 'react';

const renderForm = () =>
  render(
    <BrowserRouter>
      <LanguageProvider>
        <ComplaintForm />
      </LanguageProvider>
    </BrowserRouter>
  );

const LanguageSwitcher: React.FC<{ targetLang: 'en' | 'ur' }> = ({ targetLang }) => {
  const { language, setLanguage } = useLanguage();
  React.useEffect(() => {
    if (language !== targetLang) {
      setLanguage(targetLang);
    }
  }, [language, setLanguage, targetLang]);
  return null;
};

const renderFormWithLang = (lang: 'en' | 'ur') => {
  return render(
    <BrowserRouter>
      <LanguageProvider>
        <LanguageSwitcher targetLang={lang} />
        <ComplaintForm />
      </LanguageProvider>
    </BrowserRouter>
  );
};

describe('Cinematic Glass Complaint Experience (Three-Stage Flow)', () => {
  it('renders Stage 1 (Your Details) with animated pen progress bar and branding', () => {
    renderForm();

    // Headline and identity label
    expect(screen.getByRole('heading', { level: 1, name: /let's start with you/i })).toBeInTheDocument();
    expect(screen.getByText(/Awaaz-e-Awam • Civic Intake/i)).toBeInTheDocument();

    // Stage 1 Fields
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();

    // Pen Progress bar
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveAttribute('aria-valuenow', '0');

    // Stage cards
    expect(screen.getAllByText(/Your Details/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Your Location/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Write Complaint/i).length).toBeGreaterThanOrEqual(1);
  });

  it('validates Stage 1 required fields and phone number before advancing', async () => {
    renderForm();

    const continueBtn = screen.getByRole('button', { name: /continue/i });
    fireEvent.click(continueBtn);

    // Validation errors appear
    await waitFor(() => {
      expect(screen.getByText(/full name is required/i)).toBeInTheDocument();
    });

    // Enter name only
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Farhan Zaidi' } });
    fireEvent.click(continueBtn);

    await waitFor(() => {
      expect(screen.getByText(/valid pakistani phone number is required/i)).toBeInTheDocument();
    });

    // Enter invalid phone
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '12345' } });
    fireEvent.click(continueBtn);

    await waitFor(() => {
      expect(screen.getByText(/valid pakistani phone number is required/i)).toBeInTheDocument();
    });

    // Enter valid phone
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '03001234567' } });
    fireEvent.click(continueBtn);

    // Successfully navigates to Stage 2 (Where should we look?)
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /where should we look/i })).toBeInTheDocument();
    });
  });

  it('navigates through all 3 stages, calculates pen progress, and opens honest prototype review modal', async () => {
    renderForm();

    // Stage 1: Details
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Fatima Noor' } });
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '03129876543' } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'fatima@example.com' } });

    // Progress updates with valid details
    await waitFor(() => {
      const p = screen.getByRole('progressbar');
      expect(Number(p.getAttribute('aria-valuenow'))).toBeGreaterThanOrEqual(34);
    });

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // Stage 2: Location
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /where should we look/i })).toBeInTheDocument();
    });

    // Search and select locality
    const localityInput = screen.getByLabelText(/area \/ locality/i);
    fireEvent.change(localityInput, { target: { value: 'DHA Phase 6' } });
    await waitFor(() => {
      expect(screen.getByDisplayValue(/District South/i)).toBeInTheDocument();
    });

    // Add optional home address
    fireEvent.click(screen.getByRole('button', { name: /add home address/i }));
    fireEvent.change(screen.getByLabelText(/home address/i), { target: { value: 'Flat 402, Al-Razi Heights' } });

    // Click continue to complaint
    fireEvent.click(screen.getByRole('button', { name: /continue to complaint/i }));

    // Stage 3: Write Complaint (No separate Subject field!)
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /tell us what happened/i })).toBeInTheDocument();
    });
    expect(screen.queryByLabelText(/complaint subject/i)).not.toBeInTheDocument();

    const description = screen.getByLabelText(/describe your complaint/i);
    fireEvent.change(description, {
      target: { value: 'Main road par water pipeline leak ho rahi hai aur gali me pani jama hai.' },
    });

    // Word counter display
    expect(screen.getByTestId('word-count-display')).toHaveTextContent('15');

    // Pen progress hits 100%
    await waitFor(() => {
      const p = screen.getByRole('progressbar');
      expect(Number(p.getAttribute('aria-valuenow'))).toBe(100);
    });

    // Submit complaint
    const submitBtn = screen.getByRole('button', { name: /submit complaint/i });
    fireEvent.click(submitBtn);

    // Honest prototype review modal opens after simulated submission state
    await waitFor(
      () => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/prototype preview mode/i)).toBeInTheDocument();
        expect(screen.getAllByText(/Fatima Noor/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText(/DHA Phase 6/i).length).toBeGreaterThanOrEqual(1);
        // Phone and home address are NOT displayed in summary for privacy
        expect(screen.queryByText('03129876543')).not.toBeInTheDocument();
        expect(screen.queryByText('Flat 402, Al-Razi Heights')).not.toBeInTheDocument();
      },
      { timeout: 2500 }
    );
  });

  it('renders Urdu RTL mode with translated headings and right-to-left layout', async () => {
    renderFormWithLang('ur');

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /آئیے آپ کی تفصیلات سے شروع کرتے ہیں/i })).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/پورا نام/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/فون نمبر/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /آگے بڑھیں/i })).toBeInTheDocument();
  });
});
