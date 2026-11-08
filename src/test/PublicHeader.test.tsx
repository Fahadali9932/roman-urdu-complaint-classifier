import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LanguageProvider } from '../context/LanguageContext';
import { PublicHeader } from '../components/layout/PublicHeader';

const renderWithProviders = () => {
  return render(
    <BrowserRouter>
      <LanguageProvider>
        <PublicHeader />
      </LanguageProvider>
    </BrowserRouter>
  );
};

describe('PublicHeader Component', () => {
  beforeEach(() => {
    document.documentElement.setAttribute('dir', 'ltr');
    document.documentElement.setAttribute('lang', 'en');
  });

  it('renders brand wordmark and all navigation links', () => {
    renderWithProviders();

    // Brand wordmark
    expect(screen.getByLabelText(/awaaz-e-awam home/i)).toBeInTheDocument();
    expect(screen.getByText('Awaaz-e-Awam')).toBeInTheDocument();

    // Navigation links in desktop navigation
    const desktopNav = screen.getByLabelText(/desktop primary navigation/i);
    expect(desktopNav).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /my complaints/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /write complaint/i })).toBeInTheDocument();

    // Language toggle and account link
    expect(screen.getByLabelText(/toggle interface language/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /account/i })).toBeInTheDocument();
  });

  it('opens mobile drawer when menu toggle button is clicked and closes on Escape key', () => {
    renderWithProviders();

    const menuButton = screen.getByLabelText(/open navigation menu/i);
    expect(menuButton).toBeInTheDocument();
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');

    // Click to open
    fireEvent.click(menuButton);
    expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('dialog', { name: /mobile navigation/i })).toBeInTheDocument();

    // Press Escape key
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: /mobile navigation/i })).not.toBeInTheDocument();
  });

  it('closes mobile drawer when backdrop is clicked', () => {
    renderWithProviders();

    const menuButton = screen.getByLabelText(/open navigation menu/i);
    fireEvent.click(menuButton);
    expect(screen.getByRole('dialog', { name: /mobile navigation/i })).toBeInTheDocument();

    // Click backdrop
    const backdrop = document.querySelector('[aria-hidden="true"]');
    if (backdrop) {
      fireEvent.click(backdrop);
    }
    expect(screen.queryByRole('dialog', { name: /mobile navigation/i })).not.toBeInTheDocument();
  });
});
