import React from 'react';
import { Container } from './Container';
import { CivicEmblem } from '../common/CivicEmblem';
import { useLanguage } from '../../context/LanguageContext';
import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';

export const PublicFooter: React.FC = () => {
  const { t } = useLanguage();

  return (
    <footer className="w-full notebook-footer text-slate-400 mt-auto overflow-hidden">
      <Container size="xl" className="py-8 sm:py-10 max-w-[1100px]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-start">
          {/* Brand & Capstone Identification */}
          <div className="space-y-2 max-w-md">
            <div className="flex items-center gap-2.5">
              <CivicEmblem size="sm" />
              <div>
                <span className="text-sm font-semibold text-white tracking-tight block">
                  Awaaz-e-Awam
                </span>
                <span className="text-[11px] text-slate-300 font-medium block">
                  {t('academicAffiliation')}
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              AI-assisted civic grievance platform for submitting and routing complaints in Roman Urdu. Capstone software engineering project (Dec 2026).
            </p>
          </div>

          {/* Minimal Essential Navigation Links */}
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs sm:text-sm font-medium">
            <Link to="/" className="text-slate-400 hover:text-white transition-colors">
              {t('navHome')}
            </Link>
            <Link to="/submit" className="text-slate-400 hover:text-white transition-colors">
              {t('navWriteComplaint') || 'Write Complaint'}
            </Link>
            <Link to="/dashboard" className="text-slate-400 hover:text-white transition-colors">
              {t('navMyComplaints') || 'My Complaints'}
            </Link>
            <Link to="/login" className="text-slate-400 hover:text-white transition-colors">
              {t('navAccount') || 'Sign In'}
            </Link>
          </nav>
        </div>

        {/* Academic Prototype Notice */}
        <div className="mt-8 pt-5 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] text-slate-500 text-start">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Greenwich University Department of Computer Science • Karachi, Pakistan</span>
          </div>
          <span>Academic Prototype Demo • 100% Free Public Service</span>
        </div>
      </Container>
    </footer>
  );
};
