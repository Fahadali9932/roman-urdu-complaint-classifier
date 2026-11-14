import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Container } from '../../components/layout/Container';
import { Button } from '../../components/common/Button';
import { useLanguage } from '../../context/LanguageContext';
import { FolderOpen, PenTool } from 'lucide-react';
import { complaintService } from '../../services';
import type { Complaint } from '../../types';

export const ComplaintTracker: React.FC = () => {
  const { language, t } = useLanguage();
  const { referenceNumber } = useParams<{ referenceNumber?: string }>();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { if (!referenceNumber) return; complaintService.getComplaintByReference(referenceNumber).then(setComplaint).catch(() => setError('This complaint is unavailable in your account.')); }, [referenceNumber]);

  if (complaint) return <div className="py-12 sm:py-16"><Container size="sm"><div className="rounded-3xl bg-white border border-[#E5E3E0] p-6 sm:p-10 space-y-6 shadow-[0_12px_36px_rgba(20,20,20,0.06)]"><div><p className="text-xs font-mono text-[#681822]">{complaint.referenceNumber}</p><h1 className="mt-2 font-display font-black text-2xl text-[#141414] uppercase">{complaint.title}</h1><p className="mt-2 text-sm text-[#323232]">Current status: <strong>{complaint.status.replace('_', ' ')}</strong></p></div><ol className="space-y-4">{complaint.timeline.map((event) => <li key={event.id} className="border-s-2 border-[#681822] ps-4"><p className="font-semibold text-sm text-[#141414]">{event.title}</p><p className="text-xs text-[#323232]">{event.description}</p><time className="text-[11px] text-[#6B6864]">{new Date(event.timestamp).toLocaleString()}</time></li>)}</ol></div></Container></div>;

  return (
    <div className="py-12 sm:py-16">
      <Container size="sm">
        <div className="rounded-3xl bg-white border border-[#E5E3E0] p-6 sm:p-12 text-center space-y-5 shadow-[0_12px_36px_rgba(20,20,20,0.06)]">
          <div className="w-16 h-16 rounded-2xl bg-[#FAF9F7] border border-[#E5E3E0] flex items-center justify-center mx-auto text-[#681822]">
            <FolderOpen className="w-8 h-8 stroke-[1.5]" />
          </div>
          <div className="space-y-2">
            <h1 className="font-display font-black text-2xl sm:text-3xl text-[#141414] tracking-tight uppercase">
              {language === 'ur' ? 'شکایت کی پیش رفت' : 'Complaint progress'}
            </h1>
            <p className="text-sm text-[#323232] leading-relaxed font-ui">
              {error || (language === 'ur'
                ? 'جب شکایات بھیجنے اور محفوظ کرنے کی سہولت دستیاب ہوگی تو ان کی پیش رفت یہاں دکھائی جائے گی۔'
                : 'Progress will be shown here when complaints can be sent and saved. Sign in, then open a complaint reference to view its live progress timeline.')}
            </p>
          </div>
          <Link to="/submit" className="inline-block">
            <Button variant="primary" size="md" leftIcon={<PenTool className="w-4 h-4 text-[#FFFFFF]" />}>
              {t('navWriteComplaint')}
            </Button>
          </Link>
        </div>
      </Container>
    </div>
  );
};
