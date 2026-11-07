import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LanguageProvider } from '../context/LanguageContext';
import { ComplaintForm } from '../features/citizen/ComplaintForm';

const renderForm = () => {
  return render(
    <BrowserRouter>
      <LanguageProvider>
        <ComplaintForm />
      </LanguageProvider>
    </BrowserRouter>
  );
};

describe('ComplaintForm Component', () => {
  it('renders all required form input fields and live word counter', () => {
    renderForm();

    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/karachi district/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/area \/ locality/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/complaint subject \/ title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/complaint description/i)).toBeInTheDocument();
    expect(screen.getByTestId('word-count-display')).toHaveTextContent('0');
  });

  it('displays client-side validation errors when submitting with empty fields', async () => {
    renderForm();

    const submitButton = screen.getByRole('button', { name: /submit complaint/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/full name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/valid pakistani phone number is required/i)).toBeInTheDocument();
      expect(screen.getByText(/please select a karachi district/i)).toBeInTheDocument();
      expect(screen.getByText(/locality\/area is required/i)).toBeInTheDocument();
    });
  });

  it('updates live word counter when typing Roman Urdu description', () => {
    renderForm();

    const descInput = screen.getByLabelText(/complaint description/i);
    fireEvent.change(descInput, {
      target: { value: 'Hamare area mein paani bilkul band hai' },
    });

    const counter = screen.getByTestId('word-count-display');
    expect(counter).toHaveTextContent('7');
  });

  it('disables submit button and shows error when description exceeds 200 words', () => {
    renderForm();

    const descInput = screen.getByLabelText(/complaint description/i);
    const longText = Array.from({ length: 205 }, (_, i) => `word${i}`).join(' ');

    fireEvent.change(descInput, {
      target: { value: longText },
    });

    const counter = screen.getByTestId('word-count-display');
    expect(counter).toHaveTextContent('205');

    const submitButton = screen.getByRole('button', { name: /submit complaint/i });
    expect(submitButton).toBeDisabled();
    expect(screen.getByText(/exceeds the 200-word limit/i)).toBeInTheDocument();
  });

  it('submits valid form and reveals client prototype verification modal', async () => {
    renderForm();

    // Fill valid data
    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: 'Bilal Ahmed' },
    });
    fireEvent.change(screen.getByLabelText(/phone number/i), {
      target: { value: '03001234567' },
    });
    fireEvent.change(screen.getByLabelText(/karachi district/i), {
      target: { value: 'District East' },
    });
    fireEvent.change(screen.getByLabelText(/area \/ locality/i), {
      target: { value: 'Gulshan Block 7' },
    });
    fireEvent.change(screen.getByLabelText(/complaint subject \/ title/i), {
      target: { value: 'Water supply line leak' },
    });
    fireEvent.change(screen.getByLabelText(/complaint description/i), {
      target: {
        value: 'Hamare Block 7 mein pichlay 3 din se paani ki main line leak hai.',
      },
    });

    const submitButton = screen.getByRole('button', { name: /submit complaint/i });
    fireEvent.click(submitButton);

    // Wait for client-side validation completion
    await waitFor(
      () => {
        expect(screen.getByText(/complaint validated/i)).toBeInTheDocument();
        expect(screen.getByText(/application verified successfully/i)).toBeInTheDocument();
        expect(screen.getByText(/client-side prototype notice/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });
});
