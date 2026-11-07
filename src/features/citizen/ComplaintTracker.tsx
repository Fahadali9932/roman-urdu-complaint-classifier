import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container } from '../../components/layout/Container';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { ComplaintStatusBadge } from '../../components/citizen/ComplaintStatusBadge';
import { ComplaintTimeline } from '../../components/citizen/ComplaintTimeline';
import { AlertBanner } from '../../components/common/AlertBanner';
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
    <div className="py-8 sm:py-12 space-y-8">
      <Container size="md">
        {/* Tracker Search Header */}
        <div className="text-start space-y-2 mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold">
            <Search className="w-3.5 h-3.5" />
            <span>Civic Tracking Prototype</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {t('trackTitle')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {t('trackSubtitle')}
          </p>
        </div>

        {/* Search Bar Box */}
        <Card className="p-5 sm:p-6 mb-6">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                id="searchRef"
                placeholder={t('trackInputPlaceholder')}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
                className="font-mono"
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isLoading}
              className="sm:w-auto"
            >
              {t('trackButton')}
            </Button>
          </form>

          {/* Quick Sample Selector */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs text-start">
            <span className="text-slate-500 font-medium">
              {t('trackTrySample')}
            </span>
            {SAMPLE_REFERENCES.map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => handleQuickSelect(sample)}
                className={`ref-code text-xs px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                  activeComplaint?.referenceNumber === sample
                    ? 'bg-teal-700 text-white border-teal-800 font-bold shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {sample}
              </button>
            ))}
          </div>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <div className="p-12 text-center text-slate-400 animate-pulse">
            <Clock className="w-8 h-8 mx-auto mb-2 text-teal-600 animate-spin" />
            <p className="text-sm">Fetching complaint status from mock service...</p>
          </div>
        )}

        {/* Empty / Not Found State */}
        {!isLoading && !activeComplaint && (
          <Card className="p-8 text-center border-dashed">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto mb-3">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {t('trackNotFound')}: <span className="font-mono">{searchInput}</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mb-4">
              {t('trackNotFoundHelp')}
            </p>
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect('KHI-2026-7842')}
              >
                Try Sample KHI-2026-7842
              </Button>
            </div>
          </Card>
        )}

        {/* Complaint Detail View */}
        {!isLoading && activeComplaint && (
          <div className="space-y-6 text-start">
            {/* Header Status Card */}
            <Card className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="ref-code text-xs sm:text-sm font-bold text-teal-900 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200">
                      {activeComplaint.referenceNumber}
                    </span>
                    {activeComplaint.isDemonstration && (
                      <span className="text-[10px] uppercase font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Demonstration Record
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-2">
                    {activeComplaint.title}
                  </h2>
                </div>

                <div className="flex flex-col items-start sm:items-end gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {t('trackCurrentStatus')}
                  </span>
                  <ComplaintStatusBadge status={activeComplaint.status} size="md" />
                </div>
              </div>

              {/* Citizen Privacy Banner */}
              <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-lg text-xs text-slate-600">
                <Shield className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span>{t('trackPrivacyProtected')}</span>
              </div>

              {/* Key Metadata Grid */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-teal-600" />
                    {t('trackAssignedTo')}
                  </span>
                  <span className="font-bold text-slate-800 text-xs sm:text-sm">
                    {activeComplaint.assignedDepartmentName || 'Awaiting Routing'}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    {t('trackDistrict')}
                  </span>
                  <span className="font-bold text-slate-800 text-xs sm:text-sm">
                    {activeComplaint.district}
                  </span>
                  <span className="block text-slate-500 text-[11px]">
                    {activeComplaint.locality}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-purple-600" />
                    {t('trackSubmittedDate')}
                  </span>
                  <span className="font-bold text-slate-800 text-xs sm:text-sm">
                    {formatDateOnly(activeComplaint.submittedAt, language)}
                  </span>
                </div>
              </div>

              {/* Original Grievance Text */}
              <div className="mt-6 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    {t('trackOriginalComplaint')}
                  </span>
                  <span className="text-[11px] text-teal-800 font-semibold bg-teal-50 px-2 py-0.5 rounded">
                    Detected: Roman Urdu
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs sm:text-sm text-slate-800 leading-relaxed font-sans roman-urdu-text">
                  "{activeComplaint.description}"
                </div>
              </div>
            </Card>

            {/* Visual Progress Timeline */}
            <Card className="p-6">
              <h3 className="text-base font-bold text-slate-900 mb-6 flex items-center justify-between">
                <span>{t('trackTimelineTitle')}</span>
                <span className="text-xs font-normal text-slate-400">
                  {activeComplaint.timeline.length} Recorded Milestone(s)
                </span>
              </h3>

              <ComplaintTimeline events={activeComplaint.timeline} />
            </Card>

            {/* Demonstration Disclaimer Banner */}
            <AlertBanner type="warning" title="Demonstration Mode">
              {t('trackDemoDisclaimer')} Real-time backend sync and department officer updates will be wired during Phase 2 & Phase 4.
            </AlertBanner>
          </div>
        )}
      </Container>
    </div>
  );
};
