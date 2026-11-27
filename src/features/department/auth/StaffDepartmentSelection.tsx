import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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

    // Controlled easing transition: card visual feedback -> crossfade to Stage 2
    setTimeout(() => {
      onSelectDepartment(deptKey);
    }, 420);
  };

  const isHead = role === 'head';
  const roleLabel = isHead ? 'Department Head' : 'Field Officer';
  const roleCategory = isHead ? 'Agency Command & Oversight' : 'Field Operations & Resolution';

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

      {/* 2. Top Navigation Bar */}
      <header
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: '1120px',
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
            <span
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.1)',
                border: isLight ? '1px solid rgba(0, 0, 0, 0.12)' : '1px solid rgba(255, 255, 255, 0.16)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                fontWeight: 800,
              }}
            >
              a.
            </span>
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

        {/* Right Actions: Return home & Theme Toggle */}
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

      {/* 3. Hero Typography Block */}
      <main
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: '1120px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          flex: 1,
          justifyContent: 'center',
          opacity: isAnimatingOut ? 0.9 : 1,
          transition: 'opacity 300ms ease',
        }}
      >
        <div style={{ maxWidth: '840px', marginBottom: '44px' }}>
          <span
            style={{
              display: 'inline-block',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: isLight ? '#454545' : 'rgba(242, 239, 233, 0.65)',
              marginBottom: '12px',
            }}
          >
            MUNICIPAL OPERATIONS · {roleCategory.toUpperCase()}
          </span>

          <h1
            style={{
              fontFamily: 'var(--v20-font-display, "Inter Display", "Inter", sans-serif)',
              fontSize: 'clamp(44px, 6.6vw, 104px)',
              fontWeight: 750,
              letterSpacing: '-0.04em',
              lineHeight: 1.02,
              margin: '0 0 16px 0',
              color: isLight ? '#171717' : '#F8F2E8',
              textShadow: isLight ? 'none' : '0 4px 30px rgba(0, 0, 0, 0.45)',
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
              color: isLight ? '#454545' : 'rgba(242, 239, 233, 0.72)',
              margin: '0 auto',
              maxWidth: '560px',
            }}
          >
            Choose your designated municipal authority to enter the {roleLabel} workspace.
          </p>
        </div>

        {/* 4. Substantial Department Cards Grid (3 Columns x 2 Rows on Desktop) */}
        <div
          role="group"
          aria-label="Municipal Departments"
          style={{
            width: '100%',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px',
            boxSizing: 'border-box',
          }}
        >
          {STAFF_DEPARTMENTS.map((dept) => {
            const isSelected = selectedKey === dept.key;
            const isFading = isAnimatingOut && !isSelected;

            return (
              <button
                key={dept.key}
                type="button"
                data-testid={`dept-card-${dept.key}`}
                aria-label={`Select ${dept.name} (${dept.code})`}
                onClick={() => handleCardClick(dept.key)}
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '164px',
                  padding: '24px',
                  borderRadius: '22px',
                  textAlign: 'left',
                  cursor: isAnimatingOut ? 'default' : 'pointer',
                  border: isLight
                    ? isSelected
                      ? `2px solid ${dept.accent}`
                      : '1px solid rgba(0, 0, 0, 0.12)'
                    : isSelected
                    ? `2px solid ${dept.accent}`
                    : `1px solid ${dept.accent}33`,
                  background: isLight
                    ? 'rgba(255, 255, 255, 0.88)'
                    : `linear-gradient(145deg, ${dept.baseBg} 0%, rgba(20, 24, 32, 0.85) 100%)`,
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  boxShadow: isLight
                    ? '0 10px 24px rgba(0, 0, 0, 0.06)'
                    : `0 12px 36px rgba(0, 0, 0, 0.4), inset 0 0 24px ${dept.glow}`,
                  opacity: isFading ? 0.25 : 1,
                  transform: isSelected
                    ? 'scale(1.02)'
                    : isFading
                    ? 'scale(0.97)'
                    : 'none',
                  transition: 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1), opacity 260ms ease, border-color 200ms ease, box-shadow 200ms ease',
                  overflow: 'hidden',
                  outline: 'none',
                }}
              >
                {/* Subtle Ambient Radial Highlight in Department Accent */}
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    top: '-40%',
                    right: '-40%',
                    width: '180px',
                    height: '180px',
                    borderRadius: '50%',
                    background: dept.glow,
                    filter: 'blur(36px)',
                    pointerEvents: 'none',
                    opacity: isLight ? 0.3 : 0.6,
                  }}
                />

                {/* Top Row: Department Abbreviation + Subtle Arrow */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: dept.accent,
                        boxShadow: `0 0 10px ${dept.accent}`,
                        display: 'inline-block',
                      }}
                      aria-hidden="true"
                    />
                    <span
                      style={{
                        fontFamily: 'var(--v20-font-display, "Inter", sans-serif)',
                        fontSize: '22px',
                        fontWeight: 800,
                        letterSpacing: '-0.02em',
                        color: isLight ? '#171717' : '#FFFFFF',
                      }}
                    >
                      {dept.code}
                    </span>
                  </div>

                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: dept.accent,
                      transition: 'transform 180ms ease',
                    }}
                  >
                    <ArrowRight size={16} />
                  </div>
                </div>

                {/* Bottom Row: Concise Full Name & Category */}
                <div style={{ position: 'relative', zIndex: 1, marginTop: '20px' }}>
                  <div
                    style={{
                      fontSize: '14.5px',
                      fontWeight: 650,
                      lineHeight: 1.35,
                      color: isLight ? '#171717' : 'rgba(242, 239, 233, 0.95)',
                      marginBottom: '4px',
                    }}
                  >
                    {dept.name}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: isLight ? '#626262' : 'rgba(242, 239, 233, 0.58)',
                    }}
                  >
                    {dept.category}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Alternate Role Switch Notice */}
        <div
          style={{
            marginTop: '44px',
            paddingTop: '20px',
            borderTop: isLight ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '13px',
            color: isLight ? '#626262' : 'rgba(242, 239, 233, 0.65)',
          }}
        >
          <span>{isHead ? 'Operating in the field?' : 'Assigned to departmental leadership?'}</span>
          <Link
            to={isHead ? '/department/officer/login' : '/department/head/login'}
            style={{
              color: isLight ? '#171717' : '#F2EFE9',
              fontWeight: 650,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>{isHead ? 'Officer sign-in' : 'Department Head sign-in'}</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </main>
    </div>
  );
};
