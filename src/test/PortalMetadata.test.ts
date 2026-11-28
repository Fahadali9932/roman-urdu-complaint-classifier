import { describe, expect, it } from 'vitest';
import { getPortalMetadata, normalizeCitizenOrigin } from '../services/portalMetadata';

describe('citizen portal metadata', () => {
  const citizenOrigin = 'https://citizens.example.org/';

  it('indexes a public informational page only when an HTTPS citizen origin is configured', () => {
    expect(normalizeCitizenOrigin(citizenOrigin)).toBe('https://citizens.example.org');
    expect(getPortalMetadata('/about', citizenOrigin)).toMatchObject({
      title: 'About Awaaz-e-Awam | Karachi Civic Complaint Portal',
      robots: 'index,follow,max-image-preview:large',
      canonicalUrl: 'https://citizens.example.org/about',
      isPublic: true,
    });
  });

  it('keeps public pages out of search until a real citizen domain is configured', () => {
    expect(normalizeCitizenOrigin('http://localhost:5173')).toBeNull();
    expect(getPortalMetadata('/', undefined)).toMatchObject({
      robots: 'noindex,nofollow,noarchive',
      canonicalUrl: null,
      isPublic: true,
    });
  });

  it.each(['/submit', '/track/KHI-2026-1234', '/dashboard', '/department/login', '/admin/ai'])(
    'never indexes a private or operational route: %s',
    (pathname) => {
      expect(getPortalMetadata(pathname, citizenOrigin)).toMatchObject({
        robots: 'noindex,nofollow,noarchive',
        canonicalUrl: null,
        isPublic: false,
      });
    },
  );
});
