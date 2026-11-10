import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LanguageProvider } from '../context/LanguageContext';
import { ComplaintForm } from '../features/citizen/ComplaintForm';

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <LanguageProvider>{ui}</LanguageProvider>
    </BrowserRouter>
  );
};

describe('Professional Civic Complaint Form Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('renders modern civic editorial layout with exactly three unnumbered sections and no fake paper styling', () => {
    renderWithProviders(<ComplaintForm />);

    // Page Heading & Subtitle
    expect(screen.getByRole('heading', { level: 1, name: /WRITE A COMPLAINT/i })).toBeInTheDocument();
    expect(screen.getByText(/Tell us what happened and where/i)).toBeInTheDocument();

    // Three clean editorial section headings (Unnumbered)
    expect(screen.getByText('APPLICANT DETAILS')).toBeInTheDocument();
    expect(screen.getByText('PROBLEM LOCATION')).toBeInTheDocument();
    expect(screen.getByText('COMPLAINT DETAILS')).toBeInTheDocument();

    // Verify absence of rejected formal paper decorations
    expect(screen.queryByText(/PUBLIC SERVICE COMPLAINT/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Concerned Public Service Department/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/CIVIC GRIEVANCE FRAMEWORK/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ACADEMIC CAPSTONE EVALUATION/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Ruled writing surface/i)).not.toBeInTheDocument();
  });

  it('renders applicant details inputs including optional email and separate residential address', () => {
    renderWithProviders(<ComplaintForm />);

    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/applicant address/i)).toBeInTheDocument();
  });

  it('automatically identifies verified district when citizen enters or selects a Karachi locality (e.g. DHA Phase 6 -> District South)', async () => {
    renderWithProviders(<ComplaintForm />);

    const localityInput = screen.getByLabelText(/area \/ locality/i);
    fireEvent.change(localityInput, { target: { value: 'DHA Phase 6' } });

    await waitFor(() => {
      // District South should be automatically resolved and displayed
      expect(screen.getByDisplayValue(/District South/i)).toBeInTheDocument();
      expect(screen.getByText(/automatically identified/i)).toBeInTheDocument();
    });
  });

  it('PREVENTS STALE DISTRICT REGRESSION: never allows DHA Phase 6 to be paired with District Central', async () => {
    renderWithProviders(<ComplaintForm />);

    const localityInput = screen.getByLabelText(/area \/ locality/i);

    // First enter an area in District Central (e.g. Federal B Area)
    fireEvent.change(localityInput, { target: { value: 'Federal B Area' } });
    await waitFor(() => {
      expect(screen.getByDisplayValue(/District Central/i)).toBeInTheDocument();
    });

    // Now change locality to DHA Phase 6 (which is in District South)
    fireEvent.change(localityInput, { target: { value: 'DHA Phase 6' } });
    await waitFor(() => {
      // District Central MUST BE CLEARED and replaced by District South
      expect(screen.queryByDisplayValue(/District Central/i)).not.toBeInTheDocument();
      expect(screen.getByDisplayValue(/District South/i)).toBeInTheDocument();
    });
  });

  it('prompts for district confirmation when entering an unlisted or custom locality', async () => {
    renderWithProviders(<ComplaintForm />);

    const localityInput = screen.getByLabelText(/area \/ locality/i);
    fireEvent.change(localityInput, { target: { value: 'Goth Unlisted Rural Area' } });

    await waitFor(() => {
      expect(screen.getByText(/district needs confirmation/i)).toBeInTheDocument();
      // Dropdown should be available to manually confirm
      expect(screen.getByRole('combobox', { name: /karachi district/i })).toBeInTheDocument();
    });
  });

  it('PRIVACY ASSURANCE: phone number and applicant residential address are not saved to localStorage or sessionStorage', async () => {
    renderWithProviders(<ComplaintForm />);

    // Fill applicant fields
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Tariq Mehmood' } });
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '03001234567' } });
    fireEvent.change(screen.getByLabelText(/applicant address/i), { target: { value: 'House 42, Private Street' } });

    // Fill location & complaint
    fireEvent.change(screen.getByLabelText(/area \/ locality/i), { target: { value: 'Clifton Block 2' } });
    fireEvent.change(screen.getByLabelText(/street, block or nearby landmark/i), { target: { value: 'Near Boat Basin' } });
    fireEvent.change(screen.getByLabelText(/subject/i), { target: { value: 'Broken drainage cover' } });
    fireEvent.change(screen.getByLabelText(/describe your complaint/i), { target: { value: 'Main gutter ka dhakkan toota hua hai.' } });

    // Click Review Complaint
    const submitBtn = screen.getByRole('button', { name: /review complaint/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/review your complaint/i)).toBeInTheDocument();
    });

    // Verify localStorage & sessionStorage are strictly devoid of phone and private address
    expect(localStorage.getItem('phone')).toBeNull();
    expect(localStorage.getItem('applicantAddress')).toBeNull();
    expect(localStorage.getItem('citizenPhone')).toBeNull();
    expect(sessionStorage.getItem('phone')).toBeNull();
    expect(sessionStorage.getItem('applicantAddress')).toBeNull();
    expect(sessionStorage.getItem('citizenPhone')).toBeNull();

    // Check raw storage dumps for any leaked personal strings
    const localValues = Object.values(localStorage);
    const sessionValues = Object.values(sessionStorage);
    expect(localValues.some((v) => v.includes('03001234567'))).toBe(false);
    expect(localValues.some((v) => v.includes('Private Street'))).toBe(false);
    expect(sessionValues.some((v) => v.includes('03001234567'))).toBe(false);
    expect(sessionValues.some((v) => v.includes('Private Street'))).toBe(false);
  });

  it('clears all fields and resets state when Clear button is clicked', () => {
    renderWithProviders(<ComplaintForm />);

    const nameInput = screen.getByLabelText(/full name/i);
    fireEvent.change(nameInput, { target: { value: 'Asad Khan' } });
    expect(nameInput).toHaveValue('Asad Khan');

    const clearButton = screen.getByRole('button', { name: /clear/i });
    fireEvent.click(clearButton);

    expect(screen.getByLabelText(/full name/i)).toHaveValue('');
  });

  it('synchronizes document.title on mount eliminating stale title regression', () => {
    // Simulate navigation by setting a stale title
    document.title = 'Terms of Use — Awaaz-e-Awam';
    renderWithProviders(<ComplaintForm />);
    expect(document.title).toBe('Write a Complaint — Awaaz-e-Awam');
  });

  it('provides official Google Maps companion link with encoded Karachi query and zero billing', () => {
    renderWithProviders(<ComplaintForm />);

    const mapsLink = screen.getByRole('link', { name: /find on google maps/i });
    expect(mapsLink).toBeInTheDocument();
    expect(mapsLink).toHaveAttribute('target', '_blank');
    expect(mapsLink).toHaveAttribute('rel', 'noopener noreferrer');
    expect(mapsLink.getAttribute('href')).toContain('https://www.google.com/maps/search/?api=1&query=');
    expect(mapsLink.getAttribute('href')).toContain(encodeURIComponent('Karachi, Pakistan'));
  });
});
