import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';
import { LanguageProvider, useLanguage } from '../context/LanguageContext';
import { ComplaintForm } from '../features/citizen/ComplaintForm';
import { PublicHeader } from '../components/layout/PublicHeader';

const renderForm = (initialLang: 'en' | 'ur' = 'en') => {
  const LangWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { language, setLanguage } = useLanguage();
    React.useEffect(() => {
      if (language !== initialLang) setLanguage(initialLang);
    }, [language, setLanguage]);
    return <>{children}</>;
  };

  return render(
    <BrowserRouter>
      <LanguageProvider>
        <LangWrapper>
          <ComplaintForm />
        </LangWrapper>
      </LanguageProvider>
    </BrowserRouter>
  );
};

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

const advanceToStep2 = async () => {
  fireEvent.change(screen.getByLabelText(/full name|پورا نام/i), { target: { value: 'Hamza Khan' } });
  fireEvent.change(screen.getByLabelText(/phone number|موبائل نمبر/i), { target: { value: '03001234567' } });
  fireEvent.click(screen.getByRole('button', { name: /continue|آگے بڑھیں/i }));
  await screen.findByRole('heading', { level: 2, name: /capture or attach|مسئلے کی تصویر/i });
};

const capturePhotoFlow = async () => {
  const startBtn = screen.getByRole('button', { name: /capture photo|تصویر کھینچیں/i });
  fireEvent.click(startBtn);

  const snapBtn = await screen.findByRole('button', { name: /^capture$|^تصویر لیں$/i });
  fireEvent.click(snapBtn);

  const useBtn = await screen.findByRole('button', { name: /use photo|تصویر استعمال کریں/i });
  fireEvent.click(useBtn);

  await screen.findByText(/photo captured\.|تصویر محفوظ ہو گئی۔/i);
};

const advanceToStep3 = async () => {
  await advanceToStep2();
  await capturePhotoFlow();
  fireEvent.click(screen.getByRole('button', { name: /continue|آگے بڑھیں/i }));
  await screen.findByRole('heading', { level: 2, name: /tell us where|مسئلے کی جگہ/i });
};

describe('AWAAZ-E-AWAM — V22.4.1 Citizen Portal Corrections', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Complaint Photograph Section (Live Camera Only)', () => {
    it('contains ZERO file inputs, file pickers, gallery buttons, or drag-and-drop zones', async () => {
      renderForm('en');
      await advanceToStep2();

      expect(document.querySelector('input[type="file"]')).toBeNull();
      expect(screen.queryByLabelText(/choose from files|upload from files/i)).toBeNull();
      expect(screen.queryByRole('button', { name: /choose from files|upload photo/i })).toBeNull();
      expect(screen.queryByText(/drag and drop/i)).toBeNull();

      // Only clean camera capture action is available
      expect(screen.getByRole('button', { name: /capture photo/i })).toBeInTheDocument();
      expect(screen.getByText(/take a clear photo of the issue\./i)).toBeInTheDocument();
      expect(screen.getAllByText(/avoid including faces or personal documents\./i).length).toBeGreaterThan(0);
    });

    it('strictly disables the Continue button until a photograph is captured and accepted', async () => {
      renderForm('en');
      await advanceToStep2();

      const continueBtn = screen.getByRole('button', { name: /continue/i });
      expect(continueBtn).toBeDisabled();

      await capturePhotoFlow();
      expect(continueBtn).not.toBeDisabled();
    });

    it('displays the Photo captured. confirmation badge and allows retaking the photo', async () => {
      renderForm('en');
      await advanceToStep2();

      await capturePhotoFlow();
      expect(screen.getByText(/photo captured\./i)).toBeInTheDocument();

      // Click retake photo
      const retakeBtn = screen.getByRole('button', { name: /retake/i });
      fireEvent.click(retakeBtn);

      // Photo should be cleared and Continue disabled again
      expect(screen.queryByText(/photo captured\./i)).toBeNull();
      expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
    });

    it('renders clean Urdu translations in photo step without robotic or AI phrasing', async () => {
      renderForm('ur');
      await advanceToStep2();

      expect(screen.getByRole('button', { name: /تصویر کھینچیں/i })).toBeInTheDocument();
      expect(screen.getByText(/مسئلے کی واضح تصویر لیں۔/i)).toBeInTheDocument();
      expect(screen.getAllByText(/چہروں یا ذاتی دستاویزات کو شامل کرنے سے گریز کریں۔/i).length).toBeGreaterThan(0);

      const continueBtn = screen.getByRole('button', { name: /آگے بڑھیں/i });
      expect(continueBtn).toBeDisabled();

      await capturePhotoFlow();
      expect(screen.getByText(/تصویر محفوظ ہو گئی۔/i)).toBeInTheDocument();
      expect(continueBtn).not.toBeDisabled();
    });
  });

  describe('2. Mandatory Live Location Section', () => {
    it('renders exact requested heading, supporting text, and clean Add location action', async () => {
      renderForm('en');
      await advanceToStep3();

      expect(screen.getByText(/^issue location$/i)).toBeInTheDocument();
      expect(screen.getByText(/attach your location while at the issue site\./i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^add location$/i })).toBeInTheDocument();

      // Zero maps
      expect(document.querySelector('iframe')).toBeNull();
      expect(document.querySelector('.leaflet-container')).toBeNull();

      // Zero manual coordinate inputs
      expect(document.querySelector('#incident-lat-input')).toBeNull();
      expect(document.querySelector('#incident-lon-input')).toBeNull();
      expect(document.querySelector('details')).toBeNull();
    });

    it('strictly disables Continue button until valid live location is attached', async () => {
      renderForm('en');
      await advanceToStep3();

      // Fill area and landmark and home address
      fireEvent.change(screen.getByLabelText(/area \/ locality/i), { target: { value: 'Clifton' } });
      fireEvent.change(screen.getByLabelText(/street, block or nearby landmark/i), { target: { value: 'Block 4' } });
      fireEvent.change(screen.getByLabelText(/home address/i), { target: { value: 'House 12-B' } });

      const continueBtn = screen.getByRole('button', { name: /continue/i });
      expect(continueBtn).toBeDisabled();

      // Attach location
      mockGeolocation(24.8138, 67.0300);
      const addBtn = screen.getByRole('button', { name: /^add location$/i });
      fireEvent.click(addBtn);

      await screen.findByText(/location attached\./i);
      expect(continueBtn).not.toBeDisabled();

      // Clear location
      const clearBtn = screen.getByRole('button', { name: /^clear$/i });
      fireEvent.click(clearBtn);

      // Continue button should be disabled again
      expect(screen.queryByText(/location attached\./i)).toBeNull();
      expect(continueBtn).toBeDisabled();
    });

    it('handles permission denied with exact error guidance', async () => {
      renderForm('en');
      await advanceToStep3();

      mockGeolocation(24.8607, 67.0011, { code: 1, message: 'User denied geolocation' });
      const addBtn = screen.getByRole('button', { name: /^add location$/i });
      fireEvent.click(addBtn);

      expect(await screen.findByTestId('outside-sindh-alert')).toHaveTextContent(/allow location access to continue\./i);
      expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
    });

    it('handles out-of-service coordinates with exact service area error', async () => {
      renderForm('en');
      await advanceToStep3();

      // Lahore coordinates (outside Sindh / Karachi)
      mockGeolocation(31.5204, 74.3587);
      const addBtn = screen.getByRole('button', { name: /^add location$/i });
      fireEvent.click(addBtn);

      expect(await screen.findByTestId('outside-sindh-alert')).toHaveTextContent(/this location is outside our service area\./i);
      expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
    });

    it('renders exact Urdu copy for location section in Urdu RTL', async () => {
      renderForm('ur');
      await advanceToStep3();

      expect(screen.getByText(/^مسئلے کا مقام$/i)).toBeInTheDocument();
      expect(screen.getByText(/مسئلے کی جگہ پر موجود ہوتے ہوئے اپنا مقام منسلک کریں۔/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /مقام شامل کریں/i })).toBeInTheDocument();

      mockGeolocation(24.8607, 67.0011);
      fireEvent.click(screen.getByRole('button', { name: /مقام شامل کریں/i }));

      await screen.findByText(/مقام منسلک ہو گیا۔/i);
      expect(screen.getByRole('button', { name: /مقام تبدیل کریں/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /مقام ہٹائیں/i })).toBeInTheDocument();
    });
  });

  describe('3. PublicHeader Mobile Dropdown Positioning', () => {
    it('renders PublicHeader with responsive navigation and mobile menu toggle', () => {
      render(
        <BrowserRouter>
          <LanguageProvider>
            <PublicHeader />
          </LanguageProvider>
        </BrowserRouter>
      );

      const menuBtn = screen.getByLabelText(/open navigation menu/i);
      expect(menuBtn).toBeInTheDocument();

      fireEvent.click(menuBtn);
      expect(screen.getByRole('dialog', { name: /mobile navigation/i })).toBeInTheDocument();

      // Close menu
      const closeButtons = screen.getAllByLabelText(/close navigation menu/i);
      expect(closeButtons.length).toBeGreaterThan(0);
      fireEvent.click(closeButtons[0]);
      expect(screen.queryByRole('dialog', { name: /mobile navigation/i })).toBeNull();
    });
  });
});
