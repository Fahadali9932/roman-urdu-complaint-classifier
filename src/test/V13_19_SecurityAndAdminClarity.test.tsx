import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../context/LanguageContext';
import { AdminHeader } from '../features/auth/components/AdminHeader';
import { generateClaimCode, generateGuestTrackingNumber } from '../utils/referenceGenerator';
import { aiTelemetryService, DEFAULT_IDLE } from '../services/aiTelemetryService';

afterEach(() => vi.unstubAllGlobals());

describe('V13.19 security and administrative clarity', () => {
  it('generates a 24-digit guest secret exclusively from cryptographic random bytes', () => {
    const generator = vi.fn((bytes: Uint8Array) => {
      bytes.fill(27);
      return bytes;
    });
    vi.stubGlobal('crypto', { getRandomValues: generator });
    const tracking = generateGuestTrackingNumber();
    expect(tracking.raw).toMatch(/^7{24}$/);
    expect(tracking.formatted).toMatch(/^\d{4}( \d{4}){5}$/);
    expect(generator).toHaveBeenCalled();
  });

  it('fails closed when the secure random API is unavailable', () => {
    vi.stubGlobal('crypto', undefined);
    expect(() => generateGuestTrackingNumber()).toThrow(/Secure random number generation/);
  });

  it('rejects unusable cryptographic entropy without a predictable fallback', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (bytes: Uint8Array) => bytes.fill(255),
    });
    expect(() => generateGuestTrackingNumber()).toThrow(/Unable to generate a secure/);
  });

  it('generates local claim secrets from cryptographic bytes rather than Math.random', () => {
    vi.stubGlobal('crypto', { getRandomValues: (bytes: Uint8Array) => bytes.fill(1) });
    expect(generateClaimCode()).toBe('CLM-3333-3333-3333');
    vi.stubGlobal('crypto', undefined);
    expect(() => generateClaimCode()).toThrow(/Secure random number generation/);
  });

  it('does not invent live training telemetry when its endpoint is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    expect(DEFAULT_IDLE.resources).toEqual({});
    const result = await aiTelemetryService.fetchTelemetry();
    expect(result.source).toBe('unavailable');
    expect(result.state).toBe('STALE');
    expect(Object.keys(result.resources)).toHaveLength(0);
  });

  it('does not advertise an empty admin Overview route as a real workspace', () => {
    render(
      <MemoryRouter>
        <LanguageProvider>
          <AdminHeader activeTab="access" />
        </LanguageProvider>
      </MemoryRouter>,
    );
    expect(screen.queryByRole('link', { name: /^Overview$/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /People & permissions/i })).toHaveAttribute('href', '/admin/access');
  });
});
