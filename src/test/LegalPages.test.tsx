import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { LanguageProvider } from '../context/LanguageContext';
import { AppRoutes } from '../routes/AppRoutes';
import { privacyContent as privacyPolicyContent } from '../features/information/content/privacyContent';
import { termsContent as termsOfUseContent } from '../features/information/content/termsContent';

describe('Legal Pages (Privacy Policy & Terms of Use)', () => {
  it('renders Privacy Policy at /privacy-policy with verified disclosures', () => {
    render(
      <LanguageProvider>
        <MemoryRouter initialEntries={['/privacy-policy']}>
          <AppRoutes />
        </MemoryRouter>
      </LanguageProvider>
    );

    // H1 check
    expect(screen.getByRole('heading', { level: 1, name: /privacy policy/i })).toBeInTheDocument();

    // Substantive section checks
    expect(screen.getByRole('heading', { level: 2, name: /information you share/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /storage and privacy/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /third-party services/i })).toBeInTheDocument();

    // Link to terms of use
    const termsLinks = screen.getAllByRole('link', { name: /terms of use/i });
    expect(termsLinks.length).toBeGreaterThan(0);
    expect(termsLinks[0]).toHaveAttribute('href', '/terms-of-use');
  });

  it('renders Terms of Use at /terms-of-use with prototype limitations', () => {
    render(
      <LanguageProvider>
        <MemoryRouter initialEntries={['/terms-of-use']}>
          <AppRoutes />
        </MemoryRouter>
      </LanguageProvider>
    );

    // H1 check
    expect(screen.getByRole('heading', { level: 1, name: /terms of use/i })).toBeInTheDocument();

    // Prototype status and limitation checks
    expect(screen.getByRole('heading', { level: 2, name: /about the service/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /complaint submissions/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /service limitations/i })).toBeInTheDocument();

    // Link to privacy policy
    const privacyLinks = screen.getAllByRole('link', { name: /privacy policy/i });
    expect(privacyLinks.length).toBeGreaterThan(0);
    expect(privacyLinks[0]).toHaveAttribute('href', '/privacy-policy');
  });

  it('redirects legacy /privacy to /privacy-policy', () => {
    render(
      <LanguageProvider>
        <MemoryRouter initialEntries={['/privacy']}>
          <AppRoutes />
        </MemoryRouter>
      </LanguageProvider>
    );

    expect(screen.getByRole('heading', { level: 1, name: /privacy policy/i })).toBeInTheDocument();
  });

  it('redirects legacy /terms to /terms-of-use', () => {
    render(
      <LanguageProvider>
        <MemoryRouter initialEntries={['/terms']}>
          <AppRoutes />
        </MemoryRouter>
      </LanguageProvider>
    );

    expect(screen.getByRole('heading', { level: 1, name: /terms of use/i })).toBeInTheDocument();
  });

  it('renders localized Urdu content for Privacy Policy and Terms of Use', () => {
    // Save Urdu preference in localStorage
    localStorage.setItem('preferred_language', 'ur');

    render(
      <LanguageProvider>
        <MemoryRouter initialEntries={['/privacy-policy']}>
          <AppRoutes />
        </MemoryRouter>
      </LanguageProvider>
    );

    // Urdu H1 and sections
    expect(screen.getByRole('heading', { level: 1, name: /رازداری کی پالیسی/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /معلومات جو آپ فراہم کرتے ہیں/i })).toBeInTheDocument();

    // Restore to English
    localStorage.setItem('preferred_language', 'en');
  });

  it('ensures all section anchors correspond to actual section IDs', () => {
    const privacyIds = privacyPolicyContent.en.sections.map((s) => s.id);
    const termsIds = termsOfUseContent.en.sections.map((s) => s.id);

    expect(privacyIds).toEqual([
      'information-you-share',
      'how-we-use-information',
      'storage-and-privacy',
      'third-party-services',
      'questions-and-updates',
    ]);

    expect(termsIds).toEqual([
      'about-service',
      'using-platform',
      'complaint-submissions',
      'service-limitations',
      'privacy-and-updates',
    ]);
  });
});
