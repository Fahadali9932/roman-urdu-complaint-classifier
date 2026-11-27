import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { V20LandingPage } from '../features/department/components/v20/V20LandingPage';
import { TopEdgeMorphingNav } from '../features/department/components/v20/TopEdgeMorphingNav';
import { trustedTimeService } from '../services/trustedTimeService';

describe('V21.1 Navigation Engineering & Landing Refinement Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Landing Display Name Refinements', () => {
    it('renders authenticated profile name when human display name is provided', () => {
      render(
        <V20LandingPage
          departmentCode="roads"
          departmentName="Karachi Engineering & Roads Department"
          role="head"
          staffName="Engr. Tariq Mehmood"
        />
      );

      const staffNameEl = screen.getByTestId('v20-landing-staff-name');
      expect(staffNameEl).toBeInTheDocument();
      expect(staffNameEl.textContent).toBe('Engr. Tariq Mehmood');
      expect(staffNameEl).toHaveClass('v20-landing-staff-name');
    });

    it('falls back to "Admin" when staffName is missing, empty, or generic handle', () => {
      const { rerender } = render(
        <V20LandingPage
          departmentCode="roads"
          departmentName="Karachi Engineering & Roads Department"
          role="head"
          staffName=""
        />
      );

      expect(screen.getByTestId('v20-landing-staff-name').textContent).toBe('Admin');

      rerender(
        <V20LandingPage
          departmentCode="roads"
          departmentName="Karachi Engineering & Roads Department"
          role="head"
          staffName="roads-01"
        />
      );
      expect(screen.getByTestId('v20-landing-staff-name').textContent).toBe('Admin');

      rerender(
        <V20LandingPage
          departmentCode="roads"
          departmentName="Karachi Engineering & Roads Department"
          role="officer"
          staffName="roads-officer-01"
        />
      );
      expect(screen.getByTestId('v20-landing-staff-name').textContent).toBe('Admin');

      rerender(
        <V20LandingPage
          departmentCode="kda"
          departmentName="Karachi Development Authority"
          role="head"
          staffName="kda-02"
        />
      );
      expect(screen.getByTestId('v20-landing-staff-name').textContent).toBe('Admin');
    });

    it('triggers navigation callbacks for Dashboard and Complaints CTA buttons', () => {
      const onNavigateToDashboard = vi.fn();
      const onNavigateToComplaints = vi.fn();

      render(
        <V20LandingPage
          departmentCode="roads"
          departmentName="Karachi Engineering & Roads Department"
          role="head"
          staffName="Admin"
          onNavigateToDashboard={onNavigateToDashboard}
          onNavigateToComplaints={onNavigateToComplaints}
        />
      );

      const dashBtn = screen.getByTestId('v20-landing-dashboard-btn');
      fireEvent.click(dashBtn);
      expect(onNavigateToDashboard).toHaveBeenCalledTimes(1);

      const compBtn = screen.getByTestId('v20-landing-complaints-btn');
      fireEvent.click(compBtn);
      expect(onNavigateToComplaints).toHaveBeenCalledTimes(1);
    });

    it('renders greeting headline aligned with Karachi PKT trusted time', () => {
      render(
        <V20LandingPage
          departmentCode="roads"
          departmentName="Karachi Engineering & Roads Department"
          role="head"
          staffName="Admin"
        />
      );

      const greetingEl = screen.getByTestId('v20-landing-greeting');
      expect(greetingEl).toBeInTheDocument();
      expect(greetingEl.textContent).toMatch(/Good (morning|afternoon|evening|night)\./i);
    });
  });

  describe('2. Morphing Navigation Dynamic Geometry & Click Target Verification', () => {
    it('renders collapsed state with toggle button and initial notch', () => {
      render(
        <TopEdgeMorphingNav
          departmentCode="ROADS"
          departmentName="Karachi Engineering & Roads Department"
          role="head"
          activeTab="home"
          onSelectTab={vi.fn()}
          themeMode="dark"
          onToggleTheme={vi.fn()}
          onSignOut={vi.fn()}
        />
      );

      const toggle = screen.getByTestId('v20-nav-toggle');
      expect(toggle).toBeInTheDocument();
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(toggle).toHaveAttribute('aria-label', 'Open navigation');
    });

    it('expands when toggle is clicked and renders all HOD destination tabs', () => {
      const onSelectTab = vi.fn();
      const onOpenNotifications = vi.fn();

      render(
        <TopEdgeMorphingNav
          departmentCode="ROADS"
          departmentName="Karachi Engineering & Roads Department"
          role="head"
          activeTab="home"
          onSelectTab={onSelectTab}
          themeMode="dark"
          onToggleTheme={vi.fn()}
          onSignOut={vi.fn()}
          unreadNotifications={3}
          onOpenNotifications={onOpenNotifications}
        />
      );

      const toggle = screen.getByTestId('v20-nav-toggle');
      fireEvent.click(toggle);

      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      expect(toggle).toHaveAttribute('aria-label', 'Close navigation');

      // Verify all HOD tabs exist and are clickable
      const expectedTabs = ['home', 'dashboard', 'complaints', 'verification', 'officers', 'profile'];
      for (const tabId of expectedTabs) {
        const btn = screen.getByTestId(`v20-nav-btn-${tabId}`);
        expect(btn).toBeInTheDocument();
        fireEvent.click(btn);
        expect(onSelectTab).toHaveBeenCalledWith(tabId);
      }

      // Verify Notifications button
      const notifBtn = screen.getByTestId('v20-nav-btn-notifications');
      expect(notifBtn).toBeInTheDocument();
      fireEvent.click(notifBtn);
      expect(onOpenNotifications).toHaveBeenCalledTimes(1);
    });

    it('renders Officer destination tabs when role is officer', () => {
      const onSelectTab = vi.fn();

      render(
        <TopEdgeMorphingNav
          departmentCode="ROADS"
          departmentName="Karachi Engineering & Roads Department"
          role="officer"
          activeTab="work"
          onSelectTab={onSelectTab}
          themeMode="dark"
          onToggleTheme={vi.fn()}
          onSignOut={vi.fn()}
        />
      );

      const toggle = screen.getByTestId('v20-nav-toggle');
      fireEvent.click(toggle);

      const officerTabs = ['home', 'dashboard', 'complaints', 'work', 'performance', 'notifications', 'profile'];
      for (const tabId of officerTabs) {
        const btn = screen.getByTestId(`v20-nav-btn-${tabId}`);
        expect(btn).toBeInTheDocument();
        fireEvent.click(btn);
        expect(onSelectTab).toHaveBeenCalledWith(tabId);
      }
    });

    it('allows opening via mouseenter (0ms delay) and closing via escape key', () => {
      const { container } = render(
        <TopEdgeMorphingNav
          departmentCode="ROADS"
          departmentName="Karachi Engineering & Roads Department"
          role="head"
          activeTab="home"
          onSelectTab={vi.fn()}
          themeMode="dark"
          onToggleTheme={vi.fn()}
          onSignOut={vi.fn()}
        />
      );

      const header = container.querySelector('header');
      expect(header).toBeInTheDocument();

      // Trigger mouse enter
      fireEvent.pointerEnter(header!, { pointerType: 'mouse' });
      const toggle = screen.getByTestId('v20-nav-toggle');
      expect(toggle).toHaveAttribute('aria-expanded', 'true');

      // Press Escape to dismiss
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
    });

    it('fires theme toggle and sign out callbacks', () => {
      const onToggleTheme = vi.fn();
      const onSignOut = vi.fn();

      render(
        <TopEdgeMorphingNav
          departmentCode="ROADS"
          departmentName="Karachi Engineering & Roads Department"
          role="head"
          activeTab="home"
          onSelectTab={vi.fn()}
          themeMode="dark"
          onToggleTheme={onToggleTheme}
          onSignOut={onSignOut}
        />
      );

      const themeBtn = screen.getByTestId('v20-theme-toggle');
      fireEvent.click(themeBtn);
      expect(onToggleTheme).toHaveBeenCalledTimes(1);

      const signOutBtn = screen.getByTestId('v20-signout-btn');
      fireEvent.click(signOutBtn);
      expect(onSignOut).toHaveBeenCalledTimes(1);
    });
  });
});
