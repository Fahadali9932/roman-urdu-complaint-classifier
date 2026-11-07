import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import {
  LayoutDashboard,
  PlusCircle,
  Search,
  LogOut,
  Info,
  X,
} from 'lucide-react';

interface CitizenSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CitizenSidebar: React.FC<CitizenSidebarProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSignOut = () => {
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', label: t('navDashboard'), icon: <LayoutDashboard className="w-4 h-4" /> },
    { to: '/submit', label: t('navSubmit'), icon: <PlusCircle className="w-4 h-4" /> },
    { to: '/track', label: t('navTrack'), icon: <Search className="w-4 h-4" /> },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 start-0 z-50 w-64 bg-white border-e border-slate-200/80 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto flex flex-col justify-between ${
          isOpen ? 'translate-x-0' : 'ltr:-translate-x-full rtl:translate-x-full'
        }`}
      >
        <div className="p-4 space-y-6">
          {/* Mobile close button */}
          <div className="flex items-center justify-between lg:hidden pb-3 border-b border-slate-100">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Navigation Menu
            </span>
            <button
              onClick={onClose}
              className="p-1 min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 cursor-pointer"
              aria-label="Close navigation menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation group */}
          <div className="space-y-1">
            <span className="block px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 text-start">
              Citizen Portal
            </span>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 min-h-[44px] rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-teal-50 text-teal-900 border border-teal-200/60 shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>

          {/* Demonstration Notice Box */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-start space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-900">
              <Info className="w-3.5 h-3.5 text-teal-700" />
              <span>Phase 1 Scope</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Citizen records are simulated. Database & Supabase Auth will be activated in Phase 2.
            </p>
          </div>
        </div>

        {/* Bottom sign out button */}
        <div className="p-4 border-t border-slate-100">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 min-h-[44px] rounded-lg text-xs sm:text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>{t('navSignOut')}</span>
          </button>
        </div>
      </aside>
    </>
  );
};
