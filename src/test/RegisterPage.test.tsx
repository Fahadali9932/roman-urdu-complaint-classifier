import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider, useLanguage } from '../context/LanguageContext';
import { RegisterPage } from '../features/auth/RegisterPage';
import React from 'react';

const renderRegister = () => {
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <RegisterPage />
      </LanguageProvider>
    </MemoryRouter>
  );
};

const LanguageSwitcher: React.FC<{ targetLang: 'en' | 'ur' }> = ({ targetLang }) => {
  const { language, setLanguage } = useLanguage();
  React.useEffect(() => {
    if (language !== targetLang) {
      setLanguage(targetLang);
    }
  }, [language, setLanguage, targetLang]);
  return null;
};

const renderRegisterWithLang = (lang: 'en' | 'ur') => {
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <LanguageSwitcher targetLang={lang} />
        <RegisterPage />
      </LanguageProvider>
    </MemoryRouter>
  );
};

describe('RegisterPage Component (Two-Column Reference Redesign)', () => {
  it('renders two-column composition with display heading, emblem, and all registration fields', () => {
    renderRegister();

    // Heading and brand emblem
    expect(screen.getByRole('heading', { level: 1, name: /Create an account/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Awaaz-e-Awam/i).length).toBeGreaterThanOrEqual(1);

    // Form input fields
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Phone Number/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/••••••••/i)).toBeInTheDocument();

    // Primary button and sign-in link
    expect(screen.getByRole('button', { name: /Create Account/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Log in/i })).toBeInTheDocument();

    expect(screen.getByText(/Create a secure citizen account to claim a guest complaint/i)).toBeInTheDocument();
  });

  it('renders the atmospheric visual artwork panel with topic chips and value proposition', () => {
    renderRegister();

    // Artwork panel headline & copy
    expect(screen.getByRole('heading', { level: 2, name: /A simpler way to report public-service issues/i })).toBeInTheDocument();
    expect(screen.getByText(/Write your complaint in everyday language and follow its progress in one place/i)).toBeInTheDocument();

    // Topic chips
    expect(screen.getByText(/Write a complaint/i)).toBeInTheDocument();
    expect(screen.getByText(/Track progress/i)).toBeInTheDocument();
  });

  it('toggles password visibility between password and text modes', () => {
    renderRegister();

    const passwordInput = screen.getByPlaceholderText(/••••••••/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    // Click show password
    const toggleBtn = screen.getByRole('button', { name: /Show password/i });
    fireEvent.click(toggleBtn);

    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: /Hide password/i })).toBeInTheDocument();

    // Click hide password
    fireEvent.click(screen.getByRole('button', { name: /Hide password/i }));
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: /Show password/i })).toBeInTheDocument();
  });

  it('handles user input and reports a truthful configuration error when auth is unavailable', async () => {
    renderRegister();

    const nameInput = screen.getByLabelText(/Full Name/i);
    const emailInput = screen.getByLabelText(/Email Address/i);
    const phoneInput = screen.getByLabelText(/Phone Number/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/i);

    fireEvent.change(nameInput, { target: { value: 'Ahmed Khan' } });
    fireEvent.change(emailInput, { target: { value: 'ahmed@example.com' } });
    fireEvent.change(phoneInput, { target: { value: '03001234567' } });
    fireEvent.change(passwordInput, { target: { value: 'Secret123!' } });

    expect(nameInput).toHaveAttribute('value', 'Ahmed Khan');
    expect(emailInput).toHaveAttribute('value', 'ahmed@example.com');
    expect(phoneInput).toHaveAttribute('value', '03001234567');
    expect(passwordInput).toHaveAttribute('value', 'Secret123!');

    const submitBtn = screen.getByRole('button', { name: /Create Account/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Live registration is not configured/i)).toBeInTheDocument();
    });
  });

  it('renders seamlessly in Urdu RTL mode with translated labels and artwork', async () => {
    renderRegisterWithLang('ur');

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /اکاؤنٹ بنائیں/i })).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/پورا نام/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/ای میل ایڈریس/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/فون نمبر/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/••••••••/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /اکاؤنٹ بنائیں/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /عوامی مسائل کی شکایت کا آسان اور شفاف طریقہ/i })).toBeInTheDocument();
  });
});
