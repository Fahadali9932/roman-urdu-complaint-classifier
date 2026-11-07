import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container } from '../../components/layout/Container';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { ComplaintStatusBadge } from '../../components/citizen/ComplaintStatusBadge';
import { ComplaintTimeline } from '../../components/citizen/ComplaintTimeline';
import { useLanguage } from '../../context/LanguageContext';
import { complaintService } from '../../services';
import { type Complaint } from '../../types';
import { formatDateOnly } from '../../utils/dateFormatter';
import {
  Search,
  MapPin,
  Calendar,
  Building2,
  FileText,
  Clock,
  Shield,
  Lock,
} from 'lucide-react';

const SAMPLE_REFERENCES = [
  'KHI-2026-7842',
  'KHI-2026-3914',
  'KHI-2026-5120',
  'KHI-2026-8801',
];

export const ComplaintTracker: React.FC = () => {
  const { referenceNumber: paramRef } = useParams<{ referenceNumber?: string }>();
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  const [searchInput, setSearchInput] = useState(paramRef || '');
  const [activeComplaint, setActiveComplaint] = useState<Complaint | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const targetRef = (paramRef || 'KHI-2026-7842').trim();
    complaintService.getComplaintByReference(targetRef).then((res) => {
      if (isMounted) {
        setActiveComplaint(res);
        setIsLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [paramRef]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      navigate(`/track/${searchInput.trim()}`);
    }
  };

  const handleQuickSelect = (sampleRef: string) => {
    setSearchInput(sampleRef);
    navigate(`/track/${sampleRef}`);
  };

  return (
    <div className="py-8 sm:py-12 space-y-6">
      <Container size="md">
        {/* Tracker Search Header */}
        <div className="text-center space-y-1.5 mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#1C3033] tracking-tight">
            {t('trackTitle')}
          </h1>
          <p className="text-xs sm:text-sm text-[#667578] max-w-md mx-auto">
            {t('trackSubtitle')}
          </p>
        </div>

        {/* Search Bar Paper Sheet */}
        <div className="paper-sheet rounded-xl p-5 sm:p-6 mb-6 text-start">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2.5">
            <div className="flex-1">
              <Input
                id="searchRef"
                placeholder={t('trackInputPlaceholder')}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-[#667578]" />}
                className="font-mono text-xs bg-white border-[#E5E9E7] focus:border-[#087F76]"
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isLoading}
              className="sm:w-auto bg-[#193D3D] hover:bg-[#1C3033] text-white"
            >
              {t('trackButton')}
            </Button>
          </form>

          {/* Quick Sample Selector */}
          <div className="mt-3.5 pt-3 border-t border-[#E5E9E7] flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[#667578] font-medium text-[11px]">
              {t('trackTrySample')}
            </span>
            {SAMPLE_REFERENCES.map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => handleQuickSelect(sample)}
                className={`ref-code text-xs px-2.5 py-1 rounded border transition-colors cursor-pointer ${
                  activeComplaint?.referenceNumber === sample
                    ? 'bg-[#193D3D] text-white border-[#193D3D] font-bold'
                    : 'bg-[#F7F8F7] hover:bg-[#E5E9E7] text-[#1C3033] border-[#E5E9E7]'
                }`}
              >
                {sample}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="p-10 text-center text-[#667578]">
            <Clock className="w-6 h-6 mx-auto mb-2 text-[#087F76] animate-spin" />
            <p className="text-xs">Fetching complaint progress...</p>
          </div>
        )}

        {/* Not Found State */}
        {!isLoading && !activeComplaint && (
          <div className="paper-sheet rounded-xl p-8 text-center space-y-3">
            <Shield className="w-8 h-8 text-[#667578] mx-auto opacity-50" />
            <h3 className="text-base font-semibold text-[#1C3033]">
              {t('trackNotFound')}: <span className="ref-code">{searchInput}</span>
            </h3>
            <p className="text-xs text-[#667578] max-w-sm mx-auto">
              {t('trackNotFoundHelp')}
            </p>
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect('KHI-2026-7842')}
                className="text-xs"
              >
                Try Sample KHI-2026-7842
              </Button>
            </div>
          </div>
        )}

        {/* Complaint Detail View */}
        {!isLoading && activeComplaint && (
          <div className="space-y-6 text-start">
            {/* Main Application Summary Sheet */}
            <div className="paper-sheet rounded-xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E5E9E7]">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="ref-code text-xs font-semibold px-2 py-0.5 rounded bg-[#F7F8F7] border border-[#E5E9E7] text-[#1C3033]">
                      {activeComplaint.referenceNumber}
                    </span>
                    <span className="text-[11px] text-[#667578]">
                      Fictional Demonstration Record
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-semibold text-[#1C3033] mt-1">
                    {activeComplaint.title}
                  </h2>
                </div>

                <div className="flex flex-col items-start sm:items-end gap-1">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-[#667578]">
                    {t('trackCurrentStatus')}
                  </span>
                  <ComplaintStatusBadge status={activeComplaint.status} size="sm" />
                </div>
              </div>

              {/* Citizen Privacy Banner */}
              <div className="flex items-center gap-2 px-3 py-2 bg-[#F7F8F7] border border-[#E5E9E7] rounded-lg text-xs text-[#667578]">
                <Lock className="w-3.5 h-3.5 text-[#087F76] shrink-0" />
                <span>{t('trackPrivacyProtected')}</span>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-[#F7F8F7] border border-[#E5E9E7]">
                  <span className="block text-[10px] font-semibold text-[#667578] uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-[#087F76]" />
                    {t('trackAssignedTo')}
                  </span>
                  <span className="font-semibold text-[#1C3033] text-xs">
                    {activeComplaint.assignedDepartmentName || 'Awaiting Routing'}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-[#F7F8F7] border border-[#E5E9E7]">
                  <span className="block text-[10px] font-semibold text-[#667578] uppercase tracking-wider mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#087F76]" />
                    {t('trackDistrict')}
                  </span>
                  <span className="font-semibold text-[#1C3033] text-xs">
                    {activeComplaint.district}
                  </span>
                  <span className="block text-[#667578] text-[11px] mt-0.5">
                    {activeComplaint.locality}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-[#F7F8F7] border border-[#E5E9E7]">
                  <span className="block text-[10px] font-semibold text-[#667578] uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#087F76]" />
                    {t('trackSubmittedDate')}
                  </span>
                  <span className="font-semibold text-[#1C3033] text-xs">
                    {formatDateOnly(activeComplaint.submittedAt, language)}
                  </span>
                </div>
              </div>

              {/* Original Grievance Text */}
              <div className="pt-3 border-t border-[#E5E9E7]">
                <div className="flex items-center justify-between mb-2 text-xs">
                  <span className="font-semibold text-[#667578] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#667578]" />
                    {t('trackOriginalComplaint')}
                  </span>
                  <span className="text-[11px] text-[#087F76] font-medium">
                    Language: Roman Urdu
                  </span>
                </div>
                <div className="p-4 rounded-lg bg-[#F7F8F7] border border-[#E5E9E7] text-xs sm:text-sm text-[#1C3033] leading-relaxed font-sans roman-urdu-text">
                  "{activeComplaint.description}"
                </div>
              </div>
            </div>

            {/* Visual Progress Timeline Sheet */}
            <div className="paper-sheet rounded-xl p-6 sm:p-8 space-y-4">
              <h3 className="text-sm font-semibold text-[#1C3033] pb-3 border-b border-[#E5E9E7] flex items-center justify-between">
                <span>{t('trackTimelineTitle')}</span>
                <span className="text-xs font-normal text-[#667578]">
                  {activeComplaint.timeline.length} Event(s)
                </span>
              </h3>

              <ComplaintTimeline events={activeComplaint.timeline} />
            </div>

            {/* Subtle Demonstration Disclaimer */}
            <div className="pt-2 flex items-center gap-2 text-[11px] text-[#667578]">
              <Shield className="w-3.5 h-3.5 text-[#087F76] shrink-0" />
              <span>
                Demonstration tracking record: Simulating municipal progress across Karachi public utilities.
              </span>
            </div>
          </div>
        )}
      </Container>
    </div>
  );
};
