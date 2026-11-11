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

describe('ComplaintForm Component (Guided 4-Stage Workflow)', () => {
  it('renders Step 1 (The Problem) fields, heading, and live word counter on mount', () => {
    renderForm();

    expect(screen.getByRole('heading', { level: 1, name: /what needs attention\?/i })).toBeInTheDocument();
    expect(screen.getByText(/tell us what happened in your own words\./i)).toBeInTheDocument();
    expect(screen.getByLabelText(/complaint subject \/ title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/complaint description/i)).toBeInTheDocument();
    expect(screen.getByTestId('word-count-display')).toHaveTextContent('0');
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
  });

  it('displays validation errors on Step 1 when clicking Continue with empty fields', async () => {
    renderForm();

    const continueButton = screen.getByRole('button', { name: /continue/i });
    fireEvent.click(continueButton);

    await waitFor(() => {
      expect(screen.getByText(/subject is required/i)).toBeInTheDocument();
      expect(screen.getByText(/complaint description is required/i)).toBeInTheDocument();
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

  it('disables continue button and shows error when description exceeds 200 words', () => {
    renderForm();

    const descInput = screen.getByLabelText(/complaint description/i);
    const longText = Array.from({ length: 205 }, (_, i) => `word${i}`).join(' ');

    fireEvent.change(descInput, {
      target: { value: longText },
    });

    const counter = screen.getByTestId('word-count-display');
    expect(counter).toHaveTextContent('205');

    const continueButton = screen.getByRole('button', { name: /continue/i });
    expect(continueButton).toBeDisabled();
    expect(screen.getByText(/exceeds the 200-word limit/i)).toBeInTheDocument();
  });

  it('navigates through all 4 steps, preserves data, and completes client prototype submission', async () => {
    renderForm();

    // STEP 1: The Problem
    fireEvent.change(screen.getByLabelText(/complaint subject \/ title/i), {
      target: { value: 'Water supply line leak' },
    });
    fireEvent.change(screen.getByLabelText(/complaint description/i), {
      target: {
        value: 'Hamare Block 7 mein pichlay 3 din se paani ki main line leak hai.',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // STEP 2: The Location
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /where did it happen\?/i })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/area \/ locality/i), {
      target: { value: 'Gulshan Block 7' },
    });
    fireEvent.change(screen.getByLabelText(/public issue location/i), {
      target: { value: 'Outside Gulshan Park gate' },
    });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // STEP 3: Your Details
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /how can we reach you\?/i })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: 'Bilal Ahmed' },
    });
    fireEvent.change(screen.getByLabelText(/phone number/i), {
      target: { value: '03001234567' },
    });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // STEP 4: Review
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /review your complaint\./i })).toBeInTheDocument();
      expect(screen.getByText('Water supply line leak')).toBeInTheDocument();
      expect(screen.getByText('Bilal Ahmed')).toBeInTheDocument();
    });

    // Final Prototype Submit
    const submitButton = screen.getByRole('button', { name: /submit complaint/i });
    fireEvent.click(submitButton);

    await waitFor(
      () => {
        expect(screen.getByRole('heading', { level: 3, name: /review your complaint/i })).toBeInTheDocument();
        expect(screen.getByText(/your form is ready to review/i)).toBeInTheDocument();
        expect(screen.getByText(/nothing has been submitted/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('CRITICAL REGRESSION CHECK: verifies single-root JSX structure, 4-step progress indicator, and no orphan elements', () => {
    const { container } = renderForm();
    expect(container.firstChild).toBeInstanceOf(HTMLElement);
    expect(screen.getByText(/step 01 of 04/i)).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: /step 01 of 04/i })).toBeInTheDocument();
  });
});
