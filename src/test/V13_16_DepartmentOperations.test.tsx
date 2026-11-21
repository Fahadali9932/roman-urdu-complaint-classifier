import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { caseOperationsService } from '../services/CaseOperationsService';
import { WorkQueuePage } from '../features/department/components/WorkQueuePage';
import { AreasPage } from '../features/department/components/AreasPage';
import { OverviewPage } from '../features/department/components/OverviewPage';

describe('V13.16 department operations reliability', () => {
  beforeEach(() => caseOperationsService.resetToDefault());
  afterEach(() => vi.restoreAllMocks());

  it('separates a failed queue fetch from a genuinely empty inbox and supports retry', async () => {
    const original = caseOperationsService.listDepartmentCases.bind(caseOperationsService);
    const cases = vi.spyOn(caseOperationsService, 'listDepartmentCases')
      .mockRejectedValueOnce(new Error('Service temporarily unavailable'))
      .mockImplementation(original);

    render(<WorkQueuePage departmentId="kmc" onOpenCase={() => {}} />);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Unable to load the work queue'));
    expect(screen.getByText('Service temporarily unavailable')).toBeInTheDocument();
    expect(screen.queryByText('No work matches these filters')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Retry/i }));
    await waitFor(() => expect(cases).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByText('Open manhole beside playground')).toBeInTheDocument());
  });

  it('can filter localities without losing access to the actual queue navigation', async () => {
    const onSelectArea = vi.fn();
    render(<AreasPage departmentId="kmc" onSelectArea={onSelectArea} onViewWorkQueue={() => {}} />);
    await waitFor(() => expect(screen.getByText('Gulshan-e-Iqbal')).toBeInTheDocument());
    fireEvent.change(screen.getByRole('textbox', { name: 'Search localities' }), { target: { value: 'Korangi' } });
    expect(screen.getByText('Korangi')).toBeInTheDocument();
    expect(screen.queryByText('Gulshan-e-Iqbal')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open Korangi cases' }));
    expect(onSelectArea).toHaveBeenCalledWith('Korangi');
  });

  it('shows honest demonstration labeling and three distinct workload totals', async () => {
    render(<OverviewPage departmentId="kmc" departmentName="Road works" onNavigate={() => {}} onSelectCase={() => {}} />);
    await waitFor(() => expect(screen.getByText('Total incident cases')).toBeInTheDocument());
    expect(screen.getByText('Citizen reports')).toBeInTheDocument();
    expect(screen.getByText('Unassigned cases')).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('Local demonstration');
    expect(screen.getByRole('button', { name: 'Refresh department overview' })).toBeInTheDocument();
  });
});
