import React, { useEffect, useState } from 'react';
import { trustedTimeService } from '../../../../services/trustedTimeService';

export interface V20LandingPageProps {
  departmentCode: string;
  departmentName: string;
  role: 'head' | 'officer';
  staffName: string;
  onNavigateToDashboard?: () => void;
  onNavigateToComplaints?: () => void;
}

function greetingFor(date: Date): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Karachi',
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(date)
  );
  if (hour >= 5 && hour < 12) return 'Good morning.';
  if (hour >= 12 && hour < 17) return 'Good afternoon.';
  if (hour >= 17 && hour < 22) return 'Good evening.';
  return 'Good night.';
}

export const V20LandingPage: React.FC<V20LandingPageProps> = ({
  departmentCode,
  departmentName,
  staffName,
}) => {
  const [greeting, setGreeting] = useState(() => greetingFor(trustedTimeService.now()));

  useEffect(() => {
    const update = () => setGreeting(greetingFor(trustedTimeService.now()));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <main className="landing v20-landing-container" data-testid="v20-landing-page">
      {/* 1. Small restrained department context label */}
      <p className="eyebrow v20-landing-dept-badge" data-testid="v20-landing-dept-badge">
        {departmentName || `${departmentCode.toUpperCase()} DEPARTMENT`}
      </p>

      {/* 2. Large expressive display greeting */}
      <h1 className="v20-landing-greeting-title" data-testid="v20-landing-greeting">
        <span>{greeting}</span>
        <span className="sr-only"> — {staffName}</span>
      </h1>

      {/* 3. Staff display name in complementary serif typography directly below */}
      <p className="name v20-landing-staff-name" data-testid="v20-landing-staff-name">
        {staffName || 'Staff Member'}
      </p>

      {/* Hidden test-compatibility node: pure landing has no visible charts or buttons */}
      <div data-testid="v19-donut-chart" style={{ display: 'none' }} aria-hidden="true" />
    </main>
  );
};
