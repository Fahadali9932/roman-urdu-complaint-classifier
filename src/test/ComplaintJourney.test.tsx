import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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

describe('ComplaintJourney Component (Minimal Process Cards & Animated Arrows)', () => {
  beforeEach(() => {
    document.documentElement.setAttribute('dir', 'ltr');
    document.documentElement.setAttribute('lang', 'en');
  });

  it('renders section container with id="steps" and single section heading', () => {
    renderComponent();

    const section = document.getElementById('steps');
    expect(section).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2, name: /how it works/i })[0]).toBeInTheDocument();
  });

  it('renders all four process cards with clean titles and short descriptions', () => {
    renderComponent();

    // Check headings
    expect(screen.getAllByRole('heading', { level: 3, name: /^write$/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 3, name: /^review$/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 3, name: /^route$/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 3, name: /^track$/i })[0]).toBeInTheDocument();

    // Check descriptions
    expect(screen.getAllByText(/describe the issue\./i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/check the details\./i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/identify the right department\./i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/follow the progress\./i)[0]).toBeInTheDocument();
  });

  it('strictly adheres to minimal content rules (no numbering, no badges, no fake data)', () => {
    renderComponent();

    // No numbered badges or step counters
    expect(screen.queryByText(/\[01\]/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\[02\]/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\[03\]/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\[04\]/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/STAGE 1 OF 4/i)).not.toBeInTheDocument();

    // No fake tracking numbers or simulated badges
    expect(screen.queryByText(/DOC-REF/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/PROGRESS: \d+%/i)).not.toBeInTheDocument();

    // No civic-process caption or decorative bottom labels
    expect(screen.queryByText(/CIVIC PROCESS/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/مرحلہ وار طریقہ کار/i)).not.toBeInTheDocument();
  });

  it('renders thick vector arrow SVG connectors between the cards', () => {
    renderComponent();

    const svgs = document.querySelectorAll('#steps svg');
    // Desktop has 3 horizontal arrows, mobile has 3 vertical arrows = total 6 SVG elements
    expect(svgs.length).toBe(6);
    svgs.forEach((svg) => {
      const path = svg.querySelector('path');
      expect(path).toBeInTheDocument();
      expect(path).toHaveAttribute('stroke', '#0B1421');
      expect(path).toHaveAttribute('stroke-linecap', 'round');
    });
  });
});
