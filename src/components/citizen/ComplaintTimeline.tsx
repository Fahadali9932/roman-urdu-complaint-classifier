import React from 'react';
import { type ComplaintTimelineEvent } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { formatDateTime } from '../../utils/dateFormatter';
import { CheckCircle2, Clock, Send, ShieldAlert, Cpu } from 'lucide-react';

interface ComplaintTimelineProps {
  events: ComplaintTimelineEvent[];
  className?: string;
}

export const ComplaintTimeline: React.FC<ComplaintTimelineProps> = ({
  events,
  className = '',
}) => {
  const { language } = useLanguage();

  if (!events || events.length === 0) {
    return null;
  }

  const getActorIcon = (role: string) => {
    switch (role) {
      case 'system':
        return <Cpu className="w-4 h-4 text-teal-600" />;
      case 'department_officer':
        return <ShieldAlert className="w-4 h-4 text-purple-600" />;
      case 'citizen':
        return <Send className="w-4 h-4 text-slate-600" />;
      default:
        return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="space-y-6">
        {events.map((event, index) => {
          const isLatest = index === events.length - 1;
          const title = language === 'ur' ? event.titleUrdu : event.title;
          const desc = language === 'ur' ? event.descriptionUrdu : event.description;

          return (
            <div key={event.id || index} className="relative flex gap-4 text-start">
              {/* Vertical connector line */}
              {index < events.length - 1 && (
                <div
                  className="absolute start-4 top-8 bottom-[-16px] w-0.5 bg-slate-200"
                  aria-hidden="true"
                />
              )}

              {/* Step indicator node */}
              <div
                className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 bg-white shrink-0 shadow-2xs ${
                  isLatest
                    ? 'border-teal-600 ring-4 ring-teal-50'
                    : 'border-slate-300'
                }`}
              >
                {isLatest ? (
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                ) : (
                  getActorIcon(event.actorRole)
                )}
              </div>

              {/* Event content box */}
              <div className="flex-1 pt-0.5 pb-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-1">
                  <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <span>{title}</span>
                    {event.departmentCode && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        {event.departmentCode}
                      </span>
                    )}
                  </h4>
                  <time className="text-xs text-slate-400 font-medium">
                    {formatDateTime(event.timestamp, language)}
                  </time>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
