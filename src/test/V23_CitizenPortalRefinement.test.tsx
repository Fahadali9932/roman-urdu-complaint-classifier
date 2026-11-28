import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';
import { LanguageProvider } from '../context/LanguageContext';
import { ComplaintForm } from '../features/citizen/ComplaintForm';

const renderCitizenForm = () =>
  render(
    <BrowserRouter>
      <LanguageProvider>
        <ComplaintForm />
      </LanguageProvider>
    </BrowserRouter>
  );

const captureCameraPhoto = async () => {
  const startBtn = screen.getByRole('button', { name: /capture photo|تصویر کھینچیں/i });
  fireEvent.click(startBtn);
  const snapBtn = await screen.findByRole('button', { name: /^capture$|^تصویر لیں$/i });
  fireEvent.click(snapBtn);
  const useBtn = await screen.findByRole('button', { name: /use photo|تصویر استعمال کریں/i });
  fireEvent.click(useBtn);
  await screen.findByText(/photo captured\.|تصویر محفوظ ہو گئی۔/i);
};

describe('AWAAZ-E-AWAM — Citizen Portal Camera & Location Refinement', () => {
  describe('Objective 1: Camera-Only Photo Capture', () => {
    it('disables continue button until photo is captured', async () => {
      renderCitizenForm();

      fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Ayesha Khan' } });
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '03331234567' } });
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      await screen.findByRole('heading', { level: 2, name: /capture or attach/i });

      // Continue button must be disabled
      const continueBtn = screen.getByRole('button', { name: /continue/i });
      expect(continueBtn).toBeDisabled();

      // Zero file inputs
      expect(screen.queryByLabelText(/upload issue photo from files/i)).toBeNull();
      expect(screen.queryByRole('button', { name: /choose from files/i })).toBeNull();
      expect(document.querySelector('input[type="file"]')).toBeNull();
    });

    it('allows advancing once photo is captured via live camera flow', async () => {
      renderCitizenForm();

      fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Ayesha Khan' } });
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '03331234567' } });
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      await screen.findByRole('heading', { level: 2, name: /capture or attach/i });

      await captureCameraPhoto();

      // Continue button should now be enabled
      const continueBtn = screen.getByRole('button', { name: /continue/i });
      expect(continueBtn).not.toBeDisabled();

      // Advance to Step 3 (Location)
      fireEvent.click(continueBtn);
      expect(await screen.findByRole('heading', { level: 2, name: /tell us where/i })).toBeInTheDocument();
    });

    it('supports retaking captured photo', async () => {
      renderCitizenForm();

      fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Ayesha Khan' } });
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '03331234567' } });
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      await screen.findByRole('heading', { level: 2, name: /capture or attach/i });

      await captureCameraPhoto();

      // Retake button
      const retakeBtn = screen.getByRole('button', { name: /retake/i });
      fireEvent.click(retakeBtn);

      // Back to streaming or idle, photo cleared
      expect(screen.queryByText(/photo captured\./i)).not.toBeInTheDocument();
    });
  });

  describe('Objective 2: Mandatory Live Geolocation', () => {
    it('renders clean mapless location UI with no embedded map tiles or manual inputs', async () => {
      renderCitizenForm();

      // Advance through Step 1 & Step 2
      fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Bilal Ahmed' } });
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '03211234567' } });
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      await screen.findByRole('heading', { level: 2, name: /capture or attach/i });
      await captureCameraPhoto();
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      // Step 3: Location stage
      await screen.findByRole('heading', { level: 2, name: /tell us where/i });

      // Assert no leaflet map container or tiles exist
      expect(document.querySelector('.leaflet-container')).toBeNull();
      expect(document.querySelector('.leaflet-tile-pane')).toBeNull();

      // Assert no manual coordinate inputs exist
      expect(document.querySelector('#incident-lat-input')).toBeNull();
      expect(document.querySelector('#incident-lon-input')).toBeNull();

      // Assert clean location button exists with exact text
      expect(screen.getByRole('button', { name: /add location/i })).toBeInTheDocument();
    });

    it('attaches geolocation and displays confirmation badge', async () => {
      const mockGeolocation = {
        getCurrentPosition: vi.fn().mockImplementationOnce((success) =>
          success({
            coords: {
              latitude: 24.8607,
              longitude: 67.0011,
              accuracy: 10,
            },
          })
        ),
      };
      // @ts-expect-error Mocking navigator.geolocation
      navigator.geolocation = mockGeolocation;

      renderCitizenForm();

      // Step 1 & 2
      fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Bilal Ahmed' } });
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '03211234567' } });
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      await screen.findByRole('heading', { level: 2, name: /capture or attach/i });
      await captureCameraPhoto();
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      // Step 3: Click Add Location button
      await screen.findByRole('heading', { level: 2, name: /tell us where/i });
      const addBtn = screen.getByRole('button', { name: /add location/i });
      fireEvent.click(addBtn);

      // Verify confirmation badge appears
      await waitFor(() => {
        expect(screen.getByText(/location attached\./i)).toBeInTheDocument();
      });
    });

    it('strictly disables continue and blocks advancing when GPS location is not attached', async () => {
      renderCitizenForm();

      // Step 1
      fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Bilal Ahmed' } });
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '03211234567' } });
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      // Step 2
      await screen.findByRole('heading', { level: 2, name: /capture or attach/i });
      await captureCameraPhoto();
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      // Step 3: Fill known Karachi locality and home address (without touching GPS)
      await screen.findByRole('heading', { level: 2, name: /tell us where/i });
      fireEvent.change(screen.getByLabelText(/area \/ locality/i), { target: { value: 'Gulshan-e-Iqbal' } });
      fireEvent.change(screen.getByLabelText(/street, block or nearby landmark/i), { target: { value: 'Block 13-A' } });
      fireEvent.change(screen.getByLabelText(/home address/i), { target: { value: 'House 55, Street 2' } });

      // Step 3 Continue button MUST BE DISABLED
      const continueBtn = screen.getByRole('button', { name: /continue/i });
      expect(continueBtn).toBeDisabled();

      // Attempting to advance without GPS remains blocked on Step 3
      expect(screen.queryByRole('heading', { level: 2, name: /describe what happened/i })).toBeNull();
    });
  });
});
