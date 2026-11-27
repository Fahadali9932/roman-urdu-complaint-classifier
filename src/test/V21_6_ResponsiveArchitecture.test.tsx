import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TopEdgeMorphingNav } from '../features/department/components/v20/TopEdgeMorphingNav';
import { V20InteractiveDonut, DonutSegment } from '../features/department/components/v20/V20InteractiveDonut';
import { V20LandingPage } from '../features/department/components/v20/V20LandingPage';

describe('AWAAZ-E-AWAM Phase V21.6 — Complete Responsive Architecture Repair', () => {
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
  /* TEST 1: Mobile Viewport Geometry & Compact Dimensions                      */
  /* -------------------------------------------------------------------------- */
  it('bounds mobile open dimensions to compact surface and prevents full-screen coverage', () => {
    // Emulate iPhone mobile viewport (390 x 844)
    window.innerWidth = 390;
    window.innerHeight = 844;

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
    const surface = screen.getByTestId('v20-notch-interactive-surface');
    const nav = screen.getByTestId('v20-top-edge-nav');

    // Initially collapsed
    expect(nav.classList.contains('open')).toBe(false);

    // Tap to open on mobile
    act(() => {
      fireEvent.click(toggleBtn);
    });

    expect(nav.classList.contains('open')).toBe(true);

    // Verify bounded dimensions: target width on mobile (390px) capped <= 360px
    const styleWidth = surface.style.width;
    const widthNum = parseFloat(styleWidth);
    expect(widthNum).toBeLessThanOrEqual(360);
    expect(widthNum).toBeGreaterThanOrEqual(110);

    // Verify target height on mobile: strictly capped under 48% of viewport height (844 * 0.48 = 405px)
    const styleHeight = surface.style.height;
    const heightNum = parseFloat(styleHeight);
    expect(heightNum).toBeLessThanOrEqual(844 * 0.48 + 10);
  });

  /* -------------------------------------------------------------------------- */
  /* TEST 2: Narrow Mobile (320px) Viewport Sizing                              */
  /* -------------------------------------------------------------------------- */
  it('scales safely on narrow 320px viewport without screen edge clipping', () => {
    // Emulate small iPhone SE / compact mobile (320 x 568)
    window.innerWidth = 320;
    window.innerHeight = 568;

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
    const surface = screen.getByTestId('v20-notch-interactive-surface');

    // Tap to open on 320px screen
    act(() => {
      fireEvent.click(toggleBtn);
    });

    // Width must not exceed viewport width - 16px (304px)
    const widthNum = parseFloat(surface.style.width);
    expect(widthNum).toBeLessThanOrEqual(304);

    // Height must not exceed 48% of 568 (272px)
    const heightNum = parseFloat(surface.style.height);
    expect(heightNum).toBeLessThanOrEqual(285);
  });

  /* -------------------------------------------------------------------------- */
  /* TEST 3: Mobile Touch Tap Navigation & Auto-Close                           */
  /* -------------------------------------------------------------------------- */
  it('navigates and automatically closes when destination tab is tapped', () => {
    window.innerWidth = 390;
    const handleSelectTab = vi.fn();

    render(
      <TopEdgeMorphingNav
        departmentCode="KMC"
        departmentName="Karachi Metropolitan Corporation"
        role="head"
        activeTab="dashboard"
        onSelectTab={handleSelectTab}
        themeMode="dark"
        onToggleTheme={vi.fn()}
        onSignOut={vi.fn()}
        tabs={mockTabs}
      />
    );

    const nav = screen.getByTestId('v20-top-edge-nav');
    const toggleBtn = screen.getByTestId('v20-nav-toggle');

    // Tap to open
    act(() => {
      fireEvent.click(toggleBtn);
    });
    expect(nav.classList.contains('open')).toBe(true);

    // Tap Complaints tab
    const complaintsBtn = screen.getByTestId('v20-nav-btn-complaints');
    act(() => {
      fireEvent.click(complaintsBtn);
    });

    // Destination selected
    expect(handleSelectTab).toHaveBeenCalledWith('complaints');

    // Navbar automatically closed
    expect(nav.classList.contains('open')).toBe(false);
  });

  /* -------------------------------------------------------------------------- */
  /* TEST 4: Tap Outside Dismissal on Mobile                                    */
  /* -------------------------------------------------------------------------- */
  it('dismisses immediately when tapping outside open mobile notch', () => {
    window.innerWidth = 390;

    render(
      <div>
        <div data-testid="outside-backdrop" style={{ height: '500px' }} />
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
      </div>
    );

    const nav = screen.getByTestId('v20-top-edge-nav');
    const toggleBtn = screen.getByTestId('v20-nav-toggle');

    // Open nav
    act(() => {
      fireEvent.click(toggleBtn);
    });
    expect(nav.classList.contains('open')).toBe(true);

    // Tap outside backdrop
    const outside = screen.getByTestId('outside-backdrop');
    act(() => {
      fireEvent.pointerDown(outside);
    });

    // Bounded nav closes immediately
    expect(nav.classList.contains('open')).toBe(false);
  });

  /* -------------------------------------------------------------------------- */
  /* TEST 5: Escape Key Dismissal                                               */
  /* -------------------------------------------------------------------------- */
  it('dismisses navigation when Escape key is pressed', () => {
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

    const nav = screen.getByTestId('v20-top-edge-nav');
    const toggleBtn = screen.getByTestId('v20-nav-toggle');

    // Open nav
    act(() => {
      fireEvent.click(toggleBtn);
    });
    expect(nav.classList.contains('open')).toBe(true);

    // Press Escape
    act(() => {
      fireEvent.keyDown(window, { key: 'Escape' });
    });

    // Nav closes
    expect(nav.classList.contains('open')).toBe(false);
  });

  /* -------------------------------------------------------------------------- */
  /* TEST 6: Touch Events Bypass Desktop Hover Triggers                         */
  /* -------------------------------------------------------------------------- */
  it('does NOT trigger hover expansion on touch pointer gestures', () => {
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

    const nav = screen.getByTestId('v20-top-edge-nav');
    const surface = screen.getByTestId('v20-notch-interactive-surface');

    // Touch gesture pointermove (pointerType: 'touch')
    act(() => {
      fireEvent.pointerMove(window, { clientX: 195, clientY: 20, pointerType: 'touch' });
      fireEvent.pointerEnter(surface, { pointerType: 'touch' });
    });

    // Must remain strictly collapsed — touch requires deliberate tap
    expect(nav.classList.contains('open')).toBe(false);
  });

  /* -------------------------------------------------------------------------- */
  /* TEST 7: 50-Cycle Mobile Tap Stress Test                                    */
  /* -------------------------------------------------------------------------- */
  it('executes 50 consecutive mobile tap open/close cycles without stuck states', () => {
    window.innerWidth = 390;

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

    const nav = screen.getByTestId('v20-top-edge-nav');
    const toggleBtn = screen.getByTestId('v20-nav-toggle');

    for (let i = 0; i < 50; i++) {
      act(() => {
        fireEvent.click(toggleBtn);
      });
      const shouldBeOpen = i % 2 === 0;
      expect(nav.classList.contains('open')).toBe(shouldBeOpen);
    }
  });

  /* -------------------------------------------------------------------------- */
  /* TEST 8: Responsive Donut Chart Architecture (Zero Fixed-Width Overflow)    */
  /* -------------------------------------------------------------------------- */
  it('renders interactive donut chart with scalable SVG and responsive aspect ratio', () => {
    const mockSegments: DonutSegment[] = [
      { id: 'solved', label: 'Solved', value: 45, color: '#3BC977' },
      { id: 'progress', label: 'In Progress', value: 20, color: '#E59B2F' },
      { id: 'pending', label: 'Pending', value: 15, color: '#E05656' },
    ];

    render(
      <V20InteractiveDonut
        segments={mockSegments}
        periodLabel="Today"
        totalCases={80}
      />
    );

    const donutWrapper = screen.getByTestId('v20-donut-chart');
    expect(donutWrapper).toBeDefined();

    const ringBox = donutWrapper.querySelector('.v20-donut-ring-box') as HTMLElement;
    expect(ringBox).toBeDefined();
    // Responsive aspect ratio and width: 100%
    expect(ringBox.style.width).toBe('100%');
    expect(ringBox.style.maxWidth).toBe('320px');
    expect(ringBox.style.aspectRatio).toBe('1 / 1');

    const svg = donutWrapper.querySelector('svg');
    expect(svg).toBeDefined();
    expect(svg?.getAttribute('viewBox')).toBe('0 0 320 320');
    expect(svg?.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');
  });

  /* -------------------------------------------------------------------------- */
  /* TEST 9: Responsive Landing Page (Fluid Typography & CTAs)                  */
  /* -------------------------------------------------------------------------- */
  it('renders landing page with fluid typography and accessible CTA destinations', () => {
    const handleDash = vi.fn();
    const handleComp = vi.fn();

    render(
      <V20LandingPage
        departmentCode="KMC"
        departmentName="Karachi Metropolitan Corporation"
        role="head"
        staffName="Farooq Sattar"
        onNavigateToDashboard={handleDash}
        onNavigateToComplaints={handleComp}
      />
    );

    const landing = screen.getByTestId('v20-landing-page');
    expect(landing).toBeDefined();

    const greeting = screen.getByTestId('v20-landing-greeting');
    expect(greeting).toBeDefined();

    const staffName = screen.getByTestId('v20-landing-staff-name');
    expect(staffName.textContent).toBe('Farooq Sattar');

    const dashBtn = screen.getByTestId('v20-landing-dashboard-btn');
    act(() => {
      fireEvent.click(dashBtn);
    });
    expect(handleDash).toHaveBeenCalledTimes(1);

    const compBtn = screen.getByTestId('v20-landing-complaints-btn');
    act(() => {
      fireEvent.click(compBtn);
    });
    expect(handleComp).toHaveBeenCalledTimes(1);
  });
});
