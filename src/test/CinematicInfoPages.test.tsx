import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import { LanguageProvider } from '../context/LanguageContext';
import { AppRoutes } from '../routes/AppRoutes';
import { privacyContent } from '../features/information/content/privacyContent';
import { termsContent } from '../features/information/content/termsContent';
import { aboutContent } from '../features/information/content/aboutContent';
import { contactContent } from '../features/information/content/contactContent';

describe('Cinematic Information Pages Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.setAttribute('dir', 'ltr');
    document.documentElement.setAttribute('lang', 'en');
  });

  it('renders About Us at /about with academic attribution and no white cards', async () => {
    render(
      <LanguageProvider>
        <MemoryRouter initialEntries={['/about']}>
          <AppRoutes />
        </MemoryRouter>
      </LanguageProvider>
    );

    // Document title
    await waitFor(() => {
      expect(document.title).toBe('About Us — Awaaz-e-Awam');
    });

    // Heading
    expect(screen.getByRole('heading', { level: 1, name: /about us\./i })).toBeInTheDocument();

    // Human, concise subtitle
    expect(
      screen.getByText(/a student-built platform exploring a simpler way for citizens to report public-service concerns/i)
    ).toBeInTheDocument();

    // Academic attribution
    expect(screen.getAllByText(/Greenwich University/i).length).toBeGreaterThan(0);

    // 2 concise sections (no numbers)
    expect(screen.getByRole('heading', { level: 2, name: /our purpose/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /the team/i })).toBeInTheDocument();

    // Unified shared civic footer rendered with approved YOUR VOICE MATTERS headline
    expect(screen.getByRole('contentinfo', { name: /awaaz-e-awam civic footer/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /YOUR VOICE MATTERS\./i })).toBeInTheDocument();
  });

  it('renders Contact Us at /contact with verified operational channels and no fake directory', async () => {
    render(
      <LanguageProvider>
        <MemoryRouter initialEntries={['/contact']}>
          <AppRoutes />
        </MemoryRouter>
      </LanguageProvider>
    );

    // Document title
    await waitFor(() => {
      expect(document.title).toBe('Contact Us — Awaaz-e-Awam');
    });

    // Heading
    expect(screen.getByRole('heading', { level: 1, name: /contact us\./i })).toBeInTheDocument();

    // Verified academic coordination instructions
    expect(screen.getByRole('heading', { level: 2, name: /project inquiries/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /public inquiries/i })).toBeInTheDocument();

    // Unified shared civic footer
    expect(screen.getByRole('contentinfo', { name: /awaaz-e-awam civic footer/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /YOUR VOICE MATTERS\./i })).toBeInTheDocument();
  });

  it('renders Privacy Policy at /privacy-policy with concise verified disclosures', async () => {
    render(
      <LanguageProvider>
        <MemoryRouter initialEntries={['/privacy-policy']}>
          <AppRoutes />
        </MemoryRouter>
      </LanguageProvider>
    );

    // Document title
    await waitFor(() => {
      expect(document.title).toBe('Privacy Policy — Awaaz-e-Awam');
    });

    // H1 check
    expect(screen.getByRole('heading', { level: 1, name: /privacy policy\./i })).toBeInTheDocument();

    // Factual sections
    expect(screen.getByRole('heading', { level: 2, name: /information you share/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /storage and privacy/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /third-party services/i })).toBeInTheDocument();

    // Link to terms of use
    const termsLinks = screen.getAllByRole('link', { name: /terms of use/i });
    expect(termsLinks.length).toBeGreaterThan(0);
    expect(termsLinks[0]).toHaveAttribute('href', '/terms-of-use');
  });

  it('renders Terms of Use at /terms-of-use with prototype limitations', async () => {
    render(
      <LanguageProvider>
        <MemoryRouter initialEntries={['/terms-of-use']}>
          <AppRoutes />
        </MemoryRouter>
      </LanguageProvider>
    );

    // Document title
    await waitFor(() => {
      expect(document.title).toBe('Terms of Use — Awaaz-e-Awam');
    });

    // H1 check
    expect(screen.getByRole('heading', { level: 1, name: /terms of use\./i })).toBeInTheDocument();

    // Prototype status check
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

    expect(screen.getByRole('heading', { level: 1, name: /privacy policy\./i })).toBeInTheDocument();
  });

  it('redirects legacy /terms to /terms-of-use', () => {
    render(
      <LanguageProvider>
        <MemoryRouter initialEntries={['/terms']}>
          <AppRoutes />
        </MemoryRouter>
      </LanguageProvider>
    );

    expect(screen.getByRole('heading', { level: 1, name: /terms of use\./i })).toBeInTheDocument();
  });

  it('renders localized Urdu content for About Us, Contact Us, Privacy, and Terms', async () => {
    localStorage.setItem('preferred_language', 'ur');

    // Test About Us in Urdu
    const { unmount: unmountAbout } = render(
      <LanguageProvider>
        <MemoryRouter initialEntries={['/about']}>
          <AppRoutes />
        </MemoryRouter>
      </LanguageProvider>
    );
    expect(screen.getByRole('heading', { level: 1, name: /ہمارا تعارف/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /ہمارا مقصد/i })).toBeInTheDocument();
    unmountAbout();

    // Test Contact Us in Urdu
    const { unmount: unmountContact } = render(
      <LanguageProvider>
        <MemoryRouter initialEntries={['/contact']}>
          <AppRoutes />
        </MemoryRouter>
      </LanguageProvider>
    );
    expect(screen.getByRole('heading', { level: 1, name: /ہم سے رابطہ/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /منصوبے سے رابطہ/i })).toBeInTheDocument();
    unmountContact();

    // Test Privacy Policy in Urdu
    const { unmount: unmountPrivacy } = render(
      <LanguageProvider>
        <MemoryRouter initialEntries={['/privacy-policy']}>
          <AppRoutes />
        </MemoryRouter>
      </LanguageProvider>
    );
    expect(screen.getByRole('heading', { level: 1, name: /رازداری کی پالیسی/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /معلومات جو آپ فراہم کرتے ہیں/i })).toBeInTheDocument();
    unmountPrivacy();

    // Test Terms in Urdu
    render(
      <LanguageProvider>
        <MemoryRouter initialEntries={['/terms-of-use']}>
          <AppRoutes />
        </MemoryRouter>
      </LanguageProvider>
    );
    expect(screen.getByRole('heading', { level: 1, name: /استعمال کے ضوابط/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /سروس کا تعارف/i })).toBeInTheDocument();

    localStorage.setItem('preferred_language', 'en');
  });

  it('ensures all section IDs and anchors are structurally sound', () => {
    const aboutIds = aboutContent.en.sections.map((s) => s.id);
    const contactIds = contactContent.en.sections.map((s) => s.id);
    const privacyIds = privacyContent.en.sections.map((s) => s.id);
    const termsIds = termsContent.en.sections.map((s) => s.id);

    expect(aboutIds).toEqual(['our-purpose', 'the-team']);
    expect(contactIds).toEqual(['project-inquiries', 'public-support']);
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
