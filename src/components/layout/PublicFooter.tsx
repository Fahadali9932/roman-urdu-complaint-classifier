import React from 'react';
import { Container } from './Container';
import { CivicEmblem } from '../common/CivicEmblem';
import { useLanguage } from '../../context/LanguageContext';
import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';

export const PublicFooter: React.FC = () => {
  const { t } = useLanguage();

  return (
    <footer className="w-full bg-[#F7F8F7] text-[#667578] border-t border-[#E5E9E7] mt-auto">
      <Container size="xl" className="py-10 sm:py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-start">
          {/* Brand & Academic Context */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <CivicEmblem size="sm" />
              <div>
                <h3 className="text-sm font-semibold text-[#1C3033] tracking-tight">
                  Awaaz-e-Awam
                </h3>
                <p className="text-[11px] text-[#087F76] font-medium">
                  {t('academicAffiliation')}
                </p>
              </div>
            </div>
            <p className="text-xs text-[#667578] leading-relaxed max-w-sm">
              An AI-assisted civic grievance platform for submitting and routing public complaints in Roman Urdu. Developed as a university capstone project.
            </p>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#E5E9E7]/60 text-[#193D3D] text-[11px] border border-[#E5E9E7]">
              <GraduationCap className="w-3.5 h-3.5 text-[#087F76]" />
              <span>Greenwich University Software Engineering Project (Dec 2026)</span>
            </div>
          </div>

          {/* Quick Navigation */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#1C3033]">
              {t('footerLinks')}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/" className="text-[#667578] hover:text-[#1C3033] transition-colors">
                  {t('navHome')}
                </Link>
              </li>
              <li>
                <Link to="/submit" className="text-[#667578] hover:text-[#1C3033] transition-colors">
                  {t('navWriteComplaint') || t('navSubmit')}
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-[#667578] hover:text-[#1C3033] transition-colors">
                  {t('navMyComplaints') || t('navDashboard')}
                </Link>
              </li>
              <li>
                <Link to="/track" className="text-[#667578] hover:text-[#1C3033] transition-colors">
                  {t('navTrack')}
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-[#667578] hover:text-[#1C3033] transition-colors">
                  {t('navAccount') || t('navSignIn')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Civic Services Covered */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#1C3033]">
              Karachi Public Utilities
            </h4>
            <ul className="space-y-1.5 text-xs text-[#667578]">
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#087F76]"></span>
                <span>KW&SC (Water & Sewerage)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#087F76]"></span>
                <span>SSWMB (Solid Waste Board)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#087F76]"></span>
                <span>K-Electric (Power & Infrastructure)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#087F76]"></span>
                <span>KMC (Roads & Drainage)</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Disclaimer */}
        <div className="mt-8 pt-6 border-t border-[#E5E9E7] flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#667578]">
          <p>
            Prototype Demonstration • Not affiliated with the official Government of Sindh or utility authorities.
          </p>
          <p>
            Free and Open Source (FOSS) • No commercial data collection.
          </p>
        </div>
      </Container>
    </footer>
  );
};
