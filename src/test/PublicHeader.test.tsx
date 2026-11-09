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
    const backdrop = screen.getByTestId('menu-backdrop');
    fireEvent.click(backdrop);
    expect(screen.queryByRole('dialog', { name: /mobile navigation/i })).not.toBeInTheDocument();
  });

  it('ensures exactly one navigation item is active on initial load and Write Complaint is not permanently black', () => {
    renderWithProviders();

    const desktopNav = screen.getByLabelText(/desktop primary navigation/i);
    expect(desktopNav).toBeInTheDocument();

    // Find all links in desktop nav
    const homeLink = desktopNav.querySelector('a[href="#hero"]');
    const writeLink = desktopNav.querySelector('a[href="/submit"]');
    const myComplaintsLink = desktopNav.querySelector('a[href="/dashboard"]');
    const stepsLink = desktopNav.querySelector('a[href="#steps"]');

    expect(homeLink).toBeInTheDocument();
    expect(writeLink).toBeInTheDocument();
    expect(myComplaintsLink).toBeInTheDocument();
    expect(stepsLink).toBeInTheDocument();

    // Home should be active with Blood Maroon #681822
    expect(homeLink?.className).toContain('bg-[#681822]');
    expect(homeLink?.className).toContain('text-[#FFFFFF]');

    // Other links must NOT be active and Write Complaint must NOT have permanent black background
    expect(writeLink?.className).not.toContain('bg-[#141414]');
    expect(writeLink?.className).not.toContain('bg-[#681822]');
    expect(myComplaintsLink?.className).not.toContain('bg-[#681822]');
    expect(stepsLink?.className).not.toContain('bg-[#681822]');

    // Exactly one link inside desktopNav contains bg-[#681822]
    const activeElements = desktopNav.querySelectorAll('.bg-\\[\\#681822\\]');
    expect(activeElements.length).toBe(1);
  });

  it('maintains accessible navigation and account controls', () => {
    renderWithProviders();

    const accountLink = screen.getByRole('link', { name: /account/i });
    expect(accountLink).toBeInTheDocument();
    expect(accountLink).toHaveAttribute('href', '/login');

    const brand = screen.getByText('Awaaz-e-Awam');
    expect(brand).toBeInTheDocument();
  });
});
