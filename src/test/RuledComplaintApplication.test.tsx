import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LanguageProvider } from '../context/LanguageContext';
import { ComplaintForm } from '../features/citizen/ComplaintForm';
import { KarachiAreaCombobox } from '../features/citizen/components/KarachiAreaCombobox';
import { RuledComplaintTextarea } from '../features/citizen/components/RuledComplaintTextarea';

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <LanguageProvider>{ui}</LanguageProvider>
    </BrowserRouter>
  );
};

describe('Ruled Complaint Application Experience', () => {
  it('renders formal application letterhead, current date, and addressed recipient', () => {
    renderWithProviders(<ComplaintForm />);

    expect(screen.getByText(/PUBLIC SERVICE COMPLAINT/i)).toBeInTheDocument();
    expect(screen.getByText(/Concerned Public Service Department/i)).toBeInTheDocument();
    expect(screen.getByText(/Karachi, Sindh, Pakistan/i)).toBeInTheDocument();
    expect(screen.getByText(/Date:/i)).toBeInTheDocument();
  });

  it('renders RuledComplaintTextarea with 32px ruled styling and live counter', () => {
    const handleChange = vi.fn();
    renderWithProviders(
      <RuledComplaintTextarea
        label="Complaint Description"
        value="Pani ki line toot gayi hai"
        onChange={handleChange}
        wordCount={6}
      />
    );

    const textarea = screen.getByRole('textbox', { name: /complaint description/i });
    expect(textarea).toHaveValue('Pani ki line toot gayi hai');
    expect(textarea).toHaveAttribute('style', expect.stringContaining('line-height: 32px'));
    expect(screen.getByTestId('word-count-display')).toHaveTextContent('6');
  });

  it('detects Roman Urdu Latin text as LTR and Urdu script as RTL in ruled textarea', () => {
    const { rerender } = renderWithProviders(
      <RuledComplaintTextarea
        label="Complaint Description"
        value="Bijli subah 8 bajay se gayab hai"
        onChange={() => {}}
        wordCount={7}
      />
    );

    const textarea = screen.getByRole('textbox', { name: /complaint description/i });
    expect(textarea).toHaveAttribute('dir', 'ltr');

    // Rerender with Urdu script
    rerender(
      <BrowserRouter>
        <LanguageProvider>
          <RuledComplaintTextarea
            label="Complaint Description"
            value="پانی کی سپلائی پچھلے تین دن سے بند ہے۔"
            onChange={() => {}}
            wordCount={8}
          />
        </LanguageProvider>
      </BrowserRouter>
    );

    expect(screen.getByRole('textbox', { name: /complaint description/i })).toHaveAttribute('dir', 'rtl');
  });

  it('interacts with KarachiAreaCombobox to search, select, and clear', () => {
    const handleChange = vi.fn();
    renderWithProviders(
      <KarachiAreaCombobox
        label="Area / Locality"
        value=""
        onChange={handleChange}
      />
    );

    const input = screen.getByRole('combobox', { name: /area \/ locality/i });
    expect(input).toBeInTheDocument();

    // Type "Clifton"
    fireEvent.change(input, { target: { value: 'Clifton' } });
    expect(input).toHaveValue('Clifton');

    // Dropdown listbox appears
    const listbox = screen.getByRole('listbox');
    expect(listbox).toBeInTheDocument();

    // Select Clifton Block 2
    const option = screen.getByText(/Clifton Block 2/i);
    fireEvent.click(option);

    expect(handleChange).toHaveBeenCalledWith('Clifton Block 2', 'District South');
  });

  it('allows manual locality entry when "My area is not listed" is chosen', () => {
    const handleChange = vi.fn();
    renderWithProviders(
      <KarachiAreaCombobox
        label="Area / Locality"
        value=""
        onChange={handleChange}
      />
    );

    const input = screen.getByRole('combobox', { name: /area \/ locality/i });
    fireEvent.change(input, { target: { value: 'Goth Unlisted' } });

    // Click "My area is not listed"
    const manualOption = screen.getByText(/My area is not listed/i);
    fireEvent.click(manualOption);

    expect(handleChange).toHaveBeenCalledWith('Goth Unlisted');
  });

  it('resets form fields cleanly when "Clear Form" is clicked', () => {
    renderWithProviders(<ComplaintForm />);

    const nameInput = screen.getByLabelText(/full name/i);
    fireEvent.change(nameInput, { target: { value: 'Tariq Mehmood' } });
    expect(nameInput).toHaveValue('Tariq Mehmood');

    const clearButton = screen.getByRole('button', { name: /clear form/i });
    fireEvent.click(clearButton);

    expect(screen.getByLabelText(/full name/i)).toHaveValue('');
  });
});
