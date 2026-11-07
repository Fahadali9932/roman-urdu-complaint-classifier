import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { LanguageToggle } from '../common/LanguageToggle';
import { CivicEmblem } from '../common/CivicEmblem';
import { Bell, User, Menu } from 'lucide-react';
import { Link } from 'react-router-dom';

interface CitizenHeaderProps {
  onToggleSidebar?: () => void;
}

export const CitizenHeader: React.FC<CitizenHeaderProps> = ({ onToggleSidebar }) => {
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 z-30 w-full bg-white border-b border-slate-200/80 shadow-2xs">
      <div className="px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <Link to="/" className="flex items-center gap-2.5">
            <CivicEmblem size="sm" />
            <span className="text-sm font-bold text-slate-900 tracking-tight hidden sm:inline">
              {t('brandSub')}
            </span>
          </Link>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-3">
          <LanguageToggle />

          {/* Demonstration Notification icon */}
          <button
            type="button"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 relative cursor-pointer"
            title="Notifications (Demonstration)"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 end-1.5 w-2 h-2 rounded-full bg-teal-600" />
          </button>

          {/* Citizen profile pill */}
          <div className="flex items-center gap-2 ps-2 border-s border-slate-200 text-start">
            <div className="w-8 h-8 rounded-full bg-slate-900 text-teal-300 flex items-center justify-center font-bold text-xs ring-2 ring-teal-500/20">
              <User className="w-4 h-4" />
            </div>
            <div className="hidden sm:block">
              <span className="block text-xs font-semibold text-slate-900 leading-tight">
                Muhammad Bilal
              </span>
              <span className="block text-[10px] text-slate-400 font-medium">
                District East, Karachi
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
