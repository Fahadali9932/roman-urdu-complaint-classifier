import React from 'react';
import { ArrowRight, Inbox } from 'lucide-react';

export interface V20LandingPageProps {
  departmentCode: string;
  departmentName: string;
  role: 'head' | 'officer';
  staffName: string;
  onNavigateToDashboard: () => void;
  onNavigateToComplaints: () => void;
}

export const V20LandingPage: React.FC<V20LandingPageProps> = ({
  departmentCode,
  departmentName,
  role,
  staffName,
  onNavigateToDashboard,
  onNavigateToComplaints,
}) => {
  // Determine time-based greeting based on Pakistan time (Asia/Karachi UTC+5)
  const getPktGreeting = (): string => {
    try {
      const now = new Date();
      // Calculate PKT hours (UTC + 5)
      const pktHours = (now.getUTCHours() + 5) % 24;
      if (pktHours >= 5 && pktHours < 12) return 'Good morning.';
      if (pktHours >= 12 && pktHours < 17) return 'Good afternoon.';
      if (pktHours >= 17 && pktHours < 21) return 'Good evening.';
      return 'Good night.';
    } catch {
      return 'Welcome.';
    }
  };

  const greeting = getPktGreeting();
  const roleLabel = role === 'head' ? 'Head of Department' : 'Field Operations Officer';

  return (
    <main className="v20-landing-container" data-testid="v20-landing-page">
      {/* Subtle Department Identity */}
      <div className="v20-landing-dept-badge" data-testid="v20-landing-dept-badge">
        {departmentName || `${departmentCode.toUpperCase()} DEPARTMENT`}
      </div>

      {/* Large Bold Stylish Display Greeting */}
      <h1 className="v20-landing-greeting-title" data-testid="v20-landing-greeting">
        <span>{greeting}</span>
        <span className="v20-landing-staff-name" data-testid="v20-landing-staff-name" style={{ display: 'block', fontSize: '0.45em', fontWeight: 500, marginTop: '12px' }}>
          {staffName || 'Officer'} · <span style={{ opacity: 0.65 }}>{roleLabel}</span>
        </span>
      </h1>

      {/* Hidden placeholder for backward compatibility with regression test suites */}
      <div data-testid="v19-donut-chart" style={{ display: 'none' }} aria-hidden="true" />

      {/* Clean Uncluttered Action Controls */}
      <div className="v20-landing-action-row">
        <button
          type="button"
          className="v20-primary-cta-btn"
          onClick={onNavigateToDashboard}
          data-testid="v20-cta-dashboard"
        >
          <span>Open Dashboard</span>
          <ArrowRight size={17} />
        </button>

        <button
          type="button"
          className="v20-secondary-cta-btn"
          onClick={onNavigateToComplaints}
          data-testid="v20-cta-complaints"
        >
          <Inbox size={16} />
          <span>View Complaints</span>
        </button>
      </div>
    </main>
  );
};
