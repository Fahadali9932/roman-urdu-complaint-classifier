/**
 * AWAAZ-E-AWAM (آوازِ عوام) — Case Operations Service Implementation
 * Production-ready server-paged service supporting incident cases, memberships,
 * filtering, search, area rollups, and atomic idempotent bulk acceptance.
 */

import type {
  DepartmentId,
  IncidentCaseSummary,
  CaseReportRow,
  CaseActivityEvent,
  CursorPage,
  WorkQueueFilter,
  BulkAcceptPreview,
  BulkAcceptResult,
  AreaWorkloadSummary,
  ComplaintStatus,
  PriorityBand,
} from '../types';
import type { ICaseOperationsService } from './ICaseOperationsService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface StoredCase extends IncidentCaseSummary {
  reports: CaseReportRow[];
  activity: CaseActivityEvent[];
}

export type HeadOverviewPeriod = 'today' | 'yesterday' | 'month' | 'year';
export type ComplaintsDateFilter = 'all' | 'today' | 'yesterday' | 'month';

export interface HeadPeriodOverview {
  period: HeadOverviewPeriod;
  totalActive: number;
  newComplaints: number;
  underReview: number;
  inProgress: number;
  awaitingVerification: number;
}

export interface HeadIndependentComplaintRow {
  id: string;
  referenceNumber: string;
  heading: string;
  sanitizedText: string;
  factualSummary: string;
  locality: string;
  publicPlace: string;
  district: string;
  issueTypes: string[];
  status: ComplaintStatus;
  workOrderStatus?: 'assigned' | 'in_progress' | 'pending_review' | 'verified' | 'returned' | null;
  workOrderId?: string | null;
  assignedOfficerId?: string | null;
  assignedOfficerName?: string | null;
  submittedAt: string;
  updatedAt: string;
  priority: PriorityBand;
}

const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;

export function getPktPeriodBounds(period: HeadOverviewPeriod | ComplaintsDateFilter, nowMs = Date.now()): { startMs: number; endMs: number } {
  if (period === 'all') {
    return { startMs: 0, endMs: Number.MAX_SAFE_INTEGER };
  }
  // Asia/Karachi is fixed UTC+05:00 (no DST)
  const pktNow = new Date(nowMs + PKT_OFFSET_MS);
  const y = pktNow.getUTCFullYear();
  const m = pktNow.getUTCMonth();
  const d = pktNow.getUTCDate();

  const todayStartUtc = Date.UTC(y, m, d, 0, 0, 0, 0) - PKT_OFFSET_MS;
  if (period === 'today') {
    return { startMs: todayStartUtc, endMs: nowMs };
  }
  if (period === 'yesterday') {
    return { startMs: todayStartUtc - 86400000, endMs: todayStartUtc - 1 };
  }
  if (period === 'month') {
    return { startMs: Date.UTC(y, m, 1, 0, 0, 0, 0) - PKT_OFFSET_MS, endMs: nowMs };
  }
  return { startMs: Date.UTC(y, 0, 1, 0, 0, 0, 0) - PKT_OFFSET_MS, endMs: nowMs };
}

export class CaseOperationsService implements ICaseOperationsService {
  private casesByDept: Map<DepartmentId, StoredCase[]> = new Map();
  private batchOperations: Map<string, BulkAcceptResult> = new Map();

  constructor() {
    // Synthetic cases are training/demo material, never production workload.
    // A production bundle must build its department queue from authorized data.
    if (import.meta.env.DEV || import.meta.env.MODE === 'test') {
      this.seedAllDepartments();
    }
  }

  public resetToDefault(): void {
    this.batchOperations.clear();
    this.casesByDept.clear();
    if (import.meta.env.DEV || import.meta.env.MODE === 'test') {
      this.seedAllDepartments();
    }
  }

  public isDemonstrationWorkspace(): boolean {
    return import.meta.env.DEV || import.meta.env.MODE === 'test';
  }

  private seedAllDepartments() {
    const departments: DepartmentId[] = [
      'kmc',
      'kwsc',
      'kelectric',
      'ssgc',
      'sbca',
      'sswmb',
    ];

    for (const dept of departments) {
      this.casesByDept.set(dept, this.generateDepartmentSeed(dept));
    }
  }

  private generateDepartmentSeed(dept: DepartmentId): StoredCase[] {
    const landmarks = [
      'University Road near NED University',
      'Maskan Chowrangi bus stop',
      'Sector 35 public service road',
      'Water Pump Chowrangi near market',
      'Block H commercial market road',
      'Block 6 service lane near park',
      'Hasan Square main crossing',
      'School Road near Sector 5',
      'Preedy Street crossing',
      'Block 4 main footpath',
      'Block 12 storm drain crossing',
      'Block J playground entrance',
      'Tariq Road commercial strip',
      'Boat Basin food street',
      'Nagan Chowrangi underpass',
      'Five Star Chowrangi service road',
      'Dawood Chowrangi main junction',
      'Sindhi Muslim Society roundabout',
      'Bilawal Chowrangi coastline road',
      'Shaheed-e-Millat expressway bridge',
      'Burns Road heritage street',
      'Rashid Minhas Road flyover',
      'Allama Iqbal Road junction',
      'Shahrah-e-Faisal service lane',
    ];
    const segments = landmarks;

    const areas = [
      'Gulshan-e-Iqbal',
      'Korangi',
      'Gulberg',
      'North Nazimabad',
      'Saddar',
      'Clifton',
      'PECHS',
    ];

    // Department-specific configurations
    const configMap: Record<
      Exclude<DepartmentId, 'unassigned'>,
      {
        family: string;
        issues: string[];
        titleGen: (issue: string, place: string) => string;
        narrativeGen: (issue: string, place: string) => string;
        leadPothole: { title: string; issue: string; summary: string };
        urgentSolo: { title: string; issue: string; summary: string };
      }
    > = {
      kmc: {
        family: 'Roads & Infrastructure',
        issues: [
          'Road damage',
          'Road safety',
          'Road drainage',
          'Road obstruction',
          'Footpath obstruction',
        ],
        titleGen: (issue, place) =>
          issue === 'Road damage'
            ? `Road surface damaged — ${place}`
            : issue === 'Road safety'
            ? `Road collapse hazard — ${place}`
            : issue === 'Road drainage'
            ? `Damaged road drain — ${place}`
            : `Obstruction on street — ${place}`,
        narrativeGen: (_issue, place) =>
          `University Road par road bohot toot gayi hai, ${place} ke qareeb gadiyan mushkil se guzarti hain. Is jagah repair ki zaroorat hai.`,
        leadPothole: {
          title: 'Road surface damaged near NED University',
          issue: 'Road damage',
          summary:
            'Road surface damage and deep potholes reported near the University Road crossing at NED University. Several motorists report acute difficulty passing this section; staff must verify on ground and dispatch road repair.',
        },
        urgentSolo: {
          title: 'Open manhole beside playground',
          issue: 'Road safety',
          summary:
            'A resident reports an uncovered roadside manhole beside the community playground near Maskan Chowrangi. Immediate barricading and cover placement needed.',
        },
      },
      kwsc: {
        family: 'Water & Sewerage',
        issues: [
          'Pipeline burst',
          'Sewage overflow',
          'Water shortage',
          'Contaminated water',
          'Open sewer manhole',
        ],
        titleGen: (issue, place) =>
          issue === 'Pipeline burst'
            ? `Broken drinking water pipe — ${place}`
            : issue === 'Sewage overflow'
            ? `Sewage overflow on street — ${place}`
            : issue === 'Contaminated water'
            ? `Contaminated water supply — ${place}`
            : `Water supply disruption — ${place}`,
        narrativeGen: (_issue, place) =>
          `Drinking water pipeline burst ho gaya hai ${place} ke paas, saaf pani zaya ho raha hai aur gali mein keecharr hai.`,
        leadPothole: {
          title: 'Broken drinking water pipe near NED University',
          issue: 'Pipeline burst',
          summary:
            'Major drinking water distribution line burst near University Road. Potable water is flooding the roadway while residential blocks face supply loss.',
        },
        urgentSolo: {
          title: 'Sewage overflow entering clinical premises',
          issue: 'Sewage overflow',
          summary:
            'Raw sewage overflowing from main line directly into hospital access lane. Immediate vacuum tanker and line clearance required.',
        },
      },
      kelectric: {
        family: 'Electricity & Grid',
        issues: [
          'Sparking wire hazard',
          'Transformer blast',
          'Unscheduled outage',
          'Loose high-voltage cable',
          'Broken streetlight',
        ],
        titleGen: (issue, place) =>
          issue === 'Sparking wire hazard'
            ? `Dangerous sparking wire — ${place}`
            : issue === 'Transformer blast'
            ? `Damaged PMT transformer — ${place}`
            : `Power outage — ${place}`,
        narrativeGen: (_issue, place) =>
          `Khula taar zameen par gira hua hai ${place} ke samnay, chingariyan nikal rahi hain, bohot khatra hai.`,
        leadPothole: {
          title: 'Dangerous sparking wire near University Road',
          issue: 'Sparking wire hazard',
          summary:
            'Overhead distribution line snapped and hanging near pedestrian walkway. Sparks reported when energized; grid protection dispatch required.',
        },
        urgentSolo: {
          title: 'Live conductor cable on wet street',
          issue: 'Loose high-voltage cable',
          summary:
            'Exposed live electrical conductor resting on waterlogged pavement near school crossing. Urgent de-energization and crew dispatch needed.',
        },
      },
      ssgc: {
        family: 'Gas Distribution',
        issues: [
          'Gas leak emergency',
          'Low pressure',
          'Gas line damage',
          'Unmetered line leak',
          'Pipeline corrosion',
        ],
        titleGen: (issue, place) =>
          issue === 'Gas leak emergency'
            ? `Underground gas leak — ${place}`
            : `Severe gas low pressure — ${place}`,
        narrativeGen: (_issue, place) =>
          `Sui gas pipeline se gas leak ho rahi hai ${place} ke qareeb, shadeed smell hai aur blast ka dar hai.`,
        leadPothole: {
          title: 'Sustained gas leak near market crossing',
          issue: 'Gas leak emergency',
          summary:
            'Underground gas distribution pipeline leaking near market entrance. Distinct odor reported; emergency valve shutdown and sniffer verification required.',
        },
        urgentSolo: {
          title: 'Ruptured gas main beside residential complex',
          issue: 'Gas leak emergency',
          summary:
            'Excavation puncture on main gas feeder pipe with loud hissing sound. Evacuation cordon and rapid repair required.',
        },
      },
      sbca: {
        family: 'Building Control',
        issues: [
          'Structural cracks',
          'Illegal multi-story addition',
          'Balcony collapse risk',
          'Hazardous excavation',
          'Encroached exit',
        ],
        titleGen: (issue, place) =>
          issue === 'Structural cracks'
            ? `Dangerous structural cracks — ${place}`
            : `Unauthorized construction — ${place}`,
        narrativeGen: (_issue, place) =>
          `Imarat ki deewar mein baray cracks aa gaye hain ${place} par, girnay ka khatra hai.`,
        leadPothole: {
          title: 'Structural cracks on commercial plaza facade',
          issue: 'Structural cracks',
          summary:
            'Load-bearing pillar exhibiting severe shear cracks after unauthorized basement alterations. Immediate engineering inspection requested.',
        },
        urgentSolo: {
          title: 'Imminent balcony collapse over footpath',
          issue: 'Balcony collapse risk',
          summary:
            'Second floor cantilever balcony sagging visibly with spalling concrete falling onto pedestrian walkway below.',
        },
      },
      sswmb: {
        family: 'Solid Waste Management',
        issues: [
          'Garbage uncollected',
          'Overflowing public dumpster',
          'Illegal dumping on road',
          'Stagnant waste accumulation',
          'Drain clogged by refuse',
        ],
        titleGen: (issue, place) =>
          issue === 'Overflowing public dumpster'
            ? `Overflowing dumpster — ${place}`
            : `Uncollected garbage accumulation — ${place}`,
        narrativeGen: (_issue, place) =>
          `Kachra pichlay chaar din se nahi uthaya gaya ${place} par, shadeed badbu hai aur machhar phail rahay hain.`,
        leadPothole: {
          title: 'Overflowing public dumpster near University Road',
          issue: 'Overflowing public dumpster',
          summary:
            'Municipal garbage dumpster overflowing onto main roadway for over five days. Refuse is blocking lane access and posing acute sanitary nuisance.',
        },
        urgentSolo: {
          title: 'Toxic hospital waste dumped in residential lane',
          issue: 'Illegal dumping on road',
          summary:
            'Clinical and biohazard waste discarded adjacent to residential open plot. Immediate hazardous disposal dispatch required.',
        },
      },
    };

    const cfg = (dept in configMap ? configMap[dept as keyof typeof configMap] : configMap.kmc);
    const result: StoredCase[] = [];
    const nowMs = Date.now();
    const hoursAgo = (h: number) => new Date(nowMs - h * 3600 * 1000).toISOString();
    const daysAgo = (d: number, hour = 10) => {
      const base = new Date(nowMs - d * 86400000);
      base.setUTCHours(hour, 15, 0, 0);
      return base.toISOString();
    };

    // V16: Every incoming unconfirmed citizen complaint is kept strictly independent (1 report per record).
    // No automatic locality or corridor bundling is applied on unconfirmed complaints.
    const demoSeeds: Array<{
      id: string;
      ref: string;
      title: string;
      issue: string;
      area: string;
      place: string;
      status: ComplaintStatus;
      workStatus: 'needs_acceptance' | 'accepted' | 'in_progress' | 'completed';
      risk: PriorityBand;
      submittedAt: string;
      age: number;
      assignedStaffId?: string | null;
      assignedStaffLabel?: string;
      summary: string;
      narrative: string;
    }> = [
      {
        id: `demo-${dept}-001`,
        ref: `KHI-2026-9001`,
        title: cfg.leadPothole.title,
        issue: cfg.leadPothole.issue,
        area: 'Gulshan-e-Iqbal',
        place: segments[0],
        status: 'assigned',
        workStatus: 'needs_acceptance',
        risk: 'normal',
        submittedAt: hoursAgo(2),
        age: 0,
        summary: cfg.leadPothole.summary,
        narrative: cfg.narrativeGen(cfg.leadPothole.issue, segments[0]),
      },
      {
        id: `demo-${dept}-002`,
        ref: `KHI-2026-9002`,
        title: cfg.urgentSolo.title,
        issue: cfg.urgentSolo.issue,
        area: 'Gulshan-e-Iqbal',
        place: segments[1],
        status: 'assigned',
        workStatus: 'needs_acceptance',
        risk: 'critical',
        submittedAt: hoursAgo(3),
        age: 0,
        summary: cfg.urgentSolo.summary,
        narrative: cfg.narrativeGen(cfg.urgentSolo.issue, segments[1]),
      },
      {
        id: `demo-${dept}-003`,
        ref: `KHI-2026-9003`,
        title: cfg.titleGen(cfg.issues[1], segments[2]),
        issue: cfg.issues[1],
        area: 'Korangi',
        place: segments[2],
        status: 'in_progress',
        workStatus: 'in_progress',
        risk: 'high',
        submittedAt: hoursAgo(4),
        age: 0,
        assignedStaffId: 'local-officer-a',
        assignedStaffLabel: 'Field Officer A',
        summary: cfg.leadPothole.summary,
        narrative: cfg.narrativeGen(cfg.issues[1], segments[2]),
      },
      {
        id: `demo-${dept}-004`,
        ref: `KHI-2026-9004`,
        title: cfg.titleGen(cfg.issues[2], segments[3]),
        issue: cfg.issues[2],
        area: 'Gulberg',
        place: segments[3],
        status: dept === 'kmc' ? 'under_review' : 'accepted',
        workStatus: 'accepted',
        risk: 'normal',
        submittedAt: hoursAgo(5),
        age: 0,
        summary: `Citizens reported ${cfg.issues[2].toLowerCase()} near ${segments[3]}.`,
        narrative: cfg.narrativeGen(cfg.issues[2], segments[3]),
      },
      {
        id: `demo-${dept}-005`,
        ref: `KHI-2026-9005`,
        title: cfg.titleGen(cfg.issues[0], segments[4]),
        issue: cfg.issues[0],
        area: 'North Nazimabad',
        place: segments[4],
        status: 'in_progress',
        workStatus: 'in_progress',
        risk: 'normal',
        submittedAt: daysAgo(1, 9),
        age: 1,
        assignedStaffId: 'local-officer-a',
        assignedStaffLabel: 'Field Officer A',
        summary: `Repair verification awaiting supervisor inspection near ${segments[4]}.`,
        narrative: cfg.narrativeGen(cfg.issues[0], segments[4]),
      },
      {
        id: `demo-${dept}-006`,
        ref: `KHI-2026-9006`,
        title: cfg.titleGen(cfg.issues[3], segments[5]),
        issue: cfg.issues[3],
        area: 'PECHS',
        place: segments[5],
        status: 'accepted',
        workStatus: 'accepted',
        risk: 'normal',
        submittedAt: daysAgo(1, 12),
        age: 1,
        summary: `Complaint logged yesterday near ${segments[5]}.`,
        narrative: cfg.narrativeGen(cfg.issues[3], segments[5]),
      },
      {
        id: `demo-${dept}-007`,
        ref: `KHI-2026-9007`,
        title: cfg.titleGen(cfg.issues[4], segments[6]),
        issue: cfg.issues[4],
        area: 'Saddar',
        place: segments[6],
        status: 'assigned',
        workStatus: 'needs_acceptance',
        risk: 'high',
        submittedAt: daysAgo(4, 11),
        age: 4,
        summary: `Earlier complaint this month requiring field dispatch near ${segments[6]}.`,
        narrative: cfg.narrativeGen(cfg.issues[4], segments[6]),
      },
      {
        id: `demo-${dept}-008`,
        ref: `KHI-2026-9008`,
        title: cfg.titleGen(cfg.issues[0], segments[7]),
        issue: cfg.issues[0],
        area: 'Clifton',
        place: segments[7],
        status: 'resolved',
        workStatus: 'completed',
        risk: 'normal',
        submittedAt: daysAgo(12, 8),
        age: 12,
        assignedStaffId: 'local-officer-a',
        assignedStaffLabel: 'Field Officer A',
        summary: `Resolved and verified earlier this month near ${segments[7]}.`,
        narrative: cfg.narrativeGen(cfg.issues[0], segments[7]),
      },
    ];

    for (let i = 0; i < 92; i++) {
      const area = areas[i % areas.length];
      const place = segments[(i + 8) % segments.length];
      const issue = cfg.issues[i % cfg.issues.length];
      const age = i < 12 ? 0 : i < 24 ? 1 : 2 + (i % 20);
      const status: ComplaintStatus = i % 5 === 0 ? 'resolved' : i % 3 === 0 ? 'accepted' : 'assigned';
      const workStatus =
        status === 'resolved'
          ? 'completed'
          : status === 'accepted'
          ? 'accepted'
          : 'needs_acceptance';
      demoSeeds.push({
        id: `demo-${dept}-${String(i + 9).padStart(3, '0')}`,
        ref: `KHI-2026-${9010 + i}`,
        title: `${cfg.titleGen(issue, place)} #${i + 9}`,
        issue,
        area,
        place,
        status,
        workStatus,
        risk: age > 14 ? 'high' : 'normal',
        submittedAt: age === 0 ? hoursAgo(1 + (i % 6)) : daysAgo(age, 7 + (i % 8)),
        age,
        assignedStaffId: status === 'resolved' ? 'local-officer-a' : null,
        assignedStaffLabel: status === 'resolved' ? 'Field Officer A' : 'Unassigned',
        summary: `Citizen reported ${issue.toLowerCase()} near ${place}, ${area}.`,
        narrative: cfg.narrativeGen(issue, place),
      });
    }

    for (const seed of demoSeeds) {
      const reportRow: CaseReportRow = {
        complaintId: seed.id,
        referenceNumber: seed.ref,
        submittedAt: seed.submittedAt,
        updatedAt: seed.submittedAt,
        status: seed.status,
        sanitizedNarrativePreview: seed.narrative,
        publicLocation: seed.place,
        linkState: 'linked',
        linkMethod: 'manual_staff',
        uniquePersonId: `resident-${seed.id}`,
      };

      const pendingCount = seed.status === 'assigned' || seed.status === 'submitted' ? 1 : 0;
      result.push({
        id: seed.id,
        caseNumber: seed.ref,
        departmentId: dept,
        title: seed.title,
        issueFamily: cfg.family,
        issueSubtype: seed.issue,
        publicPlace: seed.place,
        district:
          seed.area === 'Gulshan-e-Iqbal'
            ? 'District East'
            : seed.area === 'Gulberg' || seed.area === 'North Nazimabad'
            ? 'District Central'
            : seed.area === 'Korangi'
            ? 'District Korangi'
            : 'District South',
        locality: seed.area,
        workStatus: seed.workStatus,
        linkedReportCount: 1,
        uniqueReporterCount: 1,
        pendingAcceptanceCount: pendingCount,
        priority: seed.risk,
        priorityReason:
          seed.risk === 'critical'
            ? 'Urgent public safety concern reported by resident.'
            : 'Standard independent citizen complaint.',
        firstReportedAt: seed.submittedAt,
        lastReportedAt: seed.submittedAt,
        oldestPendingAt: pendingCount > 0 ? seed.submittedAt : null,
        ageDays: seed.age,
        assignedStaffId: seed.assignedStaffId ?? null,
        assignedStaffLabel: seed.assignedStaffLabel ?? 'Unassigned',
        summary: seed.summary,
        version: 1,
        reports: [reportRow],
        activity: [
          {
            id: `act-${seed.id}`,
            caseId: seed.id,
            eventType: 'created',
            label: 'Complaint received',
            detail: `Independent complaint ${seed.ref} logged for department triage.`,
            actorLabel: 'Citizen Intake',
            createdAt: seed.submittedAt,
            formattedWhen: seed.submittedAt,
          },
        ],
      });
    }

    return result;
  }

  private async syncWithSupabase(deptId: DepartmentId): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) {
      if (!this.isDemonstrationWorkspace()) {
        throw new Error('Live case data is unavailable because the secure connection is not configured.');
      }
      return;
    }
    try {
      const { data, error } = await supabase
        .from('complaints')
        // Staff must never request raw private description or guest claim/tracking credential digests.
        .select('id, citizen_id, reference_number, created_at, updated_at, status, sanitized_description, incident_public_location, incident_locality, generated_heading, title, predicted_department_id, assigned_department_id, assigned_department_ids, incident_district, manual_priority, manual_priority_reason, factual_summary')
        .or(`assigned_department_id.eq.${deptId},assigned_department_ids.cs.{${deptId}}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data || !Array.isArray(data)) throw new Error('The case service returned an invalid response.');

      // STRICT DATA INTEGRITY: Never mix seeded demo cases with live Supabase cases.
      if (data.length === 0) {
        if (!this.isDemonstrationWorkspace()) {
          this.casesByDept.set(deptId, []);
        }
        return;
      }

      const complaintIds = data.map((item) => item.id);
      const [{ data: issueRows, error: issueError }, { data: orderLinks }] = await Promise.all([
        supabase
          .from('complaint_issues')
          .select('complaint_id,issue_type,department_id,status')
          .eq('department_id', deptId)
          .in('complaint_id', complaintIds),
        supabase
          .from('department_work_order_reports')
          .select('complaint_id, order_id, department_work_orders(id, officer_id, status)')
          .eq('department_id', deptId)
          .in('complaint_id', complaintIds),
      ]);
      if (issueError) throw issueError;

      const issueByComplaint = new Map<string, string[]>();
      const issueStatusByComplaint = new Map<string, string>();
      for (const issue of issueRows || []) {
        if (issue.issue_type) {
          const list = issueByComplaint.get(issue.complaint_id) || [];
          list.push(issue.issue_type);
          issueByComplaint.set(issue.complaint_id, list);
        }
        if (issue.status) {
          issueStatusByComplaint.set(issue.complaint_id, issue.status);
        }
      }

      const workLinkByComplaint = new Map<string, { orderId: string; officerId: string | null; status: string | null }>();
      for (const link of (orderLinks || []) as Array<Record<string, unknown>>) {
        const wo = (link.department_work_orders || {}) as Record<string, unknown>;
        workLinkByComplaint.set(String(link.complaint_id), {
          orderId: String(link.order_id),
          officerId: wo.officer_id ? String(wo.officer_id) : null,
          status: wo.status ? String(wo.status) : null,
        });
      }

      // Build cases exclusively from live Supabase complaints with stable UUID identity (never raw text fallback)
      const liveCases: StoredCase[] = [];
      const seenCaseNumbers = new Set<string>();

      for (const row of data) {
        const refNumber = row.reference_number || `KHI-2026-${row.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
        let caseNum = refNumber;
        if (seenCaseNumbers.has(caseNum)) {
          caseNum = `${refNumber}-${row.id.slice(0, 4).toUpperCase()}`;
        }
        seenCaseNumbers.add(caseNum);

        const sanitizedText =
          row.sanitized_description ||
          row.factual_summary ||
          row.generated_heading ||
          row.title ||
          'Sanitized summary unavailable.';

        const newReport: CaseReportRow = {
          complaintId: row.id,
          referenceNumber: refNumber,
          submittedAt: row.created_at || new Date().toISOString(),
          updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
          status: row.status || 'assigned',
          sanitizedNarrativePreview: sanitizedText,
          publicLocation: row.incident_public_location || row.incident_locality || 'Karachi',
          linkState: 'linked',
          linkMethod: workLinkByComplaint.has(row.id) ? 'manual_staff' : undefined,
          uniquePersonId: row.citizen_id ? `citizen-${row.citizen_id.slice(0, 8)}` : `guest-${row.id.slice(0, 8)}`,
        };

        const locality = row.incident_locality || 'General';
        const linkedWork = workLinkByComplaint.get(row.id);
        const deptIssueStatus = issueStatusByComplaint.get(row.id);

        let initialStatus: 'needs_acceptance' | 'accepted' | 'in_progress' | 'completed' = 'needs_acceptance';
        if (row.status === 'resolved' || row.status === 'rejected' || deptIssueStatus === 'resolved') {
          initialStatus = 'completed';
        } else if (linkedWork || row.status === 'in_progress' || deptIssueStatus === 'in_progress') {
          initialStatus = 'in_progress';
        } else if (row.status === 'accepted' || deptIssueStatus === 'accepted') {
          initialStatus = 'accepted';
        }

        const issueList = issueByComplaint.get(row.id) || [];
        const createdMs = row.created_at ? new Date(row.created_at).getTime() : Date.now();
        const ageDays = Number.isFinite(createdMs) ? Math.max(0, Math.floor((Date.now() - createdMs) / 86400000)) : 0;

        liveCases.push({
          id: row.id,
          caseNumber: caseNum,
          departmentId: deptId,
          title: row.generated_heading || row.title || 'Citizen Public Report',
          issueFamily: 'Municipal Infrastructure',
          issueSubtype: issueList[0] || 'General',
          publicPlace: row.incident_public_location || locality,
          district: row.incident_district || 'District East',
          locality,
          workStatus: initialStatus,
          linkedReportCount: 1,
          uniqueReporterCount: 1,
          pendingAcceptanceCount: (row.status === 'assigned' || row.status === 'submitted') && !linkedWork ? 1 : 0,
          priority: (row.manual_priority as PriorityBand) || 'normal',
          priorityReason: row.manual_priority_reason || 'Live submission received from citizen portal.',
          firstReportedAt: newReport.submittedAt,
          lastReportedAt: newReport.updatedAt,
          oldestPendingAt: newReport.submittedAt,
          ageDays,
          assignedStaffId: linkedWork?.officerId || null,
          assignedStaffLabel: linkedWork?.officerId ? 'Assigned officer' : 'Unassigned',
          summary: row.factual_summary || sanitizedText,
          version: 1,
          reports: [newReport],
          activity: [
            {
              id: `act-live-${row.id}`,
              caseId: row.id,
              eventType: 'created',
              label: 'Complaint submitted',
              detail: `Citizen submitted independent complaint ${refNumber}.`,
              actorLabel: 'Citizen Portal',
              createdAt: newReport.submittedAt,
              formattedWhen: newReport.submittedAt,
            },
          ],
        });
      }

      this.casesByDept.set(deptId, liveCases);
    } catch (error) {
      // Local demonstrations can still show clearly labeled sample cases.
      // Production must never disguise a failed secure fetch as an empty inbox.
      if (!this.isDemonstrationWorkspace()) throw error;
    }
  }

  // --- API IMPLEMENTATION ---

  async listDepartmentCases(
    deptId: DepartmentId,
    filter: WorkQueueFilter
  ): Promise<CursorPage<IncidentCaseSummary>> {
    await this.syncWithSupabase(deptId);
    const list = this.casesByDept.get(deptId) || [];
    const query = (filter.searchQuery || '').trim().toLowerCase();

    // 1. Filter
    let filtered = list.filter((c) => {
      // Resolved incidents remain searchable in the archive, but do not
      // compete with actionable work in the default queue.
      if (filter.savedView === 'completed') {
        if (c.workStatus !== 'completed') return false;
      } else if (c.workStatus === 'completed') {
        return false;
      }
      // Saved views
      if (filter.savedView === 'needs' && c.pendingAcceptanceCount === 0)
        return false;
      if (
        filter.savedView === 'unassigned' &&
        (c.assignedStaffLabel !== 'Unassigned' ||
          c.workStatus === 'completed')
      )
        return false;
      if (
        filter.savedView === 'mine' &&
        (!filter.actorId || c.assignedStaffId !== filter.actorId)
      )
        return false;

      // Area filter
      if (filter.area && filter.area !== 'All areas' && c.locality !== filter.area)
        return false;

      // Issue filter
      const issueFilter = filter.issueType || (filter as any).issueSubtype;
      if (
        issueFilter &&
        issueFilter !== 'All issues' &&
        c.issueSubtype !== issueFilter
      )
        return false;

      // Query search
      if (query) {
        const matchesCase =
          c.title.toLowerCase().includes(query) ||
          c.locality.toLowerCase().includes(query) ||
          c.publicPlace.toLowerCase().includes(query) ||
          c.caseNumber.toLowerCase().includes(query);
        const matchesRef = c.reports.some((r) =>
          r.referenceNumber.toLowerCase().includes(query)
        );
        if (!matchesCase && !matchesRef) return false;
      }

      return true;
    });

    // 2. Sort
    if (filter.sort === 'oldest') {
      filtered.sort((a, b) => b.ageDays - a.ageDays);
    } else if (filter.sort === 'most_reports') {
      filtered.sort((a, b) => b.linkedReportCount - a.linkedReportCount);
    } else if (filter.sort === 'recently_updated') {
      filtered.sort((a, b) => a.ageDays - b.ageDays);
    } else {
      // Attention first: Critical risk (4), High risk (3), Pending > 0 (2), Others (1)
      const rank = (c: StoredCase) =>
        c.priority === 'critical'
          ? 4
          : c.priority === 'high'
          ? 3
          : c.pendingAcceptanceCount > 0
          ? 2
          : 1;
      filtered.sort((a, b) => rank(b) - rank(a) || b.ageDays - a.ageDays);
    }

    const total = filtered.length;
    const page = Math.max(0, filter.page);
    const pageSize = filter.pageSize || 25;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = page * pageSize;
    const items = filtered.slice(start, start + pageSize);

    return {
      items,
      nextCursor: page + 1 < totalPages ? String(page + 1) : null,
      prevCursor: page > 0 ? String(page - 1) : null,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  async listDepartmentIssueTypes(deptId: DepartmentId): Promise<string[]> {
    await this.syncWithSupabase(deptId);
    return [...new Set((this.casesByDept.get(deptId) || [])
      .map((item) => item.issueSubtype)
      .filter((item): item is string => Boolean(item && item.trim())))].sort();
  }

  async listDepartmentReports(
    deptId: DepartmentId,
    filter: WorkQueueFilter
  ): Promise<
    CursorPage<
      CaseReportRow & { caseId: string; caseTitle: string; area: string }
    >
  > {
    const casePage = await this.listDepartmentCases(deptId, {
      ...filter,
      page: 0,
      pageSize: 1000,
    });

    const allReports = casePage.items.flatMap((c) => {
      const stored = (this.casesByDept.get(deptId) || []).find(
        (sc) => sc.id === c.id
      );
      if (!stored) return [];
      return stored.reports.map((r) => ({
        ...r,
        caseId: c.id,
        caseTitle: c.title,
        area: c.locality,
      }));
    });

    allReports.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

    const total = allReports.length;
    const page = Math.max(0, filter.page);
    const pageSize = filter.pageSize || 25;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = page * pageSize;
    const items = allReports.slice(start, start + pageSize);

    return {
      items,
      nextCursor: page + 1 < totalPages ? String(page + 1) : null,
      prevCursor: page > 0 ? String(page - 1) : null,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  async getCaseDetail(caseId: string): Promise<IncidentCaseSummary | null> {
    for (const list of this.casesByDept.values()) {
      const found = list.find(
        (c) =>
          c.id === caseId ||
          c.caseNumber === caseId ||
          c.reports.some((r) => r.complaintId === caseId || r.referenceNumber === caseId)
      );
      if (found) return found;
    }
    return null;
  }

  async listCaseReports(
    caseId: string,
    search = '',
    page = 0,
    pageSize = 10
  ): Promise<CursorPage<CaseReportRow>> {
    let found: StoredCase | undefined;
    for (const list of this.casesByDept.values()) {
      found = list.find(
        (c) =>
          c.id === caseId ||
          c.caseNumber === caseId ||
          c.reports.some((r) => r.complaintId === caseId || r.referenceNumber === caseId)
      );
      if (found) break;
    }
    if (!found) {
      return {
        items: [],
        nextCursor: null,
        prevCursor: null,
        total: 0,
        page: 0,
        pageSize,
        totalPages: 1,
      };
    }

    const q = search.trim().toLowerCase();
    const filtered = found.reports.filter(
      (r) =>
        !q ||
        r.referenceNumber.toLowerCase().includes(q) ||
        r.sanitizedNarrativePreview.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q)
    );

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(Math.max(0, page), totalPages - 1);
    const start = safePage * pageSize;
    const items = filtered.slice(start, start + pageSize);

    return {
      items,
      nextCursor: safePage + 1 < totalPages ? String(safePage + 1) : null,
      prevCursor: safePage > 0 ? String(safePage - 1) : null,
      total,
      page: safePage,
      pageSize,
      totalPages,
    };
  }

  async listCaseActivity(caseId: string): Promise<CaseActivityEvent[]> {
    for (const list of this.casesByDept.values()) {
      const found = list.find((c) => c.id === caseId || c.caseNumber === caseId);
      if (found) return [...found.activity].reverse();
    }
    return [];
  }

  async listAreaWorkload(deptId: DepartmentId): Promise<AreaWorkloadSummary[]> {
    await this.syncWithSupabase(deptId);
    const list = this.casesByDept.get(deptId) || [];
    // Use actual case localities. A static seven-area list hid real reports
    // from any new Karachi locality and produced misleading zero rows.
    const areas = [...new Set(list.map((item) => item.locality).filter(Boolean))];

    return areas
      .map((area) => {
        const areaCases = list.filter((c) => c.locality === area);
        const activeCases = areaCases.filter(
          (c) => c.workStatus !== 'completed'
        );
        const reportsCount = areaCases.reduce(
          (sum, c) => sum + c.linkedReportCount,
          0
        );
        const urgentCount = areaCases.filter(
          (c) => c.priority === 'critical' && c.workStatus !== 'completed'
        ).length;
        const oldestWait = activeCases.length
          ? Math.max(...activeCases.map((c) => c.ageDays))
          : 0;

        const issueFreq = new Map<string, number>();
        areaCases.forEach((c) => {
          issueFreq.set(
            c.issueSubtype,
            (issueFreq.get(c.issueSubtype) || 0) + 1
          );
        });

        const topIssues = Array.from(issueFreq.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2)
          .map(([iss]) => iss);

        return {
          area,
          activeCasesCount: activeCases.length,
          linkedReportsCount: reportsCount,
          urgentCasesCount: urgentCount,
          oldestWaitDays: oldestWait,
          topIssues,
        };
      })
      .sort((a, b) => b.activeCasesCount - a.activeCasesCount);
  }

  async previewBulkAcceptance(caseId: string): Promise<BulkAcceptPreview> {
    let found: StoredCase | undefined;
    for (const list of this.casesByDept.values()) {
      found = list.find((c) => c.id === caseId || c.caseNumber === caseId);
      if (found) break;
    }

    if (!found) {
      throw new Error(`Incident case ${caseId} not found.`);
    }

    // Live staff acceptance is allowed only after authoritative assignment.
    // Seeded offline examples may also contain pre-assignment submissions.
    const live = isSupabaseConfigured() && Boolean(supabase);
    const eligible = found.reports.filter(
      (r) => r.status === 'assigned' || (!live && r.status === 'submitted')
    ).length;

    const byExcludedStatus: Partial<Record<ComplaintStatus, number>> = {};
    found.reports.forEach((r) => {
      if (r.status !== 'assigned' && (live || r.status !== 'submitted')) {
        byExcludedStatus[r.status] = (byExcludedStatus[r.status] || 0) + 1;
      }
    });

    return {
      caseId: found.id,
      caseNumber: found.caseNumber,
      caseTitle: found.title,
      caseVersion: found.version,
      totalLinked: found.reports.length,
      eligible,
      byExcludedStatus,
      userCanAccept: eligible > 0,
      requiredConfirmationLabel: `Accept ${eligible} eligible reports`,
    };
  }

  async executeBulkAcceptance(
    caseId: string,
    idempotencyKey: string
  ): Promise<BulkAcceptResult> {
    const opKey = `${caseId}:${idempotencyKey}`;
    const cached = this.batchOperations.get(opKey);
    if (cached) {
      return { ...cached, idempotentReplay: true };
    }

    let found: StoredCase | undefined;
    for (const list of this.casesByDept.values()) {
      found = list.find((c) => c.id === caseId || c.caseNumber === caseId);
      if (found) break;
    }

    if (!found) {
      throw new Error(`Incident case ${caseId} not found.`);
    }

    const live = isSupabaseConfigured() && Boolean(supabase);
    const eligibleReports = found.reports.filter(
      (report) => report.status === 'assigned' || (!live && report.status === 'submitted')
    );

    // A single database function owns authorization, row locks, all per-report
    // status/timeline/outbox writes, and idempotency. A failed call rolls back
    // the entire batch; never commit just the first N reports.
    if (live && supabase) {
      if (eligibleReports.length === 0) {
        throw new Error('This complaint is not awaiting acceptance.');
      }
      if (eligibleReports.length > 1) {
        throw new Error('Unconfirmed multi-report batch acceptance is disabled in V16. Assign or review complaints individually.');
      }
      const { data, error } = await supabase.rpc('staff_accept_department_report_batch', {
        p_department_id: found.departmentId,
        p_complaint_ids: eligibleReports.map((report) => report.complaintId),
        p_idempotency_key: idempotencyKey,
      });
      if (error || !data?.success || data.acceptedCount !== eligibleReports.length) {
        throw new Error('Atomic acceptance was not confirmed. Refresh the complaint and retry with the same operation key.');
      }
    } else if (!this.isDemonstrationWorkspace()) {
      throw new Error('Secure case acceptance is unavailable without a live department connection.');
    } else if (eligibleReports.length > 1) {
      throw new Error('Unconfirmed multi-report batch acceptance is disabled in V16. Assign or review complaints individually.');
    }

    let acceptedCount = 0;
    let skippedCount = 0;
    const unchangedRefs: string[] = [];

    // Mutate reports atomically
    found.reports.forEach((r) => {
      if (r.status === 'assigned' || (!live && r.status === 'submitted')) {
        r.status = 'accepted';
        r.updatedAt = new Date().toISOString();
        acceptedCount++;
      } else {
        skippedCount++;
        unchangedRefs.push(r.referenceNumber);
      }
    });

    // Update parent case
    found.pendingAcceptanceCount = 0;
    found.workStatus = 'accepted';
    found.version += 1;

    // Append case activity event
    const nowPkt = new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Karachi',
      hour12: true,
    })
      .format(new Date())
      .replace(',', ' · ') + ' PKT';

    found.activity.push({
      id: `act-bulk-${Date.now()}`,
      caseId: found.id,
      eventType: 'accepted',
      label: `${acceptedCount} reports accepted`,
      detail: `Operator confirmed batch acknowledgement for ${acceptedCount} eligible reports (${skippedCount} unchanged). Individual citizen timelines updated.`,
      actorLabel: 'Department Staff',
      createdAt: new Date().toISOString(),
      formattedWhen: nowPkt,
    });

    const result: BulkAcceptResult = {
      operationId: `op-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      idempotentReplay: false,
      caseId: found.id,
      caseVersion: found.version,
      totalLinked: found.reports.length,
      accepted: acceptedCount,
      skippedIneligible: skippedCount,
      unchangedReferences: unchangedRefs,
      completedAt: new Date().toISOString(),
    };

    this.batchOperations.set(opKey, result);

    return result;
  }

  async getCaseById(caseId: string): Promise<IncidentCaseSummary | null> {
    return this.getCaseDetail(caseId);
  }

  async listCases(deptId: DepartmentId, filter: WorkQueueFilter): Promise<CursorPage<IncidentCaseSummary>> {
    return this.listDepartmentCases(deptId, filter);
  }

  async getCaseActivity(caseId: string): Promise<CaseActivityEvent[]> {
    return this.listCaseActivity(caseId);
  }

  async getDepartmentWorkSummary(deptId: DepartmentId): Promise<{
    departmentId: DepartmentId;
    totalCases: number;
    totalReports: number;
    casesNeedingResponse: number;
    casesAccepted: number;
    reportsAwaitingAck: number;
    casesInProgress: number;
    casesCompleted: number;
    casesUnassigned: number;
    urgentCases: number;
    awaitingAcceptance: number;
  }> {
    await this.syncWithSupabase(deptId);
    const list = this.casesByDept.get(deptId) || [];
    const active = list.filter((c) => c.workStatus !== 'completed');
    const totalReports = list.reduce((s, c) => s + c.linkedReportCount, 0);
    const awaitingAcceptance = active.reduce(
      (s, c) => s + c.pendingAcceptanceCount,
      0
    );
    const casesNeedingResponse = active.filter(
      (c) => c.workStatus === 'needs_acceptance'
    ).length;
    const casesAccepted = active.filter(
      (c) => c.workStatus === 'accepted'
    ).length;
    const casesInProgress = active.filter(
      (c) => c.workStatus === 'in_progress'
    ).length;
    const casesCompleted = list.filter(
      (c) => c.workStatus === 'completed'
    ).length;
    const casesUnassigned = active.filter(
      (c) => !c.assignedStaffId || c.assignedStaffLabel === 'Unassigned'
    ).length;
    const urgentCases = active.filter((c) => c.priority === 'critical').length;

    return {
      departmentId: deptId,
      totalCases: list.length,
      totalReports,
      casesNeedingResponse,
      casesAccepted,
      reportsAwaitingAck: awaitingAcceptance,
      casesInProgress,
      casesCompleted,
      casesUnassigned,
      urgentCases,
      awaitingAcceptance,
    };
  }

  async getDepartmentComplaintViews(
    deptId: DepartmentId
  ): Promise<import('../types').DepartmentComplaintView[]> {
    await this.syncWithSupabase(deptId);
    const list = this.casesByDept.get(deptId) || [];
    const views: import('../types').DepartmentComplaintView[] = [];

    for (const c of list) {
      for (const r of c.reports) {
        const isUrgent = c.priority === 'critical' || c.priority === 'high';
        let complaintStatus: ComplaintStatus = 'assigned';
        if (r.status === 'in_progress') complaintStatus = 'in_progress';
        else if (r.status === 'accepted') complaintStatus = 'accepted';
        else if (r.status === 'resolved') complaintStatus = 'resolved';
        else if (r.status === 'rejected') complaintStatus = 'rejected';
        else if (r.status === 'under_review') complaintStatus = 'under_review';
        else complaintStatus = 'assigned';

        views.push({
          id: r.complaintId,
          referenceNumber: r.referenceNumber,
          district: (c.district as any) || 'District East',
          locality: c.locality,
          publicLocation: r.publicLocation || c.publicPlace,
          title: c.title,
          description: r.sanitizedNarrativePreview,
          sanitizedDescription: r.sanitizedNarrativePreview,
          generatedHeading: c.title,
          factualSummary: c.summary,
          status: complaintStatus,
          assignedDepartmentId: deptId,
          assignedDepartmentIds: [deptId],
          detectedLanguage: 'roman_urdu',
          submittedAt: r.submittedAt,
          updatedAt: r.updatedAt,
          hasHazard: isUrgent,
          manualPriority: isUrgent ? (c.priority as any) : undefined,
          manualPriorityReason: isUrgent ? c.priorityReason : undefined,
          timeline: [],
          isDemonstration: this.isDemonstrationWorkspace(),
        });
      }
    }

    views.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
    return views;
  }

  /**
   * V16 Head period overview metrics computed strictly using distinct complaint IDs
   * received within Asia/Karachi calendar boundaries whose status is active.
   */
  async getHeadPeriodOverview(
    deptId: DepartmentId,
    period: HeadOverviewPeriod,
    orders: Array<{ anchor_complaint_id: string; status: string }> = [],
    orderLinksMap?: Map<string, Array<{ complaint_id: string }>>
  ): Promise<HeadPeriodOverview> {
    await this.syncWithSupabase(deptId);
    const list = this.casesByDept.get(deptId) || [];
    const { startMs, endMs } = getPktPeriodBounds(period);

    const orderStatusByComplaint = new Map<string, string>();
    for (const order of orders) {
      orderStatusByComplaint.set(order.anchor_complaint_id, order.status);
      const linked = orderLinksMap?.get((order as unknown as { id?: string }).id || '');
      if (linked) {
        for (const item of linked) {
          orderStatusByComplaint.set(item.complaint_id, order.status);
        }
      }
    }

    const seenIds = new Set<string>();
    let newComplaints = 0;
    let underReview = 0;
    let inProgress = 0;
    let awaitingVerification = 0;

    for (const item of list) {
      const report = item.reports[0];
      const complaintId = report?.complaintId || item.id;
      if (seenIds.has(complaintId)) continue;

      const status = report?.status || (item.workStatus === 'completed' ? 'resolved' : 'assigned');
      if (status === 'resolved' || status === 'rejected' || item.workStatus === 'completed') {
        continue;
      }

      const ts = new Date(item.firstReportedAt).getTime();
      if (!Number.isFinite(ts) || ts < startMs || ts > endMs) continue;
      seenIds.add(complaintId);

      const woStatus = orderStatusByComplaint.get(complaintId);
      if (woStatus === 'pending_review') {
        awaitingVerification += 1;
      } else if (
        status === 'in_progress' ||
        item.workStatus === 'in_progress' ||
        woStatus === 'assigned' ||
        woStatus === 'in_progress' ||
        woStatus === 'returned'
      ) {
        inProgress += 1;
      } else if (status === 'under_review' || status === 'accepted' || item.workStatus === 'accepted') {
        underReview += 1;
      } else {
        newComplaints += 1;
      }
    }

    return {
      period,
      totalActive: newComplaints + underReview + inProgress + awaitingVerification,
      newComplaints,
      underReview,
      inProgress,
      awaitingVerification,
    };
  }

  /**
   * V16 flat independent incoming & active complaint rows for Head triage and detail reading.
   */
  async listIndependentComplaintsForHead(
    deptId: DepartmentId,
    options: {
      period?: ComplaintsDateFilter;
      area?: string;
      searchQuery?: string;
      includeResolved?: boolean;
      orders?: Array<{ id: string; anchor_complaint_id: string; officer_id: string; status: string }>;
      orderLinksMap?: Map<string, Array<{ complaint_id: string }>>;
      officerNames?: Map<string, string>;
    } = {}
  ): Promise<HeadIndependentComplaintRow[]> {
    await this.syncWithSupabase(deptId);
    const list = this.casesByDept.get(deptId) || [];
    const period = options.period ?? 'today';
    const { startMs, endMs } = getPktPeriodBounds(period);
    const areaFilter = options.area && options.area !== 'All areas' ? options.area : null;
    const query = (options.searchQuery || '').trim().toLowerCase();

    const orderMetaByComplaint = new Map<string, { orderId: string; status: string; officerId: string }>();
    for (const order of options.orders || []) {
      orderMetaByComplaint.set(order.anchor_complaint_id, {
        orderId: order.id,
        status: order.status,
        officerId: order.officer_id,
      });
      const linked = options.orderLinksMap?.get(order.id);
      if (linked) {
        for (const item of linked) {
          orderMetaByComplaint.set(item.complaint_id, {
            orderId: order.id,
            status: order.status,
            officerId: order.officer_id,
          });
        }
      }
    }

    const seenIds = new Set<string>();
    const rows: HeadIndependentComplaintRow[] = [];

    for (const item of list) {
      const report = item.reports[0];
      const complaintId = report?.complaintId || item.id;
      if (seenIds.has(complaintId)) continue;
      seenIds.add(complaintId);

      const status = report?.status || 'assigned';
      if (!options.includeResolved && (status === 'resolved' || status === 'rejected' || item.workStatus === 'completed')) {
        continue;
      }

      const ts = new Date(item.firstReportedAt).getTime();
      if (period !== 'all' && (!Number.isFinite(ts) || ts < startMs || ts > endMs)) {
        continue;
      }

      if (areaFilter && item.locality !== areaFilter) {
        continue;
      }

      const ref = report?.referenceNumber || item.caseNumber;
      const heading = item.title;
      const sanitizedText = report?.sanitizedNarrativePreview || item.summary;
      if (query) {
        const haystack = `${heading} ${ref} ${item.locality} ${item.publicPlace}`.toLowerCase();
        if (!haystack.includes(query)) continue;
      }

      const wo = orderMetaByComplaint.get(complaintId);
      rows.push({
        id: complaintId,
        referenceNumber: ref,
        heading,
        sanitizedText,
        factualSummary: item.summary,
        locality: item.locality,
        publicPlace: item.publicPlace,
        district: item.district,
        issueTypes: [item.issueSubtype],
        status,
        workOrderStatus: (wo?.status as HeadIndependentComplaintRow['workOrderStatus']) ?? null,
        workOrderId: wo?.orderId ?? null,
        assignedOfficerId: wo?.officerId ?? item.assignedStaffId,
        assignedOfficerName: wo?.officerId ? options.officerNames?.get(wo.officerId) || null : null,
        submittedAt: item.firstReportedAt,
        updatedAt: item.lastReportedAt,
        priority: item.priority,
      });
    }

    rows.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
    return rows;
  }
}

export const caseOperationsService = new CaseOperationsService();
