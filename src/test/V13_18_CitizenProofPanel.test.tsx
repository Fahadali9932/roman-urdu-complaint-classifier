import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('../lib/supabase', () => ({
  isSupabaseConfigured: () => true,
  supabase: { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'owner' } } }) } },
}));
vi.mock('../features/department/services/fieldOperations', () => ({
  fieldOperations: { citizenProofs: vi.fn(), citizenReview: vi.fn() },
}));

import { CitizenProofPanel } from '../components/citizen/CitizenProofPanel';
import { fieldOperations, type CitizenWorkProof } from '../features/department/services/fieldOperations';

const proof: CitizenWorkProof = {
  order_id:'order-1',department_id:'kmc',storage_path:'private/path',
  submitted_at:'2026-11-22T08:00:00.000Z',distance_m:25,location_result:'near',
  feedback:null,order_status:'verified',response_expires_at:'2026-11-25T08:00:00.000Z',
  can_respond:true,signed_url:'https://example.org/signed-photo',
};

beforeEach(() => {
  vi.mocked(fieldOperations.citizenProofs).mockResolvedValue([proof]);
  vi.mocked(fieldOperations.citizenReview).mockResolvedValue(undefined);
});
afterEach(() => vi.clearAllMocks());

describe('V13.18 citizen verification window and rework', () => {
  it('shows the review deadline and citizen confirmation controls', async () => {
    render(<CitizenProofPanel complaintId="complaint-1"/>);
    expect(await screen.findByText(/Review period ends/i)).toBeInTheDocument();
    expect(screen.getByRole('button',{name:/Work looks complete/i})).toBeInTheDocument();
    expect(screen.getByRole('button',{name:/Issue remains/i})).toBeDisabled();
  });
  it('requires a substantive dispute and reflects rework immediately', async () => {
    render(<CitizenProofPanel complaintId="complaint-1"/>);
    const note=await screen.findByLabelText(/Your feedback/i);
    fireEvent.change(note,{target:{value:'The manhole is still completely uncovered.'}});
    fireEvent.click(screen.getByRole('button',{name:/Issue remains/i}));
    await waitFor(() => expect(fieldOperations.citizenReview).toHaveBeenCalledWith(
      'order-1','complaint-1','disputed','The manhole is still completely uncovered.',
    ));
    expect(await screen.findByText(/returned for further work/i)).toBeInTheDocument();
    expect(screen.queryByRole('button',{name:/Work looks complete/i})).not.toBeInTheDocument();
  });
  it('never offers feedback controls when the response window has ended', async () => {
    vi.mocked(fieldOperations.citizenProofs).mockResolvedValue([{
      ...proof,can_respond:false,
    }]);
    render(<CitizenProofPanel complaintId="complaint-1"/>);
    expect(await screen.findByText(/past the 72-hour response window/i)).toBeInTheDocument();
    expect(screen.queryByRole('button',{name:/Issue remains/i})).not.toBeInTheDocument();
  });
  it('preserves the disputed evidence record while the officer reworks it', async () => {
    vi.mocked(fieldOperations.citizenProofs).mockResolvedValue([{
      ...proof,order_status:'returned',feedback:'disputed',can_respond:false,
    }]);
    render(<CitizenProofPanel complaintId="complaint-1"/>);
    expect(await screen.findByText(/returned for further work/i)).toBeInTheDocument();
    expect(screen.getByText(/You marked this work as disputed/i)).toBeInTheDocument();
  });
});
