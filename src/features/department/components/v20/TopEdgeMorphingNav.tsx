import React, { useEffect, useRef, useState } from 'react';
import { Menu, X, Bell, Moon, Sun, LogOut } from 'lucide-react';
import { trustedTimeService } from '../../../../services/trustedTimeService';

export interface V20NavOption { id: string; label: string; badge?: number }
export interface TopEdgeMorphingNavProps {
  departmentCode: string;
  departmentName: string;
  role: 'head' | 'officer';
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  themeMode: 'dark' | 'light';
  onToggleTheme: () => void;
  onSignOut: () => void;
  tabs?: V20NavOption[];
  unreadNotifications?: number;
  onOpenNotifications?: () => void;
}

export const TopEdgeMorphingNav: React.FC<TopEdgeMorphingNavProps> = ({
  departmentCode, departmentName, role, activeTab, onSelectTab, themeMode,
  onToggleTheme, onSignOut, tabs, unreadNotifications = 0, onOpenNotifications,
}) => {
  const [open, setOpen] = useState(false);
  const [clock, setClock] = useState(() => trustedTimeService.formatPkt());
  const [synced, setSynced] = useState(() => trustedTimeService.isSynced());
  const nav = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelClose = () => { if (timer.current !== null) clearTimeout(timer.current); timer.current = null; };
  useEffect(() => {
    const tick = () => { setClock(trustedTimeService.formatPkt()); setSynced(trustedTimeService.isSynced()); };
    const interval = window.setInterval(tick, 1000);
    return () => { window.clearInterval(interval); if (timer.current !== null) clearTimeout(timer.current); };
  }, []);
  useEffect(() => {
    const closeOutside = (e: PointerEvent) => {
      if (!nav.current?.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) { setOpen(false); trigger.current?.focus(); }
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  const destinations = tabs ?? [
    { id: 'home', label: 'Home' }, { id: 'dashboard', label: 'Dashboard' },
    { id: 'complaints', label: 'Complaints' },
    ...(role === 'head'
      ? [{ id: 'verification', label: 'Verification' }, { id: 'officers', label: 'Officers' }]
      : [{ id: 'work', label: 'Work' }, { id: 'performance', label: 'Performance' }, { id: 'notifications', label: 'Notifications' }]),
    { id: 'profile', label: 'Profile' },
  ];
  const choose = (id: string) => { onSelectTab(id); setOpen(false); trigger.current?.focus(); };
  return (
    <header className="v20-top-edge-nav-container">
      <div className="v20-top-edge-bar" aria-hidden="true" />
      <div className="v20-brand-label" title={departmentName}>AWAAZ-E-AWAM <span>/ {departmentCode.toUpperCase()}</span></div>
      <div className="v20-header-right-strip">
        <div className="v20-clock-block" title={synced ? 'Origin server time' : 'Time not yet synchronized'}>
          <span className="v20-header-date" data-testid="v20-header-date">{clock.dateStr}</span>
          <span className="v20-header-clock" data-testid="v20-trusted-clock">
            <span data-testid="v19-trusted-clock" aria-label={clock.timeStr + ' PKT'}>
              {clock.timeStr.split('').map((digit, index) => <span className="v20-clock-slot" key={index}><span key={digit}>{digit}</span></span>)} <small>PKT</small>
            </span>
          </span>
          {!synced && <span className="v20-clock-unsynced">Not synchronized</span>}
        </div>
        <button type="button" className="v20-icon-btn" onClick={onToggleTheme} aria-label="Switch theme" data-testid="v20-theme-toggle">{themeMode === 'dark' ? <Sun size={17}/> : <Moon size={17}/>}</button>
        <button type="button" className="v20-icon-btn" onClick={onSignOut} aria-label="Sign out" data-testid="v20-signout-btn"><LogOut size={17}/></button>
      </div>
      <div className="v20-morphing-notch-wrapper" ref={nav}
        onPointerEnter={(e) => { if (e.pointerType === 'mouse') { cancelClose(); setOpen(true); } }}
        onPointerLeave={(e) => { if (e.pointerType === 'mouse') { cancelClose(); timer.current = setTimeout(() => { if (!nav.current?.contains(document.activeElement)) setOpen(false); }, 240); } }}>
        <nav className={`v20-notch-shell ${open ? 'v20-notch-expanded' : 'v20-notch-collapsed'}`} aria-label="Department Morphing Navigation">
          <button ref={trigger} type="button" className="v20-notch-trigger-content" aria-expanded={open} aria-controls="v20-nav-destinations" aria-label={open ? 'Close navigation' : 'Open navigation'} onClick={() => { cancelClose(); setOpen(v => !v); }}>
            {open ? <X size={19}/> : <Menu size={21}/>}
          </button>
          <div id="v20-nav-destinations" className={`v20-nav-destinations-row ${open ? 'is-visible' : 'is-collapsed'}`} aria-hidden={!open}>
            {destinations.map(tab => <button type="button" key={tab.id} data-tab-id={tab.id} tabIndex={open ? 0 : -1} aria-current={activeTab === tab.id ? 'page' : undefined} className={`v20-nav-link-btn ${activeTab === tab.id ? 'is-active' : ''}`} onClick={() => choose(tab.id)}>{tab.label}{Boolean(tab.badge) && <small>{tab.badge}</small>}</button>)}
            {role === 'head' && <button type="button" className="v20-nav-link-btn" tabIndex={open ? 0 : -1} aria-label="Notifications" onClick={() => { if (onOpenNotifications) onOpenNotifications(); else onSelectTab('notifications'); setOpen(false); }}><Bell size={17}/>{unreadNotifications > 0 && <small>{unreadNotifications}</small>}</button>}
          </div>
        </nav>
      </div>
    </header>
  );
};
