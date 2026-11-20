import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LanguageProvider } from '../context/LanguageContext';
import { AppLayout } from '../components/layout/AppLayout';
import { FaqPage } from '../features/information/pages/FaqPage';

const renderFaqRoute = () => render(
  <MemoryRouter initialEntries={['/faq']}>
    <LanguageProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/faq" element={<FaqPage />} />
        </Route>
      </Routes>
    </LanguageProvider>
  </MemoryRouter>
);

describe('V13.8 Kinetic Civic Design', () => {
  it('keeps the light FAQ header readable instead of white-on-white', () => {
    renderFaqRoute();
    const brand = screen.getByLabelText('Awaaz-e-Awam Home').querySelector('span');
    expect(brand?.className).toContain('text-[#141414]');
    expect(brand?.className).not.toContain('text-[#FFFFFF]');
  });

  it('renders broad, readable questions without the artificial footer gap', () => {
    renderFaqRoute();
    const faqHeading = screen.getByRole('heading', { name: /frequently asked questions/i });
    expect(faqHeading.className).toContain('clamp(2.6rem');

    const question = screen.getByRole('button', { name: /what is awaaz-e-awam/i });
    expect(question.className).toContain('min-h-[88px]');
    expect(question.closest('[data-scroll-depth]')).toBeInTheDocument();

    // Old layouts inserted an empty 40–50vh spacer before the footer.
    const main = screen.getByRole('main');
    expect(main.querySelector('div[aria-hidden="true"]')).toBeNull();
  });

  it('does not hide the page when scroll observers are unavailable', () => {
    renderFaqRoute();
    expect(screen.getByRole('heading', { name: /frequently asked questions/i })).toBeVisible();
    expect(document.querySelectorAll('.civic-reveal-pending')).toHaveLength(0);
  });
});
