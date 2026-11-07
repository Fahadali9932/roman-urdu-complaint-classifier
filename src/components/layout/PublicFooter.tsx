import React from 'react';
import { Container } from './Container';
import { CivicEmblem } from '../common/CivicEmblem';
import { useLanguage } from '../../context/LanguageContext';
import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';

export const PublicFooter: React.FC = () => {
  const { t } = useLanguage();

  return (
    <footer className="w-full bg-[#F3F6F5] text-[#667679] border-t border-[#DFE7E4] mt-auto overflow-hidden">
      <Container size="xl" className="py-10 sm:py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-start">
          {/* Brand & Academic Context */}
          <div className="md:col-span-2 space-y-3 min-w-0">
            <div className="flex items-center gap-2.5">
              <CivicEmblem size="sm" />
              <div>
                <h3 className="text-sm font-semibold text-[#172D31] tracking-tight">
                  Awaaz-e-Awam
                </h3>
                <p className="text-[11px] text-[#126B63] font-medium">
                  {t('academicAffiliation')}
                </p>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-[#667679] leading-relaxed max-w-sm">
              An AI-assisted civic grievance platform for submitting and routing public complaints in Roman Urdu. Developed as a university capstone project.
            </p>
            <div className="inline-flex flex-wrap items-center gap-1.5 px-2.5 py-1 rounded bg-[#E7F2EF] text-[#17423F] text-[11px] border border-[#DFE7E4] max-w-full">
              <GraduationCap className="w-3.5 h-3.5 text-[#126B63] shrink-0" />
              <span>Greenwich University Software Engineering Capstone (Dec 2026)</span>
            </div>
          </div>

          {/* Quick Navigation */}
          <div className="space-y-2.5 min-w-0">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#172D31]">
              {t('footerLinks')}
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <Link to="/" className="text-[#667679] hover:text-[#172D31] transition-colors">
                  {t('navHome')}
                </Link>
              </li>
              <li>
                <Link to="/submit" className="text-[#667679] hover:text-[#172D31] transition-colors">
                  {t('navWriteComplaint') || t('navSubmit')}
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-[#667679] hover:text-[#172D31] transition-colors">
                  {t('navMyComplaints') || t('navDashboard')}
                </Link>
              </li>
              <li>
                <Link to="/track" className="text-[#667679] hover:text-[#172D31] transition-colors">
                  {t('navTrack')}
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-[#667679] hover:text-[#172D31] transition-colors">
                  {t('navAccount') || t('navSignIn')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Civic Services Covered */}
          <div className="space-y-2.5 min-w-0">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#172D31]">
              Karachi Public Utilities
            </h4>
            <ul className="space-y-1.5 text-xs sm:text-sm text-[#667679]">
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#126B63] shrink-0"></span>
                <span>KW&SC (Water & Sewerage)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#126B63] shrink-0"></span>
                <span>SSWMB (Solid Waste Board)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#126B63] shrink-0"></span>
                <span>K-Electric (Power & Infrastructure)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#126B63] shrink-0"></span>
                <span>KMC (Roads & Drainage)</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Disclaimer */}
        <div className="mt-8 pt-6 border-t border-[#DFE7E4] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] text-[#667679]">
          <p className="max-w-xl">
            Prototype Demonstration • Not affiliated with the official Government of Sindh or utility authorities.
          </p>
          <p className="font-mono text-[10px] shrink-0">
            Academic Project Phase 1B • Dec 2026
          </p>
        </div>
      </Container>
    </footer>
  );
};
