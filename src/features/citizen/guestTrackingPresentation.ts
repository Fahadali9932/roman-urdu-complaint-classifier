/** Public-only presentation of a guest complaint. Never infer operational progress. */
export interface GuestTrackingRecord {
  found: boolean;
  public_status?: string;
  display_status?: string;
  public_category?: string;
  submitted_at?: string;
  updated_at?: string;
  public_updates?: Array<{ status: string; at: string; message: string }>;
  is_multilabel?: boolean;
  public_issues?: Array<{
    department_name: string;
    department_id: string;
    status: string;
    display_status: string;
  }>;
}

export type TrackingStage =
  | 'received'
  | 'review'
  | 'assigned'
  | 'in_progress'
  | 'partial'
  | 'resolved'
  | 'rejected'
  | 'closed';

const normalizeStatus = (value?: string): string =>
  (value || '').toLowerCase().trim().replace(/[\s-]+/g, '_');

export function getTrackingStage(record: GuestTrackingRecord): TrackingStage {
  const status = normalizeStatus(record.public_status || record.display_status);
  if (['resolved', 'completed', 'complete'].includes(status)) return 'resolved';
  if (['partly_resolved', 'partially_resolved'].includes(status)) return 'partial';
  if (['in_progress', 'investigating', 'work_in_progress'].includes(status)) return 'in_progress';
  if (['assigned', 'accepted', 'routed', 'sent_to_department', 'pending_acceptance'].includes(status)) return 'assigned';
  if (['under_review', 'review', 'needs_review', 'awaiting_review', 'pending_review'].includes(status)) return 'review';
  if (status === 'rejected') return 'rejected';
  if (['closed', 'dismissed'].includes(status)) return 'closed';
  return 'received';
}

export function getTrackingCopy(stage: TrackingStage, urdu: boolean): { title: string; explanation: string; next: string } {
  const copy = {
    received: {
      en: ['Complaint received', 'We have recorded your complaint. Department assignment has not been confirmed yet.', 'We will update this record when the next step is confirmed.'],
      ur: ['شکایت موصول ہو گئی', 'آپ کی شکایت درج ہو گئی ہے۔ ابھی متعلقہ محکمے کی تصدیق نہیں ہوئی۔', 'اگلی تصدیق شدہ پیش رفت یہاں ظاہر ہوگی۔'],
    },
    review: {
      en: ['Under review', 'Your complaint is being checked before it is sent to the appropriate department.', 'Check back for a confirmed department assignment.'],
      ur: ['شکایت زیرِ جائزہ ہے', 'آپ کی شکایت کی جانچ ہو رہی ہے تاکہ اسے متعلقہ محکمے کو بھیجا جا سکے۔', 'محکمے کی تصدیق کے لیے دوبارہ چیک کریں۔'],
    },
    assigned: {
      en: ['Sent to department', 'Your complaint has been routed to the responsible department. Work has not yet been confirmed as started.', 'The next update will show whether work has begun.'],
      ur: ['محکمے کو بھیج دی گئی', 'آپ کی شکایت متعلقہ محکمے کو بھیج دی گئی ہے۔ ابھی کام شروع ہونے کی تصدیق نہیں ہوئی۔', 'اگلی پیش رفت میں کام شروع ہونے کی معلومات ظاہر ہوں گی۔'],
    },
    in_progress: {
      en: ['Work in progress', 'The department has marked your complaint as in progress.', 'Check back for a resolution update.'],
      ur: ['کام جاری ہے', 'محکمے نے اطلاع دی ہے کہ شکایت پر کام جاری ہے۔', 'مسئلہ حل ہونے کی خبر کے لیے دوبارہ چیک کریں۔'],
    },
    partial: {
      en: ['Partially resolved', 'The department has recorded some work as completed, but the complaint is not fully resolved.', 'Check back for the remaining work update.'],
      ur: ['مسئلہ جزوی طور پر حل ہوا', 'محکمے نے کچھ کام مکمل ہونے کی اطلاع دی ہے، مگر مکمل حل کی تصدیق نہیں ہوئی۔', 'باقی کام کی پیش رفت کے لیے دوبارہ چیک کریں۔'],
    },
    resolved: {
      en: ['Marked resolved', 'The department has recorded this complaint as resolved.', 'See the latest department update for details, if available.'],
      ur: ['مسئلہ حل شدہ درج ہے', 'محکمے نے اس شکایت کو حل شدہ درج کیا ہے۔', 'مزید تفصیل کے لیے محکمانہ اپ ڈیٹ دیکھیں، اگر موجود ہو۔'],
    },
    rejected: {
      en: ['Complaint rejected', 'The department has recorded this complaint as rejected.', 'See any official updates for the reason or submit a new report if needed.'],
      ur: ['شکایت مسترد کر دی گئی', 'محکمے نے اس شکایت کو مسترد درج کیا ہے۔', 'وجہ کے لیے سرکاری اپ ڈیٹس دیکھیں یا ضرورت ہو تو نئی شکایت دیں۔'],
    },
    closed: {
      en: ['Complaint closed', 'This complaint has been closed. See the recorded update for the reason, if available.', 'You can submit a new complaint if the issue remains.'],
      ur: ['شکایت بند کر دی گئی', 'یہ شکایت بند کر دی گئی ہے۔ وجہ معلوم کرنے کے لیے درج شدہ پیش رفت دیکھیں۔', 'اگر مسئلہ باقی ہے تو نئی شکایت درج کر سکتے ہیں۔'],
    },
  } as const;
  const [title, explanation, next] = copy[stage][urdu ? 'ur' : 'en'];
  return { title, explanation, next };
}

/** A classifier suggestion is not an assignment. Hide names until routing is confirmed. */
export function getConfirmedDepartments(record: GuestTrackingRecord): string[] {
  const stage = getTrackingStage(record);
  if (!['assigned', 'in_progress', 'partial', 'resolved'].includes(stage)) return [];
  const names = (record.public_issues || [])
    .filter((issue) => issue.department_name?.trim() && ['assigned', 'accepted', 'in_progress', 'partly_resolved', 'resolved'].includes(normalizeStatus(issue.status)))
    .map((issue) => issue.department_name.trim());
  return [...new Set(names)].slice(0, 2);
}
