import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../context/LanguageContext';
import { LoginPage } from '../features/auth/LoginPage';

const renderLogin = () => {
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <LoginPage />
      </LanguageProvider>
    </MemoryRouter>
  );
};

describe('LoginPage Component', () => {
  it('renders a live citizen sign-in form with password recovery', () => {
    renderLogin();

    expect(screen.getByRole('heading', { name: /Sign in to Citizen Portal/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/citizen@example.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/••••••••/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign in securely/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Forgot password/i })).toBeInTheDocument();
    expect(screen.getByText(/Secure citizen access/i)).toBeInTheDocument();
  });

  it('toggles password visibility when the reveal button is clicked', () => {
    renderLogin();

    const passwordInput = screen.getByPlaceholderText(/••••••••/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleButton = screen.getByRole('button', { name: /Show password/i });
    fireEvent.click(toggleButton);

    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: /Hide password/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Hide password/i }));
    expect(passwordInput).toHaveAttribute('type', 'password');
  });
});

