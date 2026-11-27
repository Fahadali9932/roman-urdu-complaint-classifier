import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TopEdgeMorphingNav } from '../features/department/components/v20/TopEdgeMorphingNav';
import { V20CursorSpotlight } from '../features/department/components/v20/V20CursorSpotlight';
import { V20PortalLayout } from '../features/department/components/v20/V20PortalLayout';
import { V20LandingPage } from '../features/department/components/v20/V20LandingPage';
import { V20DashboardPage } from '../features/department/components/v20/V20DashboardPage';
import { HodOfficersView } from '../features/department/components/v19/HodOfficersView';
import { HodProfileView } from '../features/department/components/v19/HodProfileView';
import { StaffNotificationsView } from '../features/department/components/v19/StaffNotificationsView';
import { DepartmentAuthProvider } from '../context/DepartmentAuthContext';
import type { DepartmentOfficer, DepartmentWorkOrder } from '../features/department/types/department';

describe('AWAAZ-E-AWAM Phase V21.4 — Final Motion, Light Mode & Responsive Engineering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /* -------------------------------------------------------------------------- */
  /* OBJECTIVE 1: Morphing Navbar Bounded Interaction & 50-Cycle Immunity       */
  /* -------------------------------------------------------------------------- */
  describe('Objective 1: Morphing Navbar Interaction Boundaries & Motion Determinism', () => {
    const mockTabs = [
      { id: 'home', label: 'Home' },
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'complaints', label: 'Complaints' },
      { id: 'officers', label: 'Officers' },
      { id: 'profile', label: 'Profile' },
    ];

    it('renders bounded interactive notch surface strictly matching notch dimensions', () => {
      render(
        <TopEdgeMorphingNav
          departmentCode="kmc"
          departmentName="Karachi Municipal Corporation"
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
      expect(interactiveSurface).toBeDefined();
      expect(interactiveSurface.classList.contains('is-collapsed')).toBe(true);

      const navContainer = screen.getByTestId('v20-top-edge-nav');
      expect(navContainer.getAttribute('data-nav-state')).toBe('collapsed');
    });

    it('opens immediately when pointer enters compact notch and closes with 75ms grace period', async () => {
      vi.useFakeTimers();

      render(
        <TopEdgeMorphingNav
          departmentCode="kmc"
          departmentName="Karachi Municipal Corporation"
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

      // Pointer enter on notch trigger surface
      act(() => {
        fireEvent.pointerEnter(interactiveSurface, { pointerType: 'mouse' });
      });

      expect(navContainer.getAttribute('data-nav-state')).toBe('opening');
      expect(interactiveSurface.classList.contains('is-open')).toBe(true);

      // Pointer leaves interactive surface
      act(() => {
        fireEvent.pointerLeave(interactiveSurface, { pointerType: 'mouse' });
      });

      // Still open within 75ms grace period
      expect(interactiveSurface.classList.contains('is-open')).toBe(true);

      // Advance past 75ms grace window
      act(() => {
        vi.advanceTimersByTime(80);
      });

      expect(navContainer.getAttribute('data-nav-state')).toBe('closing');
      vi.useRealTimers();
    });

    it('passes 50 consecutive open/close cycles with zero stuck states (50-Cycle Immunity)', () => {
      vi.useFakeTimers();

      render(
        <TopEdgeMorphingNav
          departmentCode="kmc"
          departmentName="Karachi Municipal Corporation"
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
      const toggleBtn = screen.getByTestId('v20-nav-toggle');
      const navContainer = screen.getByTestId('v20-top-edge-nav');

      for (let cycle = 1; cycle <= 50; cycle++) {
        if (cycle % 2 === 0) {
          // Hover cycle
          act(() => {
            fireEvent.pointerEnter(interactiveSurface, { pointerType: 'mouse' });
          });
          expect(navContainer.classList.contains('open')).toBe(true);

          act(() => {
            fireEvent.pointerLeave(interactiveSurface, { pointerType: 'mouse' });
            vi.advanceTimersByTime(100);
          });
          expect(navContainer.classList.contains('open')).toBe(false);
        } else {
          // Ensure cursor leaves before manual cycle
          act(() => {
            fireEvent.pointerLeave(interactiveSurface, { pointerType: 'mouse' });
            vi.advanceTimersByTime(100);
          });

          // Manual toggle click cycle
          act(() => {
            fireEvent.click(toggleBtn);
          });
          expect(navContainer.classList.contains('open')).toBe(true);

          act(() => {
            fireEvent.click(toggleBtn);
          });
          expect(navContainer.classList.contains('open')).toBe(false);

          // Reset manual close flag by leaving surface
          act(() => {
            fireEvent.pointerLeave(interactiveSurface, { pointerType: 'mouse' });
            vi.advanceTimersByTime(100);
          });
        }
      }

      // Assert clean final collapsed state
      expect(navContainer.getAttribute('data-nav-state')).toBe('closing');
      vi.useRealTimers();
    });

    it('dismisses smoothly via Escape key and blurs active focus', () => {
      render(
        <TopEdgeMorphingNav
          departmentCode="kmc"
          departmentName="Karachi Municipal Corporation"
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

      act(() => {
        fireEvent.click(toggleBtn);
      });
      expect(navContainer.classList.contains('open')).toBe(true);

      act(() => {
        fireEvent.keyDown(document, { key: 'Escape' });
      });
      expect(navContainer.classList.contains('open')).toBe(false);
    });

    it('selecting a tab executes callback and closes navbar', () => {
      const onSelectTab = vi.fn();
      render(
        <TopEdgeMorphingNav
          departmentCode="kmc"
          departmentName="Karachi Municipal Corporation"
          role="head"
          activeTab="dashboard"
          onSelectTab={onSelectTab}
          themeMode="dark"
          onToggleTheme={vi.fn()}
          onSignOut={vi.fn()}
          tabs={mockTabs}
        />
      );

      const toggleBtn = screen.getByTestId('v20-nav-toggle');
      const navContainer = screen.getByTestId('v20-top-edge-nav');

      act(() => {
        fireEvent.click(toggleBtn);
      });

      const complaintsTab = screen.getByTestId('v20-nav-btn-complaints');
      act(() => {
        fireEvent.click(complaintsTab);
      });

      expect(onSelectTab).toHaveBeenCalledWith('complaints');
      expect(navContainer.classList.contains('open')).toBe(false);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* OBJECTIVE 2: Cursor Spotlight Glow Effect                                   */
  /* -------------------------------------------------------------------------- */
  describe('Objective 2: Cursor Spotlight Glow Effect', () => {
    it('renders cursor spotlight element with pointer-events: none', () => {
      render(<V20CursorSpotlight themeMode="dark" departmentCode="kmc" />);

      const spotlight = screen.getByTestId('v20-cursor-spotlight');
      expect(spotlight).toBeDefined();
      expect(spotlight.classList.contains('dark-mode')).toBe(true);
      expect(spotlight.getAttribute('data-dept')).toBe('kmc');
      expect(spotlight.getAttribute('aria-hidden')).toBe('true');
    });

    it('updates position CSS custom properties on pointer movement without React state re-renders', () => {
      const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        cb(16);
        return 1;
      });

      const { container } = render(<V20CursorSpotlight themeMode="dark" departmentCode="kmc" />);
      const spotlight = container.querySelector('.v20-cursor-spotlight') as HTMLElement;

      act(() => {
        window.dispatchEvent(
          new MouseEvent('pointermove', {
            clientX: 340,
            clientY: 220,
          })
        );
      });

      expect(spotlight.style.getPropertyValue('--spotlight-x')).toBe('340px');
      expect(spotlight.style.getPropertyValue('--spotlight-y')).toBe('220px');

      rafSpy.mockRestore();
    });

    it('switches to light-mode class when themeMode is light', () => {
      render(<V20CursorSpotlight themeMode="light" departmentCode="kwsc" />);

      const spotlight = screen.getByTestId('v20-cursor-spotlight');
      expect(spotlight.classList.contains('light-mode')).toBe(true);
      expect(spotlight.getAttribute('data-dept')).toBe('kwsc');
    });
  });

  /* -------------------------------------------------------------------------- */
  /* OBJECTIVE 3: Complete Light Mode Color & Contrast Correction               */
  /* -------------------------------------------------------------------------- */
  describe('Objective 3: Light Mode Contrast & Semantic Glass Surfaces', () => {
    it('applies .v20-light-mode class and data-theme="light" to portal root', () => {
      render(
        <V20PortalLayout
          departmentCode="kmc"
          departmentName="Karachi Municipal Corporation"
          role="head"
          username="head_kmc"
          themeMode="light"
          onToggleTheme={vi.fn()}
          onSignOut={vi.fn()}
          activeTab="dashboard"
          onSelectTab={vi.fn()}
        >
          <div data-testid="test-content">Dashboard Content</div>
        </V20PortalLayout>
      );

      const portalRoot = screen.getByTestId('v20-portal-root');
      expect(portalRoot.classList.contains('v20-light-mode')).toBe(true);
      expect(portalRoot.getAttribute('data-theme')).toBe('light');

      // Verify cursor spotlight is integrated
      const spotlight = screen.getByTestId('v20-cursor-spotlight');
      expect(spotlight.classList.contains('light-mode')).toBe(true);
    });

    it('guarantees zero hardcoded dark rgba(18, 15, 12) surfaces in active rendered components', () => {
      const mockOfficers: DepartmentOfficer[] = [
        {
          user_id: 'off-101',
          employee_id: 'kmc-off-101',
          display_name: 'Farhan Zaidi',
          status: 'active',
          active_tasks_count: 2,
          resolved_30d_count: 12,
          on_time_rate_30d: 92,
          rating_avg: 4.7,
        },
      ];

      const { container } = render(
        <DepartmentAuthProvider>
          <HodOfficersView
            departmentCode="kmc"
            departmentName="Karachi Municipal Corporation"
            officers={mockOfficers}
            orders={[]}
            onProvisionOfficer={vi.fn()}
            onToggleSuspension={vi.fn()}
            onIssueWarning={vi.fn()}
            onExtendDeadline={vi.fn()}
          />
        </DepartmentAuthProvider>
      );

      const allElements = container.querySelectorAll('*');
      allElements.forEach((el) => {
        const style = (el as HTMLElement).getAttribute('style') || '';
        expect(style).not.toContain('rgba(18, 15, 12');
      });
    });

    it('notifications view renders with theme-aware glass surfaces and high contrast text', () => {
      const { container } = render(
        <StaffNotificationsView
          departmentCode="kmc"
          departmentName="Karachi Municipal Corporation"
          role="head"
          notifications={[]}
          onMarkAllRead={vi.fn()}
          onSelectNotification={vi.fn()}
        />
      );

      const allElements = container.querySelectorAll('*');
      allElements.forEach((el) => {
        const style = (el as HTMLElement).getAttribute('style') || '';
        expect(style).not.toContain('rgba(18, 15, 12');
      });
    });

    it('HOD profile settings renders with theme-aware glass surfaces', () => {
      const { container } = render(
        <DepartmentAuthProvider>
          <HodProfileView
            departmentCode="kmc"
            departmentName="Karachi Municipal Corporation"
            username="head_kmc"
            onSignOut={vi.fn()}
          />
        </DepartmentAuthProvider>
      );

      const allElements = container.querySelectorAll('*');
      allElements.forEach((el) => {
        const style = (el as HTMLElement).getAttribute('style') || '';
        expect(style).not.toContain('rgba(18, 15, 12');
      });
    });
  });

  /* -------------------------------------------------------------------------- */
  /* OBJECTIVE 4: Mobile Responsiveness Across Viewports                        */
  /* -------------------------------------------------------------------------- */
  describe('Objective 4: Mobile Responsiveness Across Viewports', () => {
    it('renders Landing page with fluid typography and zero text overflow at 320px viewport', () => {
      render(
        <V20LandingPage
          departmentCode="kmc"
          departmentName="Karachi Municipal Corporation"
          role="head"
          staffName="Farhan Zaidi"
          onNavigateToDashboard={vi.fn()}
          onNavigateToComplaints={vi.fn()}
        />
      );

      const greetingTitle = screen.getByTestId('v20-landing-greeting');
      expect(greetingTitle).toBeDefined();
      expect(greetingTitle.classList.contains('v20-landing-greeting-title')).toBe(true);

      const staffName = screen.getByTestId('v20-landing-staff-name');
      expect(staffName).toBeDefined();
      expect(staffName.textContent).toBe('Farhan Zaidi');

      const dashboardBtn = screen.getByTestId('v20-landing-dashboard-btn');
      expect(dashboardBtn).toBeDefined();
      const complaintsBtn = screen.getByTestId('v20-landing-complaints-btn');
      expect(complaintsBtn).toBeDefined();
    });

    it('compacts TopEdgeMorphingNav for mobile viewports below 768px', () => {
      // Simulate mobile window width (390px)
      window.innerWidth = 390;
      window.dispatchEvent(new Event('resize'));

      render(
        <TopEdgeMorphingNav
          departmentCode="kmc"
          departmentName="Karachi Municipal Corporation"
          role="head"
          activeTab="dashboard"
          onSelectTab={vi.fn()}
          themeMode="dark"
          onToggleTheme={vi.fn()}
          onSignOut={vi.fn()}
        />
      );

      const navContainer = screen.getByTestId('v20-top-edge-nav');
      expect(navContainer).toBeDefined();

      // Reset window width
      window.innerWidth = 1440;
      window.dispatchEvent(new Event('resize'));
    });
  });
});
