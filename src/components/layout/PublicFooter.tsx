import React from 'react';
import { Container } from './Container';
import { CivicEmblem } from '../common/CivicEmblem';
import { useLanguage } from '../../context/LanguageContext';
import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';

export const PublicFooter: React.FC = () => {
  const { t } = useLanguage();

  return (
    <footer className="w-full bg-white/40 backdrop-blur-md text-[#667679] border-t border-[#DFE7E4]/80 mt-auto overflow-hidden">
      <Container size="xl" className="py-8 sm:py-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-start">
          {/* Brand & Capstone Identification */}
          <div className="space-y-2 max-w-md">
            <div className="flex items-center gap-2.5">
              <CivicEmblem size="sm" />
              <div>
                <span className="text-sm font-semibold text-[#172D31] tracking-tight block">
                  Awaaz-e-Awam
                </span>
                <span className="text-[11px] text-[#126B63] font-medium block">
                  {t('academicAffiliation')}
                </span>
              </div>
            </div>
            <p className="text-xs text-[#667679] leading-relaxed">
              AI-assisted civic grievance platform for submitting and routing complaints in Roman Urdu. Capstone software engineering project (Dec 2026).
            </p>
          </div>

          {/* Minimal Essential Navigation Links */}
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs sm:text-sm font-medium">
            <Link to="/" className="text-[#667679] hover:text-[#172D31] transition-colors">
              {t('navHome')}
            </Link>
            <Link to="/submit" className="text-[#667679] hover:text-[#172D31] transition-colors">
              {t('navWriteComplaint') || 'Write Complaint'}
            </Link>
            <Link to="/dashboard" className="text-[#667679] hover:text-[#172D31] transition-colors">
              {t('navMyComplaints') || 'My Complaints'}
            </Link>
            <Link to="/login" className="text-[#667679] hover:text-[#172D31] transition-colors">
              {t('navAccount') || 'Sign In'}
            </Link>
          </nav>
        </div>

        {/* Academic Prototype Notice */}
        <div className="mt-6 pt-5 border-t border-[#DFE7E4]/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-[11px] text-[#667679]">
          <div className="flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5 text-[#126B63] shrink-0" />
            <span>Academic Prototype • Greenwich University Department of Computer Science</span>
          </div>
          <span className="font-mono text-[10px] text-[#667679]/80">
            Phase 1 • Zero commercial data harvesting
          </span>
        </div>
      </Container>
    </footer>
  );
};
