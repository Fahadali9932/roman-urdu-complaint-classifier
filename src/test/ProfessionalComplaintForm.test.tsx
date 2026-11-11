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

// Helper to quickly advance to Step 2
const advanceToStep2 = () => {
  fireEvent.change(screen.getByLabelText(/complaint subject \/ title/i), {
    target: { value: 'Broken drainage cover' },
  });
  fireEvent.change(screen.getByLabelText(/complaint description/i), {
    target: { value: 'Main gutter ka dhakkan toota hua hai.' },
  });
  fireEvent.click(screen.getByRole('button', { name: /continue/i }));
};

// Helper to quickly advance to Step 3
const advanceToStep3 = () => {
  advanceToStep2();
  fireEvent.change(screen.getByLabelText(/area \/ locality/i), {
    target: { value: 'Clifton Block 2' },
  });
  fireEvent.change(screen.getByLabelText(/public issue location/i), {
    target: { value: 'Near Boat Basin' },
  });
  fireEvent.click(screen.getByRole('button', { name: /continue/i }));
};

describe('Professional Civic Complaint Form Suite (Guided 4-Stage Experience)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('renders modern civic editorial wizard layout with 4-segmented progress and Step 1 heading', () => {
    renderWithProviders(<ComplaintForm />);

    expect(screen.getByText(/step 01 of 04/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /what needs attention\?/i })).toBeInTheDocument();
    expect(screen.getByText(/describe the public-service issue\./i)).toBeInTheDocument();

    // Verify absence of obsolete rejected formal headers
    expect(screen.queryByText(/PUBLIC SERVICE COMPLAINT/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Concerned Public Service Department/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/CIVIC GRIEVANCE FRAMEWORK/i)).not.toBeInTheDocument();
  });

  it('allows moving backward to previous step while strictly preserving entered data', async () => {
    renderWithProviders(<ComplaintForm />);

    // Step 1: Type subject and description
    fireEvent.change(screen.getByLabelText(/complaint subject \/ title/i), {
      target: { value: 'Water leakage in pipeline' },
    });
    fireEvent.change(screen.getByLabelText(/complaint description/i), {
      target: { value: 'Pichlay do din se pani leak ho raha hai.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // Reached Step 2
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /where is the problem\?/i })).toBeInTheDocument();
    });

    // Click Back button
    const backButton = screen.getByRole('button', { name: /back/i });
    fireEvent.click(backButton);

    // Returned to Step 1: verify entered data is 100% preserved
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /what needs attention\?/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/complaint subject \/ title/i)).toHaveValue('Water leakage in pipeline');
      expect(screen.getByLabelText(/complaint description/i)).toHaveValue('Pichlay do din se pani leak ho raha hai.');
    });
  });

  it('automatically identifies verified district on Step 2 when citizen enters or selects a Karachi locality', async () => {
    renderWithProviders(<ComplaintForm />);
    advanceToStep2();

    await waitFor(() => {
      expect(screen.getByLabelText(/area \/ locality/i)).toBeInTheDocument();
    });

    const localityInput = screen.getByLabelText(/area \/ locality/i);
    fireEvent.change(localityInput, { target: { value: 'DHA Phase 6' } });

    await waitFor(() => {
      expect(screen.getByDisplayValue(/District South/i)).toBeInTheDocument();
      expect(screen.getByText(/automatically identified/i)).toBeInTheDocument();
    });
  });

  it('PREVENTS STALE DISTRICT REGRESSION: never allows DHA Phase 6 to be paired with District Central', async () => {
    renderWithProviders(<ComplaintForm />);
    advanceToStep2();

    await waitFor(() => {
      expect(screen.getByLabelText(/area \/ locality/i)).toBeInTheDocument();
    });

    const localityInput = screen.getByLabelText(/area \/ locality/i);

    // First enter an area in District Central (Federal B Area)
    fireEvent.change(localityInput, { target: { value: 'Federal B Area' } });
    await waitFor(() => {
      expect(screen.getByDisplayValue(/District Central/i)).toBeInTheDocument();
    });

    // Now change locality to DHA Phase 6 (which is in District South)
    fireEvent.change(localityInput, { target: { value: 'DHA Phase 6' } });
    await waitFor(() => {
      expect(screen.queryByDisplayValue(/District Central/i)).not.toBeInTheDocument();
      expect(screen.getByDisplayValue(/District South/i)).toBeInTheDocument();
    });
  });

  it('prompts for district confirmation on Step 2 when entering an unlisted or custom locality', async () => {
    renderWithProviders(<ComplaintForm />);
    advanceToStep2();

    await waitFor(() => {
      expect(screen.getByLabelText(/area \/ locality/i)).toBeInTheDocument();
    });

    const localityInput = screen.getByLabelText(/area \/ locality/i);
    fireEvent.change(localityInput, { target: { value: 'Goth Unlisted Rural Area' } });

    await waitFor(() => {
      expect(screen.getByText(/district needs confirmation/i)).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /karachi district/i })).toBeInTheDocument();
    });
  });

  it('supports discreet expandable residential address on Step 3 without occupying premature space', async () => {
    renderWithProviders(<ComplaintForm />);
    advanceToStep3();

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /how can we reach you\?/i })).toBeInTheDocument();
    });

    // Expandable toggle button exists
    const addAddressBtn = screen.getByRole('button', { name: /add residential address/i });
    expect(addAddressBtn).toBeInTheDocument();
    expect(screen.queryByLabelText(/applicant address/i)).not.toBeInTheDocument();

    // Click to expand
    fireEvent.click(addAddressBtn);
    expect(screen.getByLabelText(/applicant address/i)).toBeInTheDocument();

    // Type optional address
    fireEvent.change(screen.getByLabelText(/applicant address/i), {
      target: { value: 'House 12, Street 4' },
    });
    expect(screen.getByLabelText(/applicant address/i)).toHaveValue('House 12, Street 4');
  });

  it('supports Review Step (Step 4) with direct Edit links returning to appropriate steps without data loss', async () => {
    renderWithProviders(<ComplaintForm />);
    advanceToStep3();

    // Fill Step 3
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Kamran Akmal' } });
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '03001234567' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // Reached Step 4 (Review)
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /check your complaint\./i })).toBeInTheDocument();
    });

    // Click Edit on "The Problem"
    const editProblemBtn = screen.getByRole('button', { name: /edit the problem/i });
    fireEvent.click(editProblemBtn);

    // Returns directly to Step 1 with data intact
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /what needs attention\?/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/complaint subject \/ title/i)).toHaveValue('Broken drainage cover');
    });
  });

  it('PRIVACY ASSURANCE: phone number and applicant residential address are not saved to localStorage or sessionStorage', async () => {
    renderWithProviders(<ComplaintForm />);
    advanceToStep3();

    // Fill applicant fields
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Tariq Mehmood' } });
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '03001234567' } });

    // Expand address
    fireEvent.click(screen.getByRole('button', { name: /add residential address/i }));
    fireEvent.change(screen.getByLabelText(/applicant address/i), { target: { value: 'Private Street House 42' } });

    // Advance to Step 4
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /check your complaint\./i })).toBeInTheDocument();
    });

    // Final Submit
    fireEvent.click(screen.getByRole('button', { name: /submit complaint \(prototype\)/i }));

    await waitFor(() => {
      expect(screen.getByText(/review your complaint/i)).toBeInTheDocument();
    });

    // Verify localStorage & sessionStorage are strictly devoid of private data
    expect(localStorage.getItem('phone')).toBeNull();
    expect(localStorage.getItem('applicantAddress')).toBeNull();
    expect(localStorage.getItem('citizenPhone')).toBeNull();
    expect(sessionStorage.getItem('phone')).toBeNull();
    expect(sessionStorage.getItem('applicantAddress')).toBeNull();
    expect(sessionStorage.getItem('citizenPhone')).toBeNull();

    const localValues = Object.values(localStorage);
    const sessionValues = Object.values(sessionStorage);
    expect(localValues.some((v) => v.includes('03001234567'))).toBe(false);
    expect(localValues.some((v) => v.includes('Private Street'))).toBe(false);
    expect(sessionValues.some((v) => v.includes('03001234567'))).toBe(false);
    expect(sessionValues.some((v) => v.includes('Private Street'))).toBe(false);
  });

  it('clears all fields and resets state when Clear button is clicked on Step 1', () => {
    renderWithProviders(<ComplaintForm />);

    const titleInput = screen.getByLabelText(/complaint subject \/ title/i);
    fireEvent.change(titleInput, { target: { value: 'Streetlight fault' } });
    expect(titleInput).toHaveValue('Streetlight fault');

    const clearButton = screen.getByRole('button', { name: /clear/i });
    fireEvent.click(clearButton);

    expect(screen.getByLabelText(/complaint subject \/ title/i)).toHaveValue('');
  });

  it('synchronizes document.title on mount eliminating stale title regression', () => {
    document.title = 'Terms of Use — Awaaz-e-Awam';
    renderWithProviders(<ComplaintForm />);
    expect(document.title).toBe('Write a Complaint — Awaaz-e-Awam');
  });

  it('provides official Google Maps companion link with encoded Karachi query and zero billing on Step 2', async () => {
    renderWithProviders(<ComplaintForm />);
    advanceToStep2();

    await waitFor(() => {
      const mapsLink = screen.getByRole('link', { name: /find on google maps/i });
      expect(mapsLink).toBeInTheDocument();
      expect(mapsLink).toHaveAttribute('target', '_blank');
      expect(mapsLink).toHaveAttribute('rel', 'noopener noreferrer');
      expect(mapsLink.getAttribute('href')).toContain('https://www.google.com/maps/search/?api=1&query=');
      expect(mapsLink.getAttribute('href')).toContain(encodeURIComponent('Karachi, Pakistan'));
    });
  });
});
