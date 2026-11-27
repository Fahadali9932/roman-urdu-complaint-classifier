import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';
import { LanguageProvider } from '../context/LanguageContext';
import { SimplifiedComplaintContainer } from '../features/citizen/simplified-complaint/SimplifiedComplaintContainer';
import { compressComplaintPhoto, formatFileSize } from '../utils/imageCompression';

const renderCitizenForm = () =>
  render(
    <BrowserRouter>
      <LanguageProvider>
        <SimplifiedComplaintContainer />
      </LanguageProvider>
    </BrowserRouter>
  );

describe('V23 Citizen Portal Refinement & 4-Stage Polish', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Objective 1: Image Compression & Payload Utilities', () => {
    it('correctly formats file sizes into human-readable units', () => {
      expect(formatFileSize(500)).toBe('500 B');
      expect(formatFileSize(250 * 1024)).toBe('250 KB');
      expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
    });

    it('safely handles non-canvas or mock file compression and returns metadata', async () => {
      const mockBlob = new Blob(['mock binary image content'], { type: 'image/jpeg' });
      const testFile = new File([mockBlob], 'street-leak.jpg', { type: 'image/jpeg' });

      const result = await compressComplaintPhoto(testFile, 1600, 0.82);
      expect(result.file).toBeDefined();
      expect(result.originalSize).toBe(testFile.size);
      expect(result.compressedSize).toBeGreaterThan(0);
    });
  });

  describe('Objective 2: Mandatory Issue Photo Capture Flow', () => {
    it('blocks user from advancing to location if no issue photograph is attached', async () => {
      renderCitizenForm();

      // Complete Step 1: Contact info
      fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Ayesha Khan' } });
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '03331234567' } });
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      // Step 2: Issue photo
      expect(await screen.findByRole('heading', { level: 2, name: /issue photograph/i })).toBeInTheDocument();
      expect(screen.getByText(/required/i)).toBeInTheDocument();

      // Click continue without attaching photo
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      // Validation error displayed, still on Step 2
      expect(await screen.findByText(/attach a photo of the issue/i)).toBeInTheDocument();
      expect(screen.queryByRole('heading', { level: 2, name: /tell us where/i })).not.toBeInTheDocument();
    });

    it('allows advancing once a photo is attached and displays attached status', async () => {
      renderCitizenForm();

      fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Ayesha Khan' } });
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '03331234567' } });
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      await screen.findByRole('heading', { level: 2, name: /issue photograph/i });

      // Attach file
      const dummyPhoto = new File(['mock content'], 'sewage-overflow.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByLabelText(/upload issue photo from files/i);
      fireEvent.change(fileInput, { target: { files: [dummyPhoto] } });

      // Check attached indicator
      expect(await screen.findByText(/photo attached/i)).toBeInTheDocument();

      // Advance to Step 3 (Location)
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));
      expect(await screen.findByRole('heading', { level: 2, name: /tell us where/i })).toBeInTheDocument();
    });

    it('supports removing and replacing attached photo', async () => {
      renderCitizenForm();

      fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Ayesha Khan' } });
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '03331234567' } });
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      await screen.findByRole('heading', { level: 2, name: /issue photograph/i });

      const dummyPhoto = new File(['mock content'], 'garbage-pile.jpg', { type: 'image/jpeg' });
      fireEvent.change(screen.getByLabelText(/upload issue photo from files/i), { target: { files: [dummyPhoto] } });

      expect(await screen.findByText(/photo attached/i)).toBeInTheDocument();

      // Click remove
      const removeBtn = screen.getByRole('button', { name: /remove/i });
      fireEvent.click(removeBtn);

      // Photo removed, primary capture buttons visible again
      expect(screen.queryByText(/photo attached/i)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /choose from files/i })).toBeInTheDocument();
    });
  });

  describe('Objective 3: Mapless Geolocation & Sindh Boundary Safeguards', () => {
    it('renders clean mapless location UI with no embedded OpenStreetMap tiles', async () => {
      renderCitizenForm();

      // Advance through Step 1 & Step 2
      fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Bilal Ahmed' } });
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '03211234567' } });
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      await screen.findByRole('heading', { level: 2, name: /issue photograph/i });
      const dummyPhoto = new File(['mock content'], 'broken-pipe.jpg', { type: 'image/jpeg' });
      fireEvent.change(screen.getByLabelText(/upload issue photo from files/i), { target: { files: [dummyPhoto] } });
      await screen.findByText(/photo attached/i);
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      // Step 3: Location stage
      await screen.findByRole('heading', { level: 2, name: /tell us where/i });

      // Assert no leaflet map container or tiles exist
      expect(document.querySelector('.leaflet-container')).toBeNull();
      expect(document.querySelector('.leaflet-tile-pane')).toBeNull();

      // Assert clean location button exists
      expect(screen.getByRole('button', { name: /use current issue location/i })).toBeInTheDocument();
    });

    it('attaches geolocation silently and displays confirmation badge', async () => {
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

      await screen.findByRole('heading', { level: 2, name: /issue photograph/i });
      const dummyPhoto = new File(['mock content'], 'road-pothole.jpg', { type: 'image/jpeg' });
      fireEvent.change(screen.getByLabelText(/upload issue photo from files/i), { target: { files: [dummyPhoto] } });
      await screen.findByText(/photo attached/i);
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      // Step 3: Click GPS button
      await screen.findByRole('heading', { level: 2, name: /tell us where/i });
      const gpsBtn = screen.getByRole('button', { name: /use current issue location/i });
      fireEvent.click(gpsBtn);

      // Verify human confirmation badge appears
      await waitFor(() => {
        expect(screen.getByText(/location attached successfully/i)).toBeInTheDocument();
      });
    });

    it('automatically uses verified district centroid when text address is entered without GPS', async () => {
      renderCitizenForm();

      // Step 1
      fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Bilal Ahmed' } });
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '03211234567' } });
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      // Step 2
      await screen.findByRole('heading', { level: 2, name: /issue photograph/i });
      const dummyPhoto = new File(['mock content'], 'test.jpg', { type: 'image/jpeg' });
      fireEvent.change(screen.getByLabelText(/upload issue photo from files/i), { target: { files: [dummyPhoto] } });
      await screen.findByText(/photo attached/i);
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      // Step 3: Fill known Karachi locality and home address (without touching GPS)
      await screen.findByRole('heading', { level: 2, name: /tell us where/i });
      fireEvent.change(screen.getByLabelText(/area \/ locality/i), { target: { value: 'Gulshan-e-Iqbal' } });
      fireEvent.change(screen.getByLabelText(/street, block or nearby landmark/i), { target: { value: 'Block 13-A' } });
      fireEvent.change(screen.getByLabelText(/home address/i), { target: { value: 'House 55, Street 2' } });

      // Click continue - should automatically resolve District East centroid and proceed to Step 4
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      expect(await screen.findByRole('heading', { level: 2, name: /describe what happened/i })).toBeInTheDocument();
    });
  });
});
