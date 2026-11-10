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

    // Eyebrow and academic attribution
    expect(screen.getByText(/academic research initiative · awaaz-e-awam/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Greenwich University, Karachi/i).length).toBeGreaterThan(0);

    // 3 concise sections
    expect(screen.getByRole('heading', { level: 2, name: /our purpose/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /the academic project/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /what we are building/i })).toBeInTheDocument();

    // Compact footer rendered without duplicate #footer monument hero
    expect(screen.getByRole('contentinfo', { name: /awaaz-e-awam informational footer/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/awaaz-e-awam civic footer/i)).not.toBeInTheDocument();
  });

  it('renders Contact Us at /contact with verified operational channels and emergency hotlines', async () => {
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

    // Eyebrow
    expect(screen.getByText(/communication & operational guidelines · awaaz-e-awam/i)).toBeInTheDocument();

    // Academic coordination instructions
    expect(screen.getByRole('heading', { level: 2, name: /academic & evaluation inquiries/i })).toBeInTheDocument();

    // Official municipal hotline guidance
    expect(screen.getByRole('heading', { level: 2, name: /official civic grievances & emergencies/i })).toBeInTheDocument();
    expect(screen.getByText(/Karachi Metropolitan Corporation \(KMC\) Citizen Helpline: Dial 1339/i)).toBeInTheDocument();
    expect(screen.getByText(/K-Electric Emergency Helpline: Dial 118/i)).toBeInTheDocument();

    // No duplicate #footer monument
    expect(screen.getByRole('contentinfo', { name: /awaaz-e-awam informational footer/i })).toBeInTheDocument();
  });

  it('renders Privacy Policy at /privacy-policy with verified academic disclosures', async () => {
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

    // Academic disclosure check
    expect(screen.getAllByText(/Greenwich University, Karachi/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/academic project disclosure · awaaz-e-awam/i)).toBeInTheDocument();

    // Factual sections
    expect(screen.getByRole('heading', { level: 2, name: /about awaaz-e-awam/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /storage and data retention/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /cookies and browser localstorage/i })).toBeInTheDocument();

    // Table of contents rendered
    const tocs = screen.getAllByLabelText(/on this page/i);
    expect(tocs.length).toBeGreaterThan(0);

    // Link to terms of use
    expect(screen.getByRole('link', { name: /read terms of use/i })).toHaveAttribute('href', '/terms-of-use');
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
    expect(screen.getByRole('heading', { level: 2, name: /prototype status & no official filing/i })).toBeInTheDocument();
    expect(screen.getByText(/NOT an official government grievance portal/i)).toBeInTheDocument();

    // Acceptable use check
    expect(screen.getByRole('heading', { level: 2, name: /acceptable use guidelines/i })).toBeInTheDocument();

    // Link to privacy policy
    expect(screen.getByRole('link', { name: /read privacy policy/i })).toHaveAttribute('href', '/privacy-policy');
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
    expect(screen.getByRole('heading', { level: 2, name: /تعلیمی و تحقیقی رابطہ/i })).toBeInTheDocument();
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
    expect(screen.getByRole('heading', { level: 2, name: /منصوبے کا تعارف اور دائرہ کار/i })).toBeInTheDocument();
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
    expect(screen.getByRole('heading', { level: 2, name: /پلیٹ فارم کا تعارف/i })).toBeInTheDocument();

    localStorage.setItem('preferred_language', 'en');
  });

  it('ensures all section IDs and anchors are structurally sound', () => {
    const aboutIds = aboutContent.en.sections.map((s) => s.id);
    const contactIds = contactContent.en.sections.map((s) => s.id);
    const privacyIds = privacyContent.en.sections.map((s) => s.id);
    const termsIds = termsContent.en.sections.map((s) => s.id);

    expect(aboutIds).toEqual(['our-purpose', 'the-project', 'what-we-are-building']);
    expect(contactIds).toEqual(['academic-inquiries', 'official-grievances', 'prototype-communication-notice']);
    expect(privacyIds.length).toBe(10);
    expect(termsIds.length).toBe(12);
  });
});
