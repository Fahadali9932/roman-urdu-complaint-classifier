import React from 'react';
import { type ComplaintStatus } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { Badge } from '../common/Badge';
import { Clock, CheckCircle2, RefreshCw, Send, ShieldAlert, XCircle } from 'lucide-react';

interface ComplaintStatusBadgeProps {
  status: ComplaintStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export const ComplaintStatusBadge: React.FC<ComplaintStatusBadgeProps> = ({
  status,
  size = 'md',
  className = '',
}) => {
  const { t } = useLanguage();

  switch (status) {
    case 'submitted':
      return (
        <Badge
          variant="slate"
          size={size}
          icon={<Send className="w-3 h-3" />}
          className={className}
        >
          {t('statusSubmitted')}
        </Badge>
      );
    case 'under_review':
      return (
        <Badge
          variant="blue"
          size={size}
          icon={<Clock className="w-3 h-3" />}
          className={className}
        >
          {t('statusUnderReview')}
        </Badge>
      );
    case 'assigned':
      return (
        <Badge
          variant="purple"
          size={size}
          icon={<ShieldAlert className="w-3 h-3" />}
          className={className}
        >
          {t('statusAssigned')}
        </Badge>
      );
    case 'in_progress':
      return (
        <Badge
          variant="amber"
          size={size}
          icon={<RefreshCw className="w-3 h-3 animate-spin-reverse" />}
          className={className}
        >
          {t('statusInProgress')}
        </Badge>
      );
    case 'resolved':
      return (
        <Badge
          variant="emerald"
          size={size}
          icon={<CheckCircle2 className="w-3 h-3" />}
          className={className}
        >
          {t('statusResolved')}
        </Badge>
      );
    case 'rejected':
      return (
        <Badge
          variant="rose"
          size={size}
          icon={<XCircle className="w-3 h-3" />}
          className={className}
        >
          {t('statusRejected')}
        </Badge>
      );
    default:
      return (
        <Badge variant="slate" size={size} className={className}>
          {status}
        </Badge>
      );
  }
};
