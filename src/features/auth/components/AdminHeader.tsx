import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../../context/LanguageContext';
import { useAdminAuth } from '../../../context/AdminAuthContext';
import { Shield, LogOut, Globe, LayoutGrid, FileText, UserCheck, Users } from 'lucide-react';

interface AdminHeaderProps {
  activeTab: 'overview' | 'complaints' | 'requests' | 'access';
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ activeTab }) => {
  const { language, setLanguage } = useLanguage();
  const { adminSession, signOut } = useAdminAuth();
  const navigate = useNavigate();

  const handleSignOut = () => {
    signOut();
    navigate('/admin/login');
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ur' : 'en');
  };

  return (
    <header className="bg-white border-b border-[#E2E8F0] sticky top-0 z-30 shadow-xs">
      {/* Top Bar: Identity & Controls */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Monogram */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0F1E21] text-white flex items-center justify-center font-mono font-bold text-base shadow-sm">
              a.
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold tracking-wider text-[#0F1E21] uppercase">
                  AWAAZ-E-AWAM
                </span>
                <span className="text-xs text-[#94A3B8]">/</span>
                <span className="text-xs font-semibold text-[#122E32] flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-[#122E32]" />
                  {language === 'ur' ? 'مین ایڈمنسٹریٹر' : 'MAIN ADMINISTRATOR'}
                </span>
              </div>
              <p className="text-[11px] text-[#64748B]">
                {adminSession?.fullName || (language === 'ur' ? 'سپر ایڈمنسٹریٹر' : 'Provincial Civic Oversight')}
              </p>
            </div>
          </div>

          {/* Controls: Language toggle & Sign out */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={toggleLanguage}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] text-xs font-semibold text-[#0F1E21] transition-colors cursor-pointer"
              title={language === 'en' ? 'Switch to Urdu' : 'انگریزی میں تبدیل کریں'}
            >
              <Globe className="w-3.5 h-3.5 text-[#64748B]" />
              <span>{language === 'en' ? 'اردو' : 'English'}</span>
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 hover:bg-rose-100 text-xs font-semibold text-rose-700 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {language === 'ur' ? 'لاگ آؤٹ' : 'Sign out'}
              </span>
            </button>
          </div>
        </div>

        {/* Primary Navigation Rail (Figma 35:1065 / 35:1129) */}
        <nav
          className="flex items-center gap-6 sm:gap-8 -mb-px overflow-x-auto no-scrollbar"
          aria-label="Admin Navigation"
        >
          <NavLink
            to="/admin/requests"
            className={`py-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'requests'
                ? 'border-[#0F1E21] text-[#0F1E21]'
                : 'border-transparent text-[#64748B] hover:text-[#0F1E21]'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>
              {language === 'ur' ? 'محکمہ درخواستیں' : 'Department Requests'}
            </span>
          </NavLink>

          <NavLink
            to="/admin/access"
            className={`py-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'access'
                ? 'border-[#0F1E21] text-[#0F1E21]'
                : 'border-transparent text-[#64748B] hover:text-[#0F1E21]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>
              {language === 'ur' ? 'محکمے اور رسائی' : 'Departments & Access'}
            </span>
          </NavLink>

          <NavLink
            to="/admin/overview"
            className={`py-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-[#0F1E21] text-[#0F1E21]'
                : 'border-transparent text-[#64748B] hover:text-[#0F1E21]'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>{language === 'ur' ? 'مجموعی جائزہ' : 'Overview'}</span>
          </NavLink>

          <NavLink
            to="/submit"
            className="py-3 text-xs sm:text-sm font-semibold border-b-2 border-transparent text-[#64748B] hover:text-[#0F1E21] flex items-center gap-2 transition-colors whitespace-nowrap"
          >
            <FileText className="w-4 h-4" />
            <span>{language === 'ur' ? 'شہری پورٹل' : 'Citizen Portal'}</span>
          </NavLink>
        </nav>
      </div>
    </header>
  );
};
