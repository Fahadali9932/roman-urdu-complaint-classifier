import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { LanguageProvider, useLanguage } from '../context/LanguageContext';
import {
  verifySindhLocation,
  evaluateDepartmentServiceCoverage,
  isPointInGeoJsonFeatureCollection,
} from '../lib/geo/sindhEligibility';
import { SINDH_BOUNDARY_GEOJSON } from '../data/geo/sindhBoundaryData';
import { ComplaintForm } from '../features/citizen/ComplaintForm';

const UrduWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { language, setLanguage } = useLanguage();
  React.useEffect(() => {
    if (language !== 'ur') setLanguage('ur');
  }, [language, setLanguage]);
  return <>{children}</>;
};

describe('V14 Sindh Geographical Eligibility & Service Coverage', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  // 1. Valid Sindh points
  it.each([
    ['Karachi Saddar', 24.8607, 67.0011, true],
    ['Karachi Clifton Block 4', 24.8138, 67.0300, true],
    ['Hyderabad', 25.3960, 68.3578, false],
    ['Sukkur', 27.7052, 68.8574, false],
    ['Larkana', 27.5590, 68.2120, false],
    ['Tharparkar Mithi', 24.7400, 69.8000, false],
  ])('accepts valid coordinates inside Sindh (%s: %f, %f)', (_name, lat, lon, expectedKarachi) => {
    const res = verifySindhLocation(lat, lon);
    expect(res.eligible).toBe(true);
    expect(res.code).toBe('ELIGIBLE_SINDH');
    expect(res.karachiMetroCovered).toBe(expectedKarachi);
  });

  // 2. Outside Sindh & Border points
  it.each([
    ['Lahore', 31.5204, 74.3587],
    ['Islamabad', 33.6844, 73.0479],
    ['Quetta', 30.1798, 66.9750],
    ['Arabian Sea off Karachi coast', 24.4000, 66.9000],
    ['Hub Balochistan border side', 25.0500, 66.8000],
    ['Bahawalpur Punjab border side', 29.3956, 71.6836],
  ])('rejects out-of-Sindh coordinates with OUTSIDE_SINDH (%s)', (_name, lat, lon) => {
    const res = verifySindhLocation(lat, lon);
    expect(res.eligible).toBe(false);
    expect(res.code).toBe('OUTSIDE_SINDH');
  });

  // 3. Boundary vertex & hole support
  it('supports GeoJSON Polygon boundary vertex inclusion and Polygon with interior hole exclusion', () => {
    const firstVertex = (SINDH_BOUNDARY_GEOJSON.features[0].geometry.coordinates[0] as readonly (readonly number[])[])[0];
    const boundaryRes = verifySindhLocation(firstVertex[1], firstVertex[0]);
    expect(boundaryRes.eligible).toBe(true);

    // Explicit synthetic Polygon with a hole (validates RFC 7946 hole logic directly)
    const polyWithHole = {
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature' as const,
          properties: { shapeName: 'SyntheticWithHole' },
          geometry: {
            type: 'Polygon' as const,
            coordinates: [
              // Outer box [67..69] x [24..26]
              [
                [67, 24],
                [69, 24],
                [69, 26],
                [67, 26],
                [67, 24],
              ],
              // Inner hole [67.5..68.5] x [24.5..25.5]
              [
                [67.5, 24.5],
                [68.5, 24.5],
                [68.5, 25.5],
                [67.5, 25.5],
                [67.5, 24.5],
              ],
            ],
          },
        },
      ],
    } as unknown as typeof SINDH_BOUNDARY_GEOJSON;

    expect(isPointInGeoJsonFeatureCollection(24.2, 67.2, polyWithHole)).toBe(true);
    expect(isPointInGeoJsonFeatureCollection(25.0, 68.0, polyWithHole)).toBe(false);
  });

  // 4. Missing, NaN, Infinity, swapped lat/lon, out-of-range
  it('rejects missing, NaN, Infinity, swapped lat/lon, and invalid coordinate ranges cleanly', () => {
    expect(verifySindhLocation(undefined, undefined).code).toBe('LOCATION_REQUIRED');
    expect(verifySindhLocation(null, 67.0011).code).toBe('LOCATION_REQUIRED');
    expect(verifySindhLocation('', '').code).toBe('LOCATION_REQUIRED');

    expect(verifySindhLocation(NaN, 67.0011).code).toBe('INVALID_COORDINATES');
    expect(verifySindhLocation(24.8607, Infinity).code).toBe('INVALID_COORDINATES');
    expect(verifySindhLocation(91, 67.0011).code).toBe('INVALID_COORDINATES');
    expect(verifySindhLocation(24.8607, 181).code).toBe('INVALID_COORDINATES');
    expect(verifySindhLocation(67.0011, 24.8607).code).toBe('INVALID_COORDINATES');
  });

  // 5. Separates Sindh eligibility from per-department service coverage
  it('distinguishes Sindh eligibility from Karachi-only department service coverage', () => {
    // Hyderabad is INSIDE Sindh -> provincial/wider departments allowed; Karachi-only KMC flagged UNSUPPORTED_SERVICE_AREA
    const hyderabadProvincial = evaluateDepartmentServiceCoverage(25.3960, 68.3578, ['ssgc']);
    expect(hyderabadProvincial.eligible).toBe(true);

    const hyderabadKarachiOnly = evaluateDepartmentServiceCoverage(25.3960, 68.3578, ['kmc']);
    expect(hyderabadKarachiOnly.eligible).toBe(false);
    expect(hyderabadKarachiOnly.code).toBe('UNSUPPORTED_SERVICE_AREA');

    // Karachi is eligible for KMC
    const karachiKmc = evaluateDepartmentServiceCoverage(24.8607, 67.0011, ['kmc']);
    expect(karachiKmc.eligible).toBe(true);
  });

  // 6. Frontend UI rejection keeps citizen text & supports English + Urdu RTL
  it('shows Outside our service region in English without clearing entered draft text', async () => {
    render(
      <BrowserRouter>
        <LanguageProvider>
          <ComplaintForm />
        </LanguageProvider>
      </BrowserRouter>
    );

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Bilal Ahmed' } });
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '03001234567' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // Step 2: Camera Capture
    await screen.findByRole('heading', { level: 2, name: /capture or attach/i });
    fireEvent.click(screen.getByRole('button', { name: /capture photo/i }));
    const snapBtn = await screen.findByRole('button', { name: /^capture$/i });
    fireEvent.click(snapBtn);
    const useBtn = await screen.findByRole('button', { name: /use photo/i });
    fireEvent.click(useBtn);
    await screen.findByText(/photo captured\./i);
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    const locality = await screen.findByLabelText(/area \/ locality/i);
    fireEvent.change(locality, { target: { value: 'Clifton' } });
    fireEvent.change(screen.getByLabelText(/street, block or nearby landmark/i), { target: { value: 'Street 9' } });
    fireEvent.change(screen.getByLabelText(/home address/i), { target: { value: 'House 20' } });

    // Live location with Lahore coordinates -> blocked with Outside our service area
    Object.defineProperty(navigator, 'geolocation', {
      writable: true,
      configurable: true,
      value: {
        getCurrentPosition: (success: any) =>
          success({
            coords: {
              latitude: 31.5204,
              longitude: 74.3587,
              accuracy: 10,
            },
          }),
        watchPosition: vi.fn(),
        clearWatch: vi.fn(),
      },
    });

    fireEvent.click(screen.getByRole('button', { name: /add location/i }));

    expect(await screen.findByTestId('outside-sindh-alert')).toHaveTextContent(/outside our service area/i);
    expect(screen.getByRole('combobox', { name: /area \/ locality/i })).toHaveValue('Clifton');
    expect(screen.getByLabelText(/street, block or nearby landmark/i)).toHaveValue('Street 9');
    expect(screen.getByLabelText(/home address/i)).toHaveValue('House 20');
  });

  it('shows localized Urdu Outside our service region message when Urdu RTL is active', async () => {
    render(
      <BrowserRouter>
        <LanguageProvider>
          <UrduWrapper>
            <ComplaintForm />
          </UrduWrapper>
        </LanguageProvider>
      </BrowserRouter>
    );

    fireEvent.change(await screen.findByLabelText(/پورا نام/i), { target: { value: 'بلال احمد' } });
    fireEvent.change(screen.getByLabelText(/موبائل نمبر/i), { target: { value: '03001234567' } });
    fireEvent.click(screen.getByRole('button', { name: /آگے بڑھیں/i }));

    // Step 2: Camera Capture
    await screen.findByRole('heading', { level: 2, name: /مسئلے کی تصویر/i });
    fireEvent.click(screen.getByRole('button', { name: /تصویر کھینچیں/i }));
    const snapBtn = await screen.findByRole('button', { name: /^تصویر لیں$/i });
    fireEvent.click(snapBtn);
    const useBtn = await screen.findByRole('button', { name: /تصویر استعمال کریں/i });
    fireEvent.click(useBtn);
    await screen.findByText(/تصویر محفوظ ہو گئی۔/i);
    fireEvent.click(screen.getByRole('button', { name: /آگے بڑھیں/i }));

    await screen.findByLabelText(/علاقہ \/ محلہ/i);
    
    // Live location with Islamabad coordinates
    Object.defineProperty(navigator, 'geolocation', {
      writable: true,
      configurable: true,
      value: {
        getCurrentPosition: (success: any) =>
          success({
            coords: {
              latitude: 33.6844,
              longitude: 73.0479,
              accuracy: 10,
            },
          }),
        watchPosition: vi.fn(),
        clearWatch: vi.fn(),
      },
    });

    fireEvent.click(screen.getByRole('button', { name: /مقام شامل کریں/i }));

    expect(await screen.findByTestId('outside-sindh-alert')).toHaveTextContent(/ہماری سروس کے دائرہ کار سے باہر ہے/i);
  });
});
