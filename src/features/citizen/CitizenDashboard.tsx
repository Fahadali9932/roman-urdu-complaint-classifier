import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { ComplaintStatusBadge } from '../../components/citizen/ComplaintStatusBadge';
import { useLanguage } from '../../context/LanguageContext';
import { complaintService } from '../../services';
import { type Complaint, DEMO_CITIZEN } from '../../types';
import { formatDateOnly } from '../../utils/dateFormatter';
import {
  PenTool,
  Search,
  XCircle,
  ExternalLink,
  Shield,
  FileText,
} from 'lucide-react';

export const CitizenDashboard: React.FC = () => {
  const { t, language } = useLanguage();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    // Load exclusively the active fictional demonstration citizen's complaints (Ownership Model)
    complaintService.getCitizenComplaints(DEMO_CITIZEN.id).then((citizenRecords) => {
      if (isMounted) {
        setComplaints(citizenRecords);
        setIsLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

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
    <div className="space-y-6 text-start">
      {/* 1. Header & Obvious Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E9E7]">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-medium bg-[#E5E9E7]/60 text-[#193D3D]">
            <span>{DEMO_CITIZEN.fullName} ({DEMO_CITIZEN.district})</span>
            <span className="text-[#667578]">•</span>
            <span className="text-[#667578]">Fictional Demo Account</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#1C3033] tracking-tight">
            {t('dashPersonalTitle') || t('dashTitle')}
          </h1>
          <p className="text-xs sm:text-sm text-[#667578]">
            {t('dashPersonalSubtitle') || t('dashSubtitle')}
          </p>
        </div>

        <Link to="/submit" className="w-full sm:w-auto">
          <Button
            variant="primary"
            size="md"
            leftIcon={<PenTool className="w-4 h-4" />}
            className="w-full sm:w-auto bg-[#193D3D] hover:bg-[#1C3033] text-white shadow-none"
          >
            {t('dashWriteNew') || '+ Write a Complaint'}
          </Button>
        </Link>
      </div>

      {/* 2. Personal Complaints List with Restrained Search */}
      <div className="space-y-4">
        {complaints.length > 0 && (
          <div className="flex items-center justify-between gap-3">
            <div className="w-full sm:w-80">
              <Input
                id="personalSearch"
                placeholder="Search your complaints by reference or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-3.5 h-3.5 text-[#667578]" />}
                className="text-xs bg-white border-[#E5E9E7] focus:border-[#087F76]"
                rightAction={
                  searchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="p-1 text-[#667578] hover:text-[#1C3033] cursor-pointer"
                      aria-label="Clear search"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  ) : null
                }
              />
            </div>
            <span className="text-xs text-[#667578] hidden sm:inline">
              {filteredComplaints.length} of {complaints.length} records
            </span>
          </div>
        )}

        {/* Complaints Listing */}
        {isLoading ? (
          <div className="p-12 text-center text-[#667578] text-sm">
            Loading your complaints...
          </div>
        ) : complaints.length === 0 ? (
          /* Empty State: Zero complaints */
          <div className="paper-sheet rounded-xl p-10 text-center space-y-3">
            <FileText className="w-8 h-8 text-[#667578] mx-auto opacity-40" />
            <h3 className="text-base font-semibold text-[#1C3033]">
              {t('dashEmptyPersonal') || "You haven't submitted any complaints yet."}
            </h3>
            <p className="text-xs text-[#667578] max-w-sm mx-auto">
              Submit your first civic grievance using our paper application in Roman Urdu or English.
            </p>
            <div className="pt-2">
              <Link to="/submit">
                <Button variant="primary" size="sm" leftIcon={<PenTool className="w-3.5 h-3.5" />}>
                  {t('dashWriteNew') || '+ Write a Complaint'}
                </Button>
              </Link>
            </div>
          </div>
        ) : filteredComplaints.length === 0 ? (
          /* Empty Search State */
          <div className="paper-sheet rounded-xl p-8 text-center space-y-2">
            <p className="text-sm text-[#1C3033] font-medium">
              No personal complaints match "{searchQuery}"
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-[#087F76] font-semibold hover:underline cursor-pointer"
            >
              Clear search filter
            </button>
          </div>
        ) : (
          /* Restrained, Elegant List of Personal Complaints */
          <div className="space-y-3">
            {filteredComplaints.map((item) => (
              <div
                key={item.id}
                className="paper-sheet rounded-lg p-4 sm:p-5 transition-colors hover:border-[#193D3D]/30"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="ref-code text-xs font-semibold px-2 py-0.5 rounded bg-[#F7F8F7] border border-[#E5E9E7] text-[#1C3033]">
                        {item.referenceNumber}
                      </span>
                      <span className="text-[11px] text-[#667578]">
                        {formatDateOnly(item.submittedAt, language)}
                      </span>
                    </div>

                    <h3 className="text-sm sm:text-base font-semibold text-[#1C3033] truncate">
                      {item.title}
                    </h3>

                    <p className="text-xs text-[#667578] truncate">
                      {item.locality}, {item.district}
                      {item.assignedDepartmentName && (
                        <span> • {item.assignedDepartmentName}</span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E5E9E7]">
                    <ComplaintStatusBadge status={item.status} size="sm" />
                    <Link
                      to={`/track/${item.referenceNumber}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#087F76] hover:text-[#193D3D] px-2.5 py-1.5 rounded hover:bg-[#E5E9E7]/40 transition-colors"
                    >
                      <span>Track Status</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Subtle Ownership & Phase 2 Disclaimer */}
      <div className="pt-4 border-t border-[#E5E9E7] flex items-center gap-2 text-[11px] text-[#667578]">
        <Shield className="w-3.5 h-3.5 text-[#087F76] shrink-0" />
        <span>
          Personal ownership prototype: Currently displaying simulated records belonging to Muhammad Bilal. User isolation will be enforced by Supabase Row-Level Security in Phase 2.
        </span>
      </div>
    </div>
  );
};
