import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import { localV11ComplaintService } from '../services/LocalV11ComplaintService';

describe('V13.2 Blank Screen & Route Rendering Regression Prevention', () => {
  beforeEach(() => {
    localV11ComplaintService.setEngineMode('run004_v11');
  });

  it('renders homepage (/) successfully without blank screen or uncaught module errors', () => {
    window.history.pushState({}, '', '/');
    const { container } = render(<App />);

    expect(container.innerHTML).not.toBe('');
    expect(screen.getAllByText(/Awaaz-e-Awam/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/YOUR COMPLAINT\./i)).toBeInTheDocument();
  });

  it('renders complaint submission page (/submit) successfully', () => {
    window.history.pushState({}, '', '/submit');
    const { container } = render(<App />);

    expect(container.innerHTML).not.toBe('');
    expect(screen.getByText(/LOCAL AI TEST MODE/i)).toBeInTheDocument();
    expect(screen.getByText(/V11 Champion \(Run004 • SHA: E4D04293\)/i)).toBeInTheDocument();
  });

  it('toggles Local AI Test Mode, exposes V13.2 candidate selector, and classifies independent multi-faults', async () => {
    window.history.pushState({}, '', '/submit');
    render(<App />);

    // 1. Toggle Local AI Test Mode
    const toggle = screen.getByLabelText(/Toggle Local AI Test Mode/i);
    expect(toggle).toBeInTheDocument();
    fireEvent.click(toggle);

    // 2. Verify Candidate Selector dropdown appears with V13.2 option
    await waitFor(() => {
      expect(screen.getByText(/Model Candidate/i)).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.value).toBe('run004_v11');

    // Switch to V13.2 candidate
    fireEvent.change(select, { target: { value: 'v13_2_candidate' } });
    expect(localV11ComplaintService.getEngineMode()).toBe('v13_2_candidate');

    // 3. Verify Preset 7 (Basia Bungalows) is available and functional
    const presetBtn = screen.getByText(/7\.\s*Basia Bungalows/i);
    expect(presetBtn).toBeInTheDocument();
    fireEvent.click(presetBtn);

    // 4. Test live classification execution
    const submitBtn = screen.getByRole('button', { name: /Submit Complaint/i });
    expect(submitBtn).toBeInTheDocument();
    fireEvent.click(submitBtn);

    // 5. Verify analysis result modal opens and displays 3 independent departments
    await waitFor(() => {
      expect(screen.getByText(/Complaint Classification & Relation Analysis/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/PREDICTED MUNICIPAL AUTHORITIES \(3\)/i)).toBeInTheDocument();
    expect(screen.getAllByText(/K-Electric/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Karachi Metropolitan Corporation/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Sindh Solid Waste Management Board/i)[0]).toBeInTheDocument();
  });
});
