import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LiquidSegmentedControl } from '../features/department/components/glass/LiquidSegmentedControl';
import { LiquidSheet } from '../features/department/components/glass/LiquidSheet';
import { PriorityPill } from '../features/department/components/glass/PriorityPill';
import { LiquidGlassRibbon, type RibbonMetrics } from '../features/department/components/glass/LiquidGlassRibbon';

const SAMPLE_METRICS: RibbonMetrics = {
  newComplaints: 7,
  urgentComplaints: 2,
  unassignedComplaints: 4,
  awaitingVerification: 3,
  availableOfficers: 5,
  assignedOfficers: 3,
  extensionRequests: 1,
};

describe('V17 Apple Clear Liquid Glass Portal Primitives', () => {
  it('renders LiquidSegmentedControl with sliding capsule, aria-pressed state, and counts', () => {
    const onChange = vi.fn();
    render(
      <LiquidSegmentedControl
        ariaLabel="Date filter"
        value="today"
        onChange={onChange}
        options={[
          { id: 'today', label: 'Today', count: 5 },
          { id: 'yesterday', label: 'Yesterday', count: 2 },
          { id: 'all', label: 'All' },
        ]}
      />
    );

    const todayBtn = screen.getByRole('button', { name: /Today/i });
    const yesterdayBtn = screen.getByRole('button', { name: /Yesterday/i });
    expect(todayBtn).toHaveAttribute('aria-pressed', 'true');
    expect(yesterdayBtn).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(yesterdayBtn);
    expect(onChange).toHaveBeenCalledWith('yesterday');
  });

  it('renders LiquidSheet dialog and dismisses on Escape and close button', () => {
    const onClose = vi.fn();
    render(
      <LiquidSheet open title="Assign Work Order" onClose={onClose}>
        <p>Sheet content</p>
      </LiquidSheet>
    );

    expect(screen.getByRole('dialog', { name: 'Assign Work Order' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Close Assign Work Order' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('renders PriorityPill semantic labels without emoji or fake proof', () => {
    const { rerender } = render(<PriorityPill priority="critical" />);
    expect(screen.getByText('Urgent')).toBeInTheDocument();

    rerender(<PriorityPill priority="high" />);
    expect(screen.getByText('High')).toBeInTheDocument();

    rerender(<PriorityPill priority="normal" />);
    expect(screen.getByText('Routine')).toBeInTheDocument();

    rerender(<PriorityPill verified />);
    expect(screen.getByText('Verified')).toBeInTheDocument();
  });

  it('renders LiquidGlassRibbon with primary destinations, contextual hover preview, and theme toggle', () => {
    const onSelectSection = vi.fn();
    const onToggleTheme = vi.fn();

    render(
      <LiquidGlassRibbon
        departmentCode="KMC"
        departmentName="Roads & Infrastructure"
        username="roads-01"
        currentSection="dashboard"
        themeMode="light"
        metrics={SAMPLE_METRICS}
        onSelectSection={onSelectSection}
        onToggleTheme={onToggleTheme}
        onOpenPasswordModal={vi.fn()}
        onSignOut={vi.fn()}
      />
    );

    const nav = screen.getByRole('navigation', { name: 'Department Head navigation' });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Complaints' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Officers' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Archive' })).toBeInTheDocument();

    // Hovering Complaints reveals contextual Clear Liquid Glass preview popover
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Complaints' }).parentElement!);
    expect(screen.getByText('New complaints')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();

    // Theme toggle triggers callback
    fireEvent.click(screen.getByRole('button', { name: /Switch to dark mode/i }));
    expect(onToggleTheme).toHaveBeenCalledTimes(1);
  });
});
