import React from 'react';
import type { PriorityBand } from '../../../../types';

interface PriorityPillProps {
  priority?: PriorityBand | 'urgent' | 'medium' | string | null;
  verified?: boolean;
}

export const PriorityPill: React.FC<PriorityPillProps> = ({ priority, verified }) => {
  if (verified) {
    return (
      <span className="lg-priority-pill is-verified">
        <span className="lg-priority-dot" aria-hidden="true" />
        <span>Verified</span>
      </span>
    );
  }

  const norm = (priority || 'normal').toLowerCase();
  if (norm === 'critical' || norm === 'urgent') {
    return (
      <span className="lg-priority-pill is-critical">
        <span className="lg-priority-dot" aria-hidden="true" />
        <span>Urgent</span>
      </span>
    );
  }
  if (norm === 'high') {
    return (
      <span className="lg-priority-pill is-high">
        <span className="lg-priority-dot" aria-hidden="true" />
        <span>High</span>
      </span>
    );
  }
  return (
    <span className="lg-priority-pill">
      <span className="lg-priority-dot" aria-hidden="true" />
      <span>Routine</span>
    </span>
  );
};
