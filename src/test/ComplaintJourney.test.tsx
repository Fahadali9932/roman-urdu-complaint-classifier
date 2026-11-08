import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LanguageProvider } from '../context/LanguageContext';
import { ComplaintJourney } from '../features/landing/ComplaintJourney';

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <LanguageProvider>
        <ComplaintJourney id="steps" />
      </LanguageProvider>
    </BrowserRouter>
  );
};

describe('ComplaintJourney Component', () => {
  beforeEach(() => {
    document.documentElement.setAttribute('dir', 'ltr');
    document.documentElement.setAttribute('lang', 'en');
  });

  it('renders section container with id="steps" and workflow eyebrow', () => {
    renderComponent();

    const section = document.getElementById('steps');
    expect(section).toBeInTheDocument();
    expect(screen.getByText(/01 TO 04 • WORKFLOW/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /how it works/i })).toBeInTheDocument();
  });

  it('renders all four stages: Write, Review, Route, and Track', () => {
    renderComponent();

    // Check desktop narrative buttons
    expect(screen.getByRole('button', { name: /01 — write/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /02 — review/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /03 — route/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /04 — track/i })).toBeInTheDocument();
  });

  it('renders the single digital complaint document with official header and illustrative Roman Urdu text', () => {
    renderComponent();

    expect(screen.getByText(/DOC-REF \/\/ AWAAZ-DRAFT-01/i)).toBeInTheDocument();
    expect(screen.getByText(/CITIZEN GRIEVANCE APPLICATION/i)).toBeInTheDocument();
    expect(screen.getByText(/Hamari gali mein pani nahi aa raha./i)).toBeInTheDocument();
    expect(screen.getByText(/ILLUSTRATIVE DRAFT/i)).toBeInTheDocument();
  });

  it('switches active stage to Review when Review button is clicked', () => {
    renderComponent();

    const reviewBtn = screen.getByRole('button', { name: /02 — review/i });
    fireEvent.click(reviewBtn);

    // Document morphs to Stage 2: Review
    expect(screen.getByText(/Pani ka Masla \(Water Supply Shortage\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Municipal Water & Sewerage/i)).toBeInTheDocument();
    expect(screen.getByText(/Citizen Detail Check/i)).toBeInTheDocument();
  });

  it('switches active stage to Route when Route button is clicked', () => {
    renderComponent();

    const routeBtn = screen.getByRole('button', { name: /03 — route/i });
    fireEvent.click(routeBtn);

    // Document morphs to Stage 3: Route
    expect(screen.getByText(/Karachi Water & Sewerage Corporation/i)).toBeInTheDocument();
    expect(screen.getByText(/DIRECTIONAL ROUTE/i)).toBeInTheDocument();
  });

  it('switches active stage to Track when Track button is clicked', () => {
    renderComponent();

    const trackBtn = screen.getByRole('button', { name: /04 — track/i });
    fireEvent.click(trackBtn);

    // Document morphs to Stage 4: Track
    expect(screen.getByText(/Resolution Lifecycle Timeline/i)).toBeInTheDocument();
    expect(screen.getByText(/Registered in municipal queue/i)).toBeInTheDocument();
    expect(screen.getByText(/Milestone Tracking/i)).toBeInTheDocument();
  });
});
