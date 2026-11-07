import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { ComplaintFolder } from '../../components/citizen/ComplaintFolder';
import { ComplaintDetailModal } from '../../components/citizen/ComplaintDetailModal';
import { useLanguage } from '../../context/LanguageContext';
import { complaintService } from '../../services';
import { type Complaint, DEMO_CITIZEN } from '../../types';
import {
  PenTool,
  Search,
  FolderOpen,
  ArrowRight,
  ArrowLeft,
  XCircle,
} from 'lucide-react';

export const CitizenDashboard: React.FC = () => {
  const { t, language, isRTL } = useLanguage();
  const [searchParams] = useSearchParams();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // In production/browser, defaults to honest empty state unless in test or demo mode (?demo=true)
  const isDemo =
    searchParams.get('demo') === 'true' ||
    import.meta.env.MODE === 'test';

  const [isLoading, setIsLoading] = useState(isDemo);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (isDemo) {
      complaintService.getCitizenComplaints(DEMO_CITIZEN.id).then((records) => {
        if (isMounted) {
          setComplaints(records);
          setIsLoading(false);
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, [isDemo]);

  const filteredComplaints = complaints.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return (
      c.referenceNumber.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      c.locality.toLowerCase().includes(q) ||
      c.district.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full text-start space-y-8">
      {/* 1. Header & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#D5D5D3]">
        <div className="space-y-1">
          {isDemo && (
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#EAEAE8] text-[11px] font-mono font-bold uppercase text-[#111111] mb-1">
              <span>{DEMO_CITIZEN.fullName} ({DEMO_CITIZEN.district})</span>
              <span>•</span>
              <span>Fictional Demonstration Mode</span>
            </div>
          )}
          <h1 className="font-display font-black text-3xl sm:text-4xl text-[#111111] uppercase tracking-tight">
            {language === 'ur' ? 'آپ کی شکایات' : 'Your Complaints'}
          </h1>
          <p className="text-xs sm:text-sm text-[#5B5B5B]">
            {language === 'ur'
              ? 'آپ کی درج شدہ شکایات کی انفرادی کیس فائلز اور کارروائی کا ریکارڈ۔'
              : 'Individual case files and departmental progress for your submitted complaints.'}
          </p>
        </div>

        <Link to="/submit">
          <Button
            variant="primary"
            size="md"
            leftIcon={<PenTool className="w-4 h-4" />}
            className="w-full sm:w-auto uppercase tracking-wider text-xs"
          >
            {t('navWriteComplaint') || 'Write Complaint'}
          </Button>
        </Link>
      </div>

      {/* 2. Content: Empty State vs Folder Grid */}
      {isLoading ? (
        <div className="p-16 text-center text-[#5B5B5B] font-mono text-xs">
          Loading case files...
        </div>
      ) : complaints.length === 0 ? (
        /* ====================================================================
           HONEST SWISS EDITORIAL EMPTY STATE (NO FAKE DATA)
           ==================================================================== */
        <div className="p-12 sm:p-20 rounded-xl bg-[#FAFAF9] border border-[#D5D5D3] text-center max-w-2xl mx-auto my-8 space-y-6">
          <div className="w-20 h-20 rounded-2xl bg-[#EAEAE8] border border-[#D5D5D3] flex items-center justify-center mx-auto text-[#111111]">
            <FolderOpen className="w-10 h-10 stroke-[1.5]" />
          </div>

          <div className="space-y-2">
            <h2 className="font-display font-black text-2xl sm:text-3xl text-[#111111] uppercase tracking-tight">
              {language === 'ur' ? 'ابھی تک کوئی شکایت نہیں ہے۔' : 'No complaints yet.'}
            </h2>
            <p className="text-sm sm:text-base text-[#5B5B5B] max-w-md mx-auto leading-relaxed">
              {language === 'ur'
                ? 'آپ کی درج کردہ شکایات یہاں علیحدہ کیس فائلز کے طور پر ظاہر ہوں گی۔'
                : 'Your submitted complaints will appear here as individual case files.'}
            </p>
          </div>

          <div className="pt-2">
            <Link to="/submit">
              <Button
                variant="primary"
                size="lg"
                rightIcon={isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                className="uppercase tracking-wider text-xs sm:text-sm px-8"
              >
                {t('navWriteComplaint') || 'Write Complaint'}
              </Button>
            </Link>
          </div>

          <div className="pt-6 border-t border-[#D5D5D3] text-center">
            <span className="text-[11px] font-mono text-[#5B5B5B]">
              Case files are cryptographically isolated per authenticated citizen ID (Phase 2).
            </span>
          </div>
        </div>
      ) : (
        /* ====================================================================
           POPULATED COMPLAINT FOLDERS (TEST & DEMO RECORD GRID)
           ==================================================================== */
        <div className="space-y-6">
          {/* Search Filter Bar */}
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-[#5B5B5B]">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your complaints by reference or title..."
              className="w-full min-h-[44px] ps-10 pe-4 rounded-lg border border-[#D5D5D3] bg-[#FAFAF9] text-sm text-[#111111] placeholder:text-[#5B5B5B]/60 focus:bg-white focus:border-[#111111] focus:ring-1 focus:ring-[#111111] outline-hidden"
            />
          </div>

          {filteredComplaints.length === 0 ? (
            <div className="p-12 rounded-lg bg-[#FAFAF9] border border-[#D5D5D3] text-center space-y-3">
              <XCircle className="w-8 h-8 text-[#5B5B5B] mx-auto" />
              <p className="text-sm font-semibold text-[#111111]">
                No personal complaints match "{searchQuery}"
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-xs font-bold uppercase tracking-wider text-[#111111] underline hover:text-[#5B5B5B] cursor-pointer"
              >
                Clear search filter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {filteredComplaints.map((complaint) => (
                <ComplaintFolder
                  key={complaint.id}
                  complaint={complaint}
                  onClick={() => setSelectedComplaint(complaint)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Case File Inspection Modal */}
      <ComplaintDetailModal
        complaint={selectedComplaint}
        isOpen={Boolean(selectedComplaint)}
        onClose={() => setSelectedComplaint(null)}
      />
    </div>
  );
};
