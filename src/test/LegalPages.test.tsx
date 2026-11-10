import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { LanguageProvider } from '../context/LanguageContext';
import { AppRoutes } from '../routes/AppRoutes';
import { privacyContent as privacyPolicyContent } from '../features/information/content/privacyContent';
import { termsContent as termsOfUseContent } from '../features/information/content/termsContent';

describe('Legal Pages (Privacy Policy & Terms of Use)', () => {
  it('renders Privacy Policy at /privacy-policy with verified academic disclosure', () => {
    render(
      <LanguageProvider>
        <MemoryRouter initialEntries={['/privacy-policy']}>
          <AppRoutes />
        </MemoryRouter>
      </LanguageProvider>
    );

    // H1 check
    expect(screen.getByRole('heading', { level: 1, name: /privacy policy/i })).toBeInTheDocument();

    // Academic disclosure check
    expect(screen.getAllByText(/Greenwich University, Karachi/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/academic project disclosure · awaaz-e-awam/i)).toBeInTheDocument();

    // Verified section checks
    expect(screen.getByRole('heading', { level: 2, name: /about awaaz-e-awam/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /storage and data retention/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /cookies and browser localstorage/i })).toBeInTheDocument();

    // Table of contents rendered
    const tocs = screen.getAllByLabelText(/on this page/i);
    expect(tocs.length).toBeGreaterThan(0);

    // Link to terms of use
    expect(screen.getByRole('link', { name: /read terms of use/i })).toHaveAttribute('href', '/terms-of-use');
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
    expect(screen.getByText(/تعلیمی منصوبے کی وضاحتی رپورٹ • آوازِ عوام/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /منصوبے کا تعارف اور دائرہ کار/i })).toBeInTheDocument();

    // Restore to English
    localStorage.setItem('preferred_language', 'en');
  });

  it('ensures all TOC section anchors correspond to actual section IDs', () => {
    const privacyIds = privacyPolicyContent.en.sections.map((s) => s.id);
    const termsIds = termsOfUseContent.en.sections.map((s) => s.id);

    expect(privacyIds).toEqual([
      'about-platform',
      'information-you-enter',
      'how-information-is-processed',
      'storage-and-retention',
      'access-controls',
      'third-party-services',
      'cookies-local-storage',
      'security-limitations',
      'data-inquiries',
      'policy-updates',
    ]);

    expect(termsIds).toEqual([
      'about-platform',
      'purpose-of-service',
      'prototype-status',
      'acceptable-use',
      'accounts-and-access',
      'complaint-submission',
      'classification-and-routing',
      'status-tracking',
      'privacy-reference',
      'service-limitations',
      'modifications-to-terms',
      'academic-contact',
    ]);
  });
});
