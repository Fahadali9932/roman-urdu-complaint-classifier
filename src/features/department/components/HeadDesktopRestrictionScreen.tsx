import React from 'react';
import { Link } from 'react-router-dom';
import { Monitor, Moon, Sun, ArrowLeft } from 'lucide-react';
import '../v15-head-desktop.css';

interface HeadDesktopRestrictionScreenProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  viewportWidth?: number;
}

/**
 * Rendered cleanly on mobile phones and viewports narrower than 1024px whenever
 * any Department Head operational route is visited, without clearing auth state.
 */
export const HeadDesktopRestrictionScreen: React.FC<HeadDesktopRestrictionScreenProps> = ({
  theme,
  onToggleTheme,
}) => {
  return (
    <div
      className="v15-restriction-shell"
      data-theme={theme}
      data-testid="head-desktop-restriction"
    >
      <header className="v15-restriction-topbar">
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--v15-ink)' }}>
          Awaaz-e-Awam
        </span>
        <button
          type="button"
          onClick={onToggleTheme}
          className="v15-surface-btn"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{ minWidth: '44px', minHeight: '44px', padding: '0 12px' }}
        >
          {theme === 'dark' ? <Sun size={16} strokeWidth={1.75} /> : <Moon size={16} strokeWidth={1.75} />}
          <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>
      </header>

      <main className="v15-restriction-card" aria-labelledby="head-desktop-restriction-heading">
        <div className="v15-restriction-icon" aria-hidden="true">
          <Monitor size={22} strokeWidth={1.5} />
        </div>

        <h1
          id="head-desktop-restriction-heading"
          style={{
            margin: 0,
            fontSize: 'clamp(22px, 4vw, 26px)',
            fontWeight: 600,
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            color: 'var(--v15-ink)',
          }}
        >
          Continue on desktop
        </h1>

        <p
          style={{
            margin: 0,
            fontSize: '14px',
            lineHeight: 1.6,
            color: 'var(--v15-muted)',
          }}
        >
          The Department Head workspace is designed for desktop and laptop computers.
        </p>

        <p
          style={{
            margin: 0,
            fontSize: '12.5px',
            lineHeight: 1.5,
            color: 'var(--v15-muted)',
          }}
        >
          Minimum supported width is 1024px. Your active session stays signed in if you widen this window or reopen it on a laptop.
        </p>

        <div style={{ paddingTop: '6px', width: '100%' }}>
          <Link
            to="/"
            className="v15-primary-btn"
            style={{ minHeight: '44px', width: '100%' }}
          >
            <ArrowLeft size={16} strokeWidth={1.75} />
            <span>Return to homepage</span>
          </Link>
        </div>
      </main>

      <footer
        style={{
          width: '100%',
          maxWidth: '960px',
          margin: '0 auto',
          fontSize: '12px',
          color: 'var(--v15-muted)',
        }}
      >
        Awaaz-e-Awam · Municipal Operations Platform
      </footer>
    </div>
  );
};
