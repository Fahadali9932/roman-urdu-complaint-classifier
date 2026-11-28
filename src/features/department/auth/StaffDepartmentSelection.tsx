import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AwaazLogo } from '../../../components/common/AwaazLogo';
import { ArrowRight, ArrowLeft, Sun, Moon } from 'lucide-react';
import {
  STAFF_DEPARTMENTS,
  type StaffDepartmentKey,
} from '../services/departmentThemes';
import '../v20-atmospheric.css';

export interface StaffDepartmentSelectionProps {
  role: 'head' | 'officer';
  onSelectDepartment: (deptKey: StaffDepartmentKey) => void;
  themeMode?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const StaffDepartmentSelection: React.FC<StaffDepartmentSelectionProps> = ({
  role,
  onSelectDepartment,
  themeMode = 'dark',
  onToggleTheme,
}) => {
  const [selectedKey, setSelectedKey] = useState<StaffDepartmentKey | null>(null);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const isLight = themeMode === 'light';

  const handleCardClick = (deptKey: StaffDepartmentKey) => {
    if (isAnimatingOut) return;
    setSelectedKey(deptKey);
    setIsAnimatingOut(true);

    // Controlled easing transition: row feedback -> transition to Stage 2
    setTimeout(() => {
      onSelectDepartment(deptKey);
    }, 420);
  };

  const isHead = role === 'head';
  const roleLabel = isHead ? 'Department Head' : 'Field Officer';

  return (
    <div
      className={`v20-portal-root ${isLight ? 'v20-light-mode' : ''}`}
      data-dept="selection"
      data-theme={themeMode}
      data-role={role}
      data-testid="staff-department-selection-page"
      style={{
        minHeight: '100vh',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        overflowX: 'hidden',
        padding: '24px 20px 48px',
      }}
    >
      {/* 1. Neutral Atmospheric Background (Graphite / Slate / Silver Glow) */}
      <div className="v20-atmospheric-background" aria-hidden="true" />

      {/* 2. Top Header Navigation */}
      <header
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: isHead ? '1120px' : '960px',
          margin: '0 auto 40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        {/* Brand & Role Monogram */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              textDecoration: 'none',
              color: isLight ? '#171717' : '#F2EFE9',
              fontWeight: 750,
              fontSize: '17px',
              letterSpacing: '-0.02em',
            }}
          >
            <AwaazLogo size={28} />
            <span>Awaaz-e-Awam</span>
          </Link>

          <span
            style={{
              padding: '4px 10px',
              borderRadius: '9999px',
              background: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.08)',
              border: isLight ? '1px solid rgba(0, 0, 0, 0.1)' : '1px solid rgba(255, 255, 255, 0.12)',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: isLight ? '#454545' : 'rgba(242, 239, 233, 0.8)',
            }}
          >
            {roleLabel}
          </span>
        </div>

        {/* Right Actions: Return home & Theme Toggle (Strictly zero cross-role switching links) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 600,
              color: isLight ? '#454545' : 'rgba(242, 239, 233, 0.72)',
              textDecoration: 'none',
              padding: '8px 14px',
              borderRadius: '9999px',
              background: isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.05)',
              border: isLight ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.1)',
              transition: 'background 160ms ease, color 160ms ease',
            }}
          >
            <ArrowLeft size={14} />
            <span>Homepage</span>
          </Link>

          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
              data-testid="staff-selection-theme-toggle"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.06)',
                border: isLight ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.1)',
                color: isLight ? '#171717' : '#F2EFE9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 160ms ease',
              }}
            >
              {isLight ? <Moon size={16} /> : <Sun size={16} />}
            </button>
          )}
        </div>
      </header>

      {/* 3. Main Composition */}
      {isHead ? (
        /* HOD Selection: Asymmetric 2-Column Editorial Grid (Objective 3) */
        <main
          style={{
            position: 'relative',
            zIndex: 1,
            width: '100%',
            maxWidth: '1120px',
            margin: 'auto',
            opacity: isAnimatingOut ? 0.9 : 1,
            transition: 'opacity 300ms ease',
          }}
        >
          <div className="v20-hod-selection-grid">
            {/* Left Column: Role Identifier, Display Heading, Concise Instruction */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    fontSize: '12px',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: isLight ? '#454545' : 'rgba(242, 239, 233, 0.72)',
                    marginBottom: '14px',
                  }}
                >
                  Department Head.
                </span>

                <h1
                  style={{
                    fontFamily: 'var(--v20-font-display, "Inter Display", "Inter", sans-serif)',
                    fontSize: 'clamp(52px, 6.8vw, 104px)',
                    fontWeight: 750,
                    letterSpacing: '-0.04em',
                    lineHeight: 1.02,
                    margin: '0 0 18px 0',
                    color: isLight ? '#171717' : '#FFFFFF',
                    textWrap: 'balance',
                  }}
                >
                  Select your department.
                </h1>

                <p
                  style={{
                    fontSize: 'clamp(16px, 1.8vw, 20px)',
                    fontWeight: 500,
                    lineHeight: 1.45,
                    color: isLight ? '#454545' : 'rgba(242, 239, 233, 0.75)',
                    margin: 0,
                    maxWidth: '460px',
                  }}
                >
                  Choose your department to sign in.
                </p>
              </div>
            </div>

            {/* Right Column: 6 Clean Vertical Department Selection Rows */}
            <div
              role="group"
              aria-label="Municipal Departments"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                width: '100%',
              }}
            >
              {STAFF_DEPARTMENTS.map((dept) => {
                const isSelected = selectedKey === dept.key;
                const isFading = isAnimatingOut && !isSelected;

                return (
                  <button
                    key={dept.key}
                    type="button"
                    className="v20-dept-row"
                    data-testid={`dept-card-${dept.key}`}
                    data-dept-row={dept.key}
                    aria-label={`Select ${dept.code} — ${dept.category}`}
                    onClick={() => handleCardClick(dept.key)}
                    style={{
                      opacity: isFading ? 0.3 : 1,
                      borderColor: isSelected ? dept.accent : undefined,
                      transform: isSelected ? 'scale(1.015)' : undefined,
                    }}
                  >
                    <div className="v20-dept-row-left">
                      <span
                        className="v20-dept-row-dot"
                        style={{ backgroundColor: dept.accent }}
                        aria-hidden="true"
                      />
                      <div className="v20-dept-row-label">
                        <span className="v20-dept-row-code">{dept.code}</span>
                        <span className="v20-dept-row-separator">—</span>
                        <span className="v20-dept-row-category">{dept.category}</span>
                      </div>
                    </div>

                    <div className="v20-dept-row-arrow">
                      <ArrowRight size={16} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </main>
      ) : (
        /* Officer Selection: Independent Centered Composition (Objective 4) */
        <main
          style={{
            position: 'relative',
            zIndex: 1,
            width: '100%',
            maxWidth: '960px',
            margin: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            opacity: isAnimatingOut ? 0.9 : 1,
            transition: 'opacity 300ms ease',
          }}
        >
          {/* Header Typography Block */}
          <div style={{ maxWidth: '720px', marginBottom: '36px' }}>
            <span
              style={{
                display: 'inline-block',
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: isLight ? '#454545' : 'rgba(242, 239, 233, 0.72)',
                marginBottom: '12px',
              }}
            >
              Field Officer.
            </span>

            <h1
              style={{
                fontFamily: 'var(--v20-font-display, "Inter Display", "Inter", sans-serif)',
                fontSize: 'clamp(44px, 5.8vw, 84px)',
                fontWeight: 750,
                letterSpacing: '-0.04em',
                lineHeight: 1.02,
                margin: '0 0 14px 0',
                color: isLight ? '#171717' : '#FFFFFF',
                textWrap: 'balance',
              }}
            >
              Select your department.
            </h1>

            <p
              style={{
                fontSize: 'clamp(15px, 1.6vw, 18px)',
                fontWeight: 500,
                lineHeight: 1.45,
                color: isLight ? '#454545' : 'rgba(242, 239, 233, 0.75)',
                margin: '0 auto',
                maxWidth: '520px',
              }}
            >
              Choose your department to sign in.
            </p>
          </div>

          {/* 6 Clean Department Rows (2 cols desktop, 1 col mobile) */}
          <div
            role="group"
            aria-label="Municipal Departments"
            className="v20-officer-selection-grid"
          >
            {STAFF_DEPARTMENTS.map((dept) => {
              const isSelected = selectedKey === dept.key;
              const isFading = isAnimatingOut && !isSelected;

              return (
                <button
                  key={dept.key}
                  type="button"
                  className="v20-dept-row"
                  data-testid={`dept-card-${dept.key}`}
                  data-dept-row={dept.key}
                  aria-label={`Select ${dept.code} — ${dept.category}`}
                  onClick={() => handleCardClick(dept.key)}
                  style={{
                    opacity: isFading ? 0.3 : 1,
                    borderColor: isSelected ? dept.accent : undefined,
                    transform: isSelected ? 'scale(1.015)' : undefined,
                  }}
                >
                  <div className="v20-dept-row-left">
                    <span
                      className="v20-dept-row-dot"
                      style={{ backgroundColor: dept.accent }}
                      aria-hidden="true"
                    />
                    <div className="v20-dept-row-label">
                      <span className="v20-dept-row-code">{dept.code}</span>
                      <span className="v20-dept-row-separator">—</span>
                      <span className="v20-dept-row-category">{dept.category}</span>
                    </div>
                  </div>

                  <div className="v20-dept-row-arrow">
                    <ArrowRight size={16} />
                  </div>
                </button>
              );
            })}
          </div>
        </main>
      )}
    </div>
  );
};

export default StaffDepartmentSelection;
