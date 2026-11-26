import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Moon, Sun, Globe } from 'lucide-react';

interface V3AuthShellProps {
  portalTitle: string;
  eyebrow: string;
  subtitle?: string;
  artwork?: React.ReactNode;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  language?: 'en' | 'ur';
  onToggleLanguage?: () => void;
  backTo?: string;
  backLabel?: string;
  headerActions?: React.ReactNode;
  titleAsHeading?: boolean;
  children: React.ReactNode;
}

/**
 * Full-viewport V3 Atmospheric Civic Glass authentication shell:
 * - Preserves authoritative department / admin backdrop artwork
 * - Left transparent typographic anchor (Awaaz-e-Awam, 46px title)
 * - Right 396px frosted glass surface (rgba(241,244,246,0.86) light / rgba(40,53,65,0.86) dark)
 */
export const V3AuthShell: React.FC<V3AuthShellProps> = ({
  portalTitle,
  eyebrow,
  subtitle,
  artwork,
  theme,
  onToggleTheme,
  language = 'en',
  onToggleLanguage,
  backTo = '/',
  backLabel = 'Citizen Portal',
  headerActions,
  titleAsHeading = true,
  children,
}) => {
  return (
    <div
      className="v3-portal-shell relative flex min-h-screen flex-col justify-between overflow-x-clip"
      data-theme={theme}
    >
      {/* Preserved ambient municipal artwork backdrop */}
      {artwork && (
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          aria-hidden="true"
        >
          {artwork}
          <div
            className="absolute inset-0"
            style={{
              background:
                theme === 'dark'
                  ? 'linear-gradient(120deg, rgba(32, 43, 53, 0.94) 0%, rgba(32, 43, 53, 0.86) 52%, rgba(32, 43, 53, 0.74) 100%)'
                  : 'linear-gradient(120deg, rgba(232, 237, 240, 0.96) 0%, rgba(232, 237, 240, 0.92) 50%, rgba(232, 237, 240, 0.78) 100%)',
            }}
          />
        </div>
      )}

      {/* Top subtle navigation bar */}
      <header className="relative z-10 mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-2 px-4 pt-5 sm:px-8 sm:pt-7">
        {backLabel ? (
          <Link
            to={backTo}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-[10px] px-3.5 text-[14px] font-medium transition-colors"
            style={{
              backgroundColor: 'var(--v3-surface)',
              border: '1px solid var(--v3-edge)',
              color: 'var(--v3-ink)',
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{backLabel}</span>
          </Link>
        ) : (
          <div aria-hidden="true" />
        )}

        <div className="flex items-center gap-2">
          {headerActions}
          {onToggleLanguage && (
            <button
              type="button"
              onClick={onToggleLanguage}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-[10px] px-3.5 text-[13px] font-medium cursor-pointer"
              style={{
                backgroundColor: 'var(--v3-surface)',
                border: '1px solid var(--v3-edge)',
                color: 'var(--v3-ink)',
              }}
              aria-label="Switch language"
            >
              <Globe className="h-4 w-4" />
              <span>{language === 'en' ? 'EN / اردو' : 'اردو / EN'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onToggleTheme}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[10px] px-3 cursor-pointer"
            style={{
              backgroundColor: 'var(--v3-surface)',
              border: '1px solid var(--v3-edge)',
              color: 'var(--v3-ink)',
            }}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            data-testid="v3-theme-toggle"
          >
            {theme === 'dark' ? (
              <Sun className="h-[18px] w-[18px]" />
            ) : (
              <Moon className="h-[18px] w-[18px]" />
            )}
          </button>
        </div>
      </header>

      {/* Main Split Anchor + Glass Surface */}
      <main className="relative z-10 mx-auto flex w-full max-w-[1200px] flex-1 flex-col justify-center gap-8 px-4 py-8 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
        <div className="max-w-[520px] space-y-3">
          <div className="text-[15px] font-medium" style={{ color: 'var(--v3-muted)' }}>
            Awaaz-e-Awam
          </div>
          {titleAsHeading ? (
            <h1 className="v3-auth-title" style={{ textWrap: 'balance' }}>{portalTitle}</h1>
          ) : (
            <div className="v3-auth-title" style={{ textWrap: 'balance' }}>{portalTitle}</div>
          )}
          <div className="pt-1 text-[14px] font-medium" style={{ color: 'var(--v3-accent)' }}>
            {eyebrow}
          </div>
          {subtitle && (
            <p className="max-w-[420px] text-[15px] leading-relaxed" style={{ color: 'var(--v3-muted)' }}>
              {subtitle}
            </p>
          )}
        </div>

        <div className="v3-auth-glass-card mx-auto w-full p-6 sm:p-8 lg:mx-0">
          {children}
        </div>
      </main>

      <footer
        className="relative z-10 mx-auto w-full max-w-[1200px] px-4 pb-6 text-[12px] sm:px-8"
        style={{ color: 'var(--v3-muted)' }}
      >
        Awaaz-e-Awam · Municipal Operations Platform · Government of Sindh
      </footer>
    </div>
  );
};
