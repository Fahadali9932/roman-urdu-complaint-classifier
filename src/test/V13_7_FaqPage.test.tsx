import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider, useLanguage } from '../context/LanguageContext';
import { FaqPage } from '../features/information/pages/FaqPage';

// Helper component that can toggle language for testing
const TestLanguageToggle: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  return (
    <button
      onClick={() => setLanguage(language === 'en' ? 'ur' : 'en')}
      data-testid="lang-toggle-btn"
    >
      Toggle Language
    </button>
  );
};

describe('V13.7 Professional FAQ Page', () => {
  it('renders all 12 questions and answers in English', () => {
    render(
      <MemoryRouter>
        <LanguageProvider>
          <FaqPage />
        </LanguageProvider>
      </MemoryRouter>
    );

    // Page title and description
    expect(screen.getByRole('heading', { name: /frequently asked questions/i })).toBeInTheDocument();
    expect(screen.getByText(/find answers about submitting civic complaints/i)).toBeInTheDocument();

    // Verify key questions exist in DOM
    expect(screen.getByText('What is Awaaz-e-Awam?')).toBeInTheDocument();
    expect(screen.getByText('How do I submit a complaint?')).toBeInTheDocument();
    expect(screen.getByText('Do I need an account to submit a complaint?')).toBeInTheDocument();
    expect(screen.getByText('How do I track my complaint?')).toBeInTheDocument();
    expect(screen.getByText('What is my tracking number?')).toBeInTheDocument();
    expect(screen.getByText('How is my complaint assigned to a department?')).toBeInTheDocument();
    expect(screen.getByText('Can a complaint be assigned to two departments?')).toBeInTheDocument();
    expect(screen.getByText('Is my personal information protected?')).toBeInTheDocument();
  });

  it('filters questions by category pills and search keyword', () => {
    render(
      <MemoryRouter>
        <LanguageProvider>
          <FaqPage />
        </LanguageProvider>
      </MemoryRouter>
    );

    // Click "Tracking & Numbers" category
    const trackingCategoryBtn = screen.getByRole('button', { name: /^tracking & numbers$/i });
    fireEvent.click(trackingCategoryBtn);

    // Tracking questions should be present
    expect(screen.getByText('What is my tracking number?')).toBeInTheDocument();
    // Non-tracking questions should not be visible
    expect(screen.queryByText('What is Awaaz-e-Awam?')).not.toBeInTheDocument();

    // Switch back to "All Questions"
    const allBtn = screen.getByRole('button', { name: /^all questions$/i });
    fireEvent.click(allBtn);

    // Search for "two departments"
    const searchInput = screen.getByPlaceholderText(/search questions or keywords/i);
    fireEvent.change(searchInput, { target: { value: 'two departments' } });

    expect(screen.getByText('Can a complaint be assigned to two departments?')).toBeInTheDocument();
  });

  it('expands accordion items on click and supports toggle', () => {
    render(
      <MemoryRouter>
        <LanguageProvider>
          <FaqPage />
        </LanguageProvider>
      </MemoryRouter>
    );

    const questionBtn = screen.getByRole('button', {
      name: /how do i submit a complaint\?/i,
    });

    // faq-2 is initially collapsed
    expect(questionBtn).toHaveAttribute('aria-expanded', 'false');

    // Click to expand
    fireEvent.click(questionBtn);
    expect(questionBtn).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByText(/click "write complaint", enter your contact information/i)
    ).toBeInTheDocument();

    // Click again to collapse
    fireEvent.click(questionBtn);
    expect(questionBtn).toHaveAttribute('aria-expanded', 'false');
  });

  it('supports Urdu language toggle displaying Urdu questions and answers', () => {
    render(
      <MemoryRouter>
        <LanguageProvider>
          <TestLanguageToggle />
          <FaqPage />
        </LanguageProvider>
      </MemoryRouter>
    );

    // Switch to Urdu
    const toggleBtn = screen.getByTestId('lang-toggle-btn');
    fireEvent.click(toggleBtn);

    // Verify Urdu title
    expect(screen.getByRole('heading', { name: /اکثر پوچھے جانے والے سوالات/i })).toBeInTheDocument();

    // Verify Urdu questions
    expect(screen.getByText('آوازِ عوام کیا ہے؟')).toBeInTheDocument();
    expect(screen.getByText('میں شکایت کیسے درج کروں؟')).toBeInTheDocument();
    expect(screen.getByText('کیا شکایت درج کروانے کے لیے اکاؤنٹ بنانا لازمی ہے؟')).toBeInTheDocument();
    expect(screen.getByText('کیا میری ذاتی معلومات محفوظ ہیں؟')).toBeInTheDocument();
  });
});
