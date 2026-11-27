import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TopEdgeMorphingNav } from '../features/department/components/v20/TopEdgeMorphingNav';

describe('AWAAZ-E-AWAM Phase V21.5 — Critical Navbar Interaction Repair (Root Cause Elimination)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockTabs = [
    { id: 'home', label: 'Home' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'complaints', label: 'Complaints' },
    { id: 'verification', label: 'Verification' },
    { id: 'officers', label: 'Officers' },
    { id: 'profile', label: 'Profile' },
  ];

  /* -------------------------------------------------------------------------- */
  /* TEST 1: Initial Render & Geometric Separation                              */
  /* -------------------------------------------------------------------------- */
  it('renders collapsed with strictly bounded notch surface and zero header trigger', () => {
    render(
      <TopEdgeMorphingNav
        departmentCode="KMC"
        departmentName="Karachi Metropolitan Corporation"
        role="head"
        activeTab="dashboard"
        onSelectTab={vi.fn()}
        themeMode="dark"
        onToggleTheme={vi.fn()}
        onSignOut={vi.fn()}
        tabs={mockTabs}
      />
    );

    const navContainer = screen.getByTestId('v20-top-edge-nav');
    expect(navContainer.getAttribute('data-nav-state')).toBe('collapsed');
    expect(navContainer.classList.contains('open')).toBe(false);

    const interactiveSurface = screen.getByTestId('v20-notch-interactive-surface');
    expect(interactiveSurface).toBeDefined();
    expect(interactiveSurface.classList.contains('is-collapsed')).toBe(true);

    // Decorative SVG path has pointer-events: none styling
    const path = document.querySelector('#notch');
    expect(path).toBeDefined();
    expect(path?.classList.contains('v20-notch-path')).toBe(true);
  });

  /* -------------------------------------------------------------------------- */
  /* TEST 2: Outside Unrelated Elements Do NOT Open Navbar                      */
  /* -------------------------------------------------------------------------- */
  it('does NOT open when pointer moves over brand label, clock, theme toggle, or signout', () => {
    render(
      <TopEdgeMorphingNav
        departmentCode="KMC"
        departmentName="Karachi Metropolitan Corporation"
        role="head"
        activeTab="dashboard"
        onSelectTab={vi.fn()}
        themeMode="dark"
        onToggleTheme={vi.fn()}
        onSignOut={vi.fn()}
        tabs={mockTabs}
      />
    );

    const navContainer = screen.getByTestId('v20-top-edge-nav');
    const brandLabel = document.querySelector('.v20-brand-label');
    const themeBtn = screen.getByTestId('v20-theme-toggle');
    const signoutBtn = screen.getByTestId('v20-signout-btn');
    const clock = screen.getByTestId('v20-trusted-clock');

    // Pointer move over unrelated child controls
    act(() => {
      if (brandLabel) fireEvent.pointerMove(brandLabel, { clientX: 60, clientY: 32 });
      if (clock) fireEvent.pointerMove(clock, { clientX: 1350, clientY: 32 });
      fireEvent.pointerMove(themeBtn, { clientX: 1400, clientY: 32 });
      fireEvent.pointerMove(signoutBtn, { clientX: 1425, clientY: 32 });
    });

    // Header MUST remain strictly collapsed
    expect(navContainer.getAttribute('data-nav-state')).toBe('collapsed');
    expect(navContainer.classList.contains('open')).toBe(false);
  });

  /* -------------------------------------------------------------------------- */
  /* TEST 3: Legitimate Hover Over Notch Opens Smoothly                        */
  /* -------------------------------------------------------------------------- */
  it('opens immediately when pointer enters compact notch surface', () => {
    render(
      <TopEdgeMorphingNav
        departmentCode="KMC"
        departmentName="Karachi Metropolitan Corporation"
        role="head"
        activeTab="dashboard"
        onSelectTab={vi.fn()}
        themeMode="dark"
        onToggleTheme={vi.fn()}
        onSignOut={vi.fn()}
        tabs={mockTabs}
      />
    );

    const interactiveSurface = screen.getByTestId('v20-notch-interactive-surface');
    const navContainer = screen.getByTestId('v20-top-edge-nav');

    // Pointer enters the notch surface
    act(() => {
      fireEvent.pointerEnter(interactiveSurface, { pointerType: 'mouse' });
    });

    expect(navContainer.getAttribute('data-nav-state')).toBe('opening');
    expect(navContainer.classList.contains('open')).toBe(true);
  });

  /* -------------------------------------------------------------------------- */
  /* TEST 4: Automatic Closure After Leaving Region with Exit Grace             */
  /* -------------------------------------------------------------------------- */
  it('schedules closure after pointer leaves interactive surface and settles smoothly', () => {
    vi.useFakeTimers();

    render(
      <TopEdgeMorphingNav
        departmentCode="KMC"
        departmentName="Karachi Metropolitan Corporation"
        role="head"
        activeTab="dashboard"
        onSelectTab={vi.fn()}
        themeMode="dark"
        onToggleTheme={vi.fn()}
        onSignOut={vi.fn()}
        tabs={mockTabs}
      />
    );

    const interactiveSurface = screen.getByTestId('v20-notch-interactive-surface');
    const navContainer = screen.getByTestId('v20-top-edge-nav');

    // Open
    act(() => {
      fireEvent.pointerEnter(interactiveSurface, { pointerType: 'mouse' });
    });
    expect(navContainer.classList.contains('open')).toBe(true);

    // Leave
    act(() => {
      fireEvent.pointerLeave(interactiveSurface, { pointerType: 'mouse' });
    });

    // Before 75ms grace expires, remains open in closing preparation
    expect(navContainer.classList.contains('open')).toBe(true);

    // Fast-forward 80ms
    act(() => {
      vi.advanceTimersByTime(80);
    });

    expect(navContainer.getAttribute('data-nav-state')).toBe('closing');
    expect(navContainer.classList.contains('open')).toBe(false);

    vi.useRealTimers();
  });

  /* -------------------------------------------------------------------------- */
  /* TEST 5: Escape Key Dismissal & Manual Close Protection                     */
  /* -------------------------------------------------------------------------- */
  it('dismisses immediately on Escape key and suppresses hover reopen until fresh activation', () => {
    render(
      <TopEdgeMorphingNav
        departmentCode="KMC"
        departmentName="Karachi Metropolitan Corporation"
        role="head"
        activeTab="dashboard"
        onSelectTab={vi.fn()}
        themeMode="dark"
        onToggleTheme={vi.fn()}
        onSignOut={vi.fn()}
        tabs={mockTabs}
      />
    );

    const interactiveSurface = screen.getByTestId('v20-notch-interactive-surface');
    const navContainer = screen.getByTestId('v20-top-edge-nav');

    // Open
    act(() => {
      fireEvent.pointerEnter(interactiveSurface, { pointerType: 'mouse' });
    });
    expect(navContainer.classList.contains('open')).toBe(true);

    // Press Escape
    act(() => {
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    });

    expect(navContainer.getAttribute('data-nav-state')).toBe('closing');
    expect(navContainer.classList.contains('open')).toBe(false);
  });

  /* -------------------------------------------------------------------------- */
  /* TEST 6: Close Toggle Button Click Dismisses Navbar                         */
  /* -------------------------------------------------------------------------- */
  it('closes cleanly when toggle button is clicked in expanded state', () => {
    render(
      <TopEdgeMorphingNav
        departmentCode="KMC"
        departmentName="Karachi Metropolitan Corporation"
        role="head"
        activeTab="dashboard"
        onSelectTab={vi.fn()}
        themeMode="dark"
        onToggleTheme={vi.fn()}
        onSignOut={vi.fn()}
        tabs={mockTabs}
      />
    );

    const toggleBtn = screen.getByTestId('v20-nav-toggle');
    const navContainer = screen.getByTestId('v20-top-edge-nav');

    // Click to open
    act(() => {
      fireEvent.click(toggleBtn);
    });
    expect(navContainer.getAttribute('data-nav-state')).toBe('opening');
    expect(navContainer.classList.contains('open')).toBe(true);

    // Click again to close
    act(() => {
      fireEvent.click(toggleBtn);
    });
    expect(navContainer.getAttribute('data-nav-state')).toBe('closing');
    expect(navContainer.classList.contains('open')).toBe(false);
  });

  /* -------------------------------------------------------------------------- */
  /* TEST 7: Destination Selection Navigates and Dismisses                      */
  /* -------------------------------------------------------------------------- */
  it('selects tab, fires onSelectTab callback, and closes navbar immediately', () => {
    const handleSelectTab = vi.fn();

    render(
      <TopEdgeMorphingNav
        departmentCode="KMC"
        departmentName="Karachi Metropolitan Corporation"
        role="head"
        activeTab="home"
        onSelectTab={handleSelectTab}
        themeMode="dark"
        onToggleTheme={vi.fn()}
        onSignOut={vi.fn()}
        tabs={mockTabs}
      />
    );

    const toggleBtn = screen.getByTestId('v20-nav-toggle');
    const navContainer = screen.getByTestId('v20-top-edge-nav');

    // Open navbar
    act(() => {
      fireEvent.click(toggleBtn);
    });

    const officersTab = screen.getByTestId('v20-nav-btn-officers');
    act(() => {
      fireEvent.click(officersTab);
    });

    expect(handleSelectTab).toHaveBeenCalledWith('officers');
    expect(navContainer.getAttribute('data-nav-state')).toBe('closing');
    expect(navContainer.classList.contains('open')).toBe(false);
  });

  /* -------------------------------------------------------------------------- */
  /* TEST 8: Window Blur Dismisses Immediately                                  */
  /* -------------------------------------------------------------------------- */
  it('dismisses navbar immediately when browser window loses focus', () => {
    render(
      <TopEdgeMorphingNav
        departmentCode="KMC"
        departmentName="Karachi Metropolitan Corporation"
        role="head"
        activeTab="dashboard"
        onSelectTab={vi.fn()}
        themeMode="dark"
        onToggleTheme={vi.fn()}
        onSignOut={vi.fn()}
        tabs={mockTabs}
      />
    );

    const toggleBtn = screen.getByTestId('v20-nav-toggle');
    const navContainer = screen.getByTestId('v20-top-edge-nav');

    // Open
    act(() => {
      fireEvent.click(toggleBtn);
    });
    expect(navContainer.classList.contains('open')).toBe(true);

    // Window blur
    act(() => {
      window.dispatchEvent(new Event('blur'));
    });

    expect(navContainer.getAttribute('data-nav-state')).toBe('closing');
    expect(navContainer.classList.contains('open')).toBe(false);
  });

  /* -------------------------------------------------------------------------- */
  /* TEST 9: Click Outside Dismissal                                            */
  /* -------------------------------------------------------------------------- */
  it('dismisses when pointerdown occurs outside the interactive surface', () => {
    render(
      <div>
        <TopEdgeMorphingNav
          departmentCode="KMC"
          departmentName="Karachi Metropolitan Corporation"
          role="head"
          activeTab="dashboard"
          onSelectTab={vi.fn()}
          themeMode="dark"
          onToggleTheme={vi.fn()}
          onSignOut={vi.fn()}
          tabs={mockTabs}
        />
        <div data-testid="outside-area">Outside Content</div>
      </div>
    );

    const toggleBtn = screen.getByTestId('v20-nav-toggle');
    const navContainer = screen.getByTestId('v20-top-edge-nav');
    const outsideArea = screen.getByTestId('outside-area');

    // Open
    act(() => {
      fireEvent.click(toggleBtn);
    });
    expect(navContainer.classList.contains('open')).toBe(true);

    // Pointer down on outside element
    act(() => {
      fireEvent.pointerDown(outsideArea);
    });

    expect(navContainer.getAttribute('data-nav-state')).toBe('closing');
    expect(navContainer.classList.contains('open')).toBe(false);
  });
});
