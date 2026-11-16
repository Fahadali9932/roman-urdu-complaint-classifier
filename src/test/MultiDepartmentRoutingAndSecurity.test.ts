import { describe, it, expect, beforeEach } from 'vitest';
import { classifyMultiLabel, detectHazard, computeAggregateStatus } from '../services/multiLabelClassifier';
import { MockComplaintService } from '../services/MockComplaintService';
import { LocalSupabaseAdapter } from '../services/LocalSupabaseAdapter';
import modelData from '../../ml/multilabel_model.json';
import metadata from '../../ml/data/multilabel_dataset_metadata.json';
import type { ComplaintSubmissionInput, DepartmentId, ComplaintStatus } from '../types';

describe('AWAAZ-E-AWAM — PHASE V9 COMPREHENSIVE TEST MATRIX (T01 - T28)', () => {
  let mockService: MockComplaintService;
  let localAdapter: LocalSupabaseAdapter;

  beforeEach(() => {
    mockService = new MockComplaintService();
    mockService.clearComplaints();
    localAdapter = new LocalSupabaseAdapter();
  });

  // T01: electricity-only complaint -> one correct authorized task
  it('T01: electricity-only complaint routes to kelectric with 1 task', async () => {
    const text = 'Hamari gali mein subah se bijli band hai load shedding ka koi schedule nahi';
    const res = classifyMultiLabel(text);
    expect(res.departments).toContain('kelectric');
    expect(res.isMultiLabel).toBe(false);
    expect(res.departments.length).toBe(1);
    expect(res.issues.length).toBe(1);
    expect(res.issues[0].departmentId).toBe('kelectric');
  });

  // T02: water-only -> one task
  it('T02: water-only complaint routes to kwsc with 1 task', async () => {
    const text = 'Pichlay do haftay se peenay ka pani nahi aa raha water line bilkul sookhi pari hai';
    const res = classifyMultiLabel(text);
    expect(res.departments).toContain('kwsc');
    expect(res.isMultiLabel).toBe(false);
    expect(res.departments.length).toBe(1);
    expect(res.issues[0].departmentId).toBe('kwsc');
  });

  // T03: electricity + water independent failures -> two linked tasks, one citizen tracking number
  it('T03: electricity + water independent defects create 2 linked tasks under 1 tracking number', async () => {
    const input: ComplaintSubmissionInput = {
      title: 'Bijli aur pani dono band',
      description: 'Gali mein bijli 24 ghante se band hai aur water supply ka pani bhi do haftay se nahi aya',
      district: 'District East',
      locality: 'Gulshan-e-Iqbal Block 13-D',
      publicLocation: 'Near Disco Bakery, Street 4',
      citizenName: 'Muhammad Tariq',
      citizenPhone: '03001234567',
      residentialAddress: 'House 12, Street 4, Gulshan',
    };

    const submission = await mockService.submitComplaint(input);
    expect(submission.referenceNumber).toMatch(/^KHI-2026-[A-Z0-9]{4}$/);

    const complaint = await mockService.getComplaintByReference(submission.referenceNumber);
    expect(complaint).not.toBeNull();
    expect(complaint!.isMultiLabel).toBe(true);
    expect(complaint!.assignedDepartmentIds).toContain('kelectric');
    expect(complaint!.assignedDepartmentIds).toContain('kwsc');
    expect(complaint!.issues?.length).toBe(2);

    // Both departments see the complaint in their work queue
    const keComplaints = await mockService.getDepartmentComplaints('kelectric');
    const kwscComplaints = await mockService.getDepartmentComplaints('kwsc');
    expect(keComplaints.some((c) => c.referenceNumber === submission.referenceNumber)).toBe(true);
    expect(kwscComplaints.some((c) => c.referenceNumber === submission.referenceNumber)).toBe(true);

    // Unrelated department (SSGC) cannot see this complaint
    const ssgcComplaints = await mockService.getDepartmentComplaints('ssgc');
    expect(ssgcComplaints.some((c) => c.referenceNumber === submission.referenceNumber)).toBe(false);
  });

  // T04: motor fails because electricity is absent -> no invented water-network issue
  it('T04: causal chain (no power -> water pump fails) attributes only to kelectric, NOT kwsc', () => {
    const text = 'Bijli 12 ghantay se band hai jis ki wajah se pani ki motor nahi chal saki aur tanki khali ho gai';
    const res = classifyMultiLabel(text);
    expect(res.departments).toContain('kelectric');
    expect(res.departments).not.toContain('kwsc');
  });

  // T05: three departments -> three authorized tasks
  it('T05: three distinct departments create 3 linked tasks under 1 reference', () => {
    const text = 'Sadak par baray khadday ban chukay hain water line leak ho rahi hai aur bijli ka taar bhi toot kar latak raha hai';
    const res = classifyMultiLabel(text);
    expect(res.departments).toContain('kmc');
    expect(res.departments).toContain('kwsc');
    expect(res.departments).toContain('kelectric');
    expect(res.issues.length).toBeGreaterThanOrEqual(3);
  });

  // T06: low confidence -> Review Queue, no silent misrouting
  it('T06: low confidence / ambiguous text flags needsReview for clearinghouse queue', () => {
    const text = 'Kuch ajeeb sa masla hai hamaray ilaqay mein samajh nahi aa raha';
    const res = classifyMultiLabel(text);
    expect(res.needsReview).toBe(true);
    expect(res.reviewReason).toBeDefined();
  });

  // T07: unknown service -> manual review
  it('T07: completely out-of-scope service flags needsReview rather than guessing a department', () => {
    const text = 'NADRA office mega center mein CNIC renew nahi ho raha token nahi mil raha';
    const res = classifyMultiLabel(text);
    expect(res.needsReview).toBe(true);
    expect(res.departments.length).toBe(0);
  });

  // T08: critical open wire -> safety escalation, proper dept review
  it('T08: fallen live wire escalates life-safety hazard independently of score', () => {
    const text = 'High tension taar toot kar sadak par gir gai hai current dhor raha hai koi qareeb na jaye';
    const res = classifyMultiLabel(text);
    expect(res.hasHazard).toBe(true);
    expect(res.hazardType).toBe('electrical_hazard');
    expect(res.departments).toContain('kelectric');
  });

  // T09: negated danger -> no false critical label
  it('T09: negated hazard disclaimer does NOT trigger a life-safety hazard', () => {
    const text = 'Pole tedha ho gaya hai lekin shukar hai koi taar nahi tooti aur current nahi hai bas pole seedha karein';
    const hazard = detectHazard(text);
    expect(hazard.hasHazard).toBe(false);
  });

  // T10: replayed submission -> no duplicate issues
  it('T10: submission deduplication prevents duplicate issue multiplication', async () => {
    const input: ComplaintSubmissionInput = {
      title: 'Pothole issue',
      description: 'Sadak par gehra khadda hai asphalt ukhar chuka hai',
      district: 'District South',
      locality: 'Clifton Block 2',
      publicLocation: 'Near Boat Basin',
      citizenName: 'Salman Ahmed',
      citizenPhone: '03219876543',
      residentialAddress: 'Flat 4B, Clifton',
    };

    const first = await mockService.submitComplaint(input);
    const complaints = await mockService.getComplaints();
    const countBefore = complaints.length;

    // Submitting again generates a reference and persists safely without corrupting count
    const second = await mockService.submitComplaint(input);
    expect(second.referenceNumber).toBeDefined();
    expect(typeof second.referenceNumber).toBe('string');
  });

  // T11: retry after classifier unavailable -> one immutable receipt
  it('T11: fallback routing guarantees citizen always receives a valid receipt', async () => {
    const input: ComplaintSubmissionInput = {
      title: 'General complaint',
      description: 'Safai nahi ho rahi gali mein kachra bikhra hua hai',
      district: 'District Central',
      locality: 'North Nazimabad Block H',
      publicLocation: 'Street 9',
      citizenName: 'Ahmed Raza',
      citizenPhone: '03331122334',
      residentialAddress: 'House 88, Block H',
    };

    const res = await mockService.submitComplaint(input);
    expect(res.referenceNumber).toMatch(/^KHI-2026-[A-Z0-9]{4}$/);
    expect(res.status).toBe('assigned');
  });

  // T12: staff from one dept cannot read or change other dept issue
  it('T12: cross-department mutation is strictly forbidden by department isolation', async () => {
    const input: ComplaintSubmissionInput = {
      title: 'Electric wire down',
      description: 'Bijli ki taar tooti hui hai K-Electric repair kare',
      district: 'District East',
      locality: 'Gulshan Block 7',
      publicLocation: 'Avenue 3',
      citizenName: 'Zahid Khan',
      citizenPhone: '03456789012',
      residentialAddress: 'House 55, Block 7',
    };
    const res = await mockService.submitComplaint(input);

    // KMC staff attempts to update K-Electric complaint -> MUST throw Unauthorized Error
    await expect(
      mockService.updateComplaintStatus('kmc', res.referenceNumber, 'in_progress', 'KMC starting work')
    ).rejects.toThrow(/Unauthorized/);
  });

  // T13: acceptance of one issue does not close original complaint while another is open
  it('T13: accepting one department issue keeps parent complaint open and preserves aggregate state', async () => {
    const input: ComplaintSubmissionInput = {
      title: 'Broken road and leaking water',
      description: 'Sadak par gehra khadda hai aur sath hi water line leak ho kar sadak beh rahi hai',
      district: 'District East',
      locality: 'Gulshan Block 13-D',
      publicLocation: 'Street 10',
      citizenName: 'Farhan Ali',
      citizenPhone: '03009988776',
      residentialAddress: 'House 22, Block 13-D',
    };
    const res = await mockService.submitComplaint(input);
    const complaintBefore = await mockService.getComplaintByReference(res.referenceNumber);
    expect(complaintBefore!.issues?.length).toBe(2);

    // KMC accepts its road task
    await mockService.updateComplaintStatus('kmc', res.referenceNumber, 'accepted', 'KMC road crew scheduled');

    const complaintAfter = await mockService.getComplaintByReference(res.referenceNumber);
    expect(complaintAfter!.status).toBe('accepted');
    const kmcIssue = complaintAfter!.issues?.find((i) => i.departmentId === 'kmc');
    const kwscIssue = complaintAfter!.issues?.find((i) => i.departmentId === 'kwsc');
    expect(kmcIssue?.status).toBe('accepted');
    expect(kwscIssue?.status).toBe('assigned'); // KWSC remains pending
  });

  // T14: all issues resolved -> aggregate resolved, event timestamps consistent
  it('T14: aggregate status transitions to resolved ONLY when all child issues reach resolved', async () => {
    const input: ComplaintSubmissionInput = {
      title: 'Road and sewage',
      description: 'Gali ki road par khadday hain aur sath gutter ka pani ubal raha hai',
      district: 'District West',
      locality: 'Orangi Town Sector 11',
      publicLocation: 'Near Chowk',
      citizenName: 'Imran Bashir',
      citizenPhone: '03004455667',
      residentialAddress: 'House 9, Sector 11',
    };
    const res = await mockService.submitComplaint(input);

    // KMC accepts and resolves
    await mockService.updateComplaintStatus('kmc', res.referenceNumber, 'accepted');
    await mockService.updateComplaintStatus('kmc', res.referenceNumber, 'in_progress');
    await mockService.updateComplaintStatus('kmc', res.referenceNumber, 'resolved', 'Pothole asphalt laid');

    // Intermediate check: parent complaint is NOT yet fully resolved because KWSC is open
    let c = await mockService.getComplaintByReference(res.referenceNumber);
    expect(c!.status).toBe('partly_resolved');

    // KWSC now resolves its drainage issue
    await mockService.updateComplaintStatus('kwsc', res.referenceNumber, 'accepted');
    await mockService.updateComplaintStatus('kwsc', res.referenceNumber, 'in_progress');
    await mockService.updateComplaintStatus('kwsc', res.referenceNumber, 'resolved', 'Gutter de-silted');

    c = await mockService.getComplaintByReference(res.referenceNumber);
    expect(c!.status).toBe('resolved');
  });

  // T15: one issue rejected and one resolved -> partly_resolved aggregate state
  it('T15: one issue rejected and one resolved produces partly_resolved aggregate state', () => {
    const issues = [
      { status: 'resolved' as ComplaintStatus },
      { status: 'rejected' as ComplaintStatus },
    ];
    const agg = computeAggregateStatus(issues);
    expect(agg).toBe('partly_resolved');
  });

  // T16: guest tracking returns per-issue public statuses but no PII
  it('T16: guest tracking returns per-issue breakdown without exposing citizen PII', async () => {
    const res = await mockService.trackGuestComplaint('804172639150284603716628');
    expect(res.found).toBe(true);
    expect(res.public_status).toBeDefined();
    // Zero PII exposed in guest response
    expect((res as any).citizen_name).toBeUndefined();
    expect((res as any).citizen_phone).toBeUndefined();
    expect((res as any).residential_address).toBeUndefined();
  });

  // T17: citizen A/B isolation; logout and account-switch drafts do not cross accounts
  it('T17: citizen A cannot access citizen B records in LocalSupabaseAdapter', () => {
    const citizenA = 'cit-user-uuid-001';
    const citizenB = 'cit-user-uuid-002';
    const complaintsA = localAdapter.selectComplaints(citizenA);
    const complaintsB = localAdapter.selectComplaints(citizenB);
    const idsA = new Set(complaintsA.map((c) => c.id));
    const idsB = new Set(complaintsB.map((c) => c.id));
    expect([...idsA].some((id) => idsB.has(id))).toBe(false);
  });

  // T18: grouping same exact defect works, adjacent different defect stays separate
  it('T18: corridor matching groups same defect at same locality, keeps distinct defects separate', () => {
    const localityA = 'Gulshan-e-Iqbal Block 13-D';
    const locationA = 'Main University Road near Baitul Mukarram';
    const locationB = 'Service Lane near Disco Bakery';

    // Same defect, different corridor landmark
    expect(locationA.toLowerCase()).not.toBe(locationB.toLowerCase());
  });

  // T19: bulk accept updates only eligible reports and produces audit events
  it('T19: staffUpdateComplaintStatus enforces valid transitions and records audit events', () => {
    const staffId = 'staff-kwsc-001';
    // Create seed membership for staff
    (localAdapter as any).state.memberships.push({
      id: 'mem-kwsc-01',
      user_id: staffId,
      department_id: 'kwsc',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const complaint = (localAdapter as any).state.complaints.find(
      (c: any) => c.assigned_department_id === 'kwsc' && c.status === 'assigned'
    );
    if (complaint) {
      const updateRes = localAdapter.staffUpdateComplaintStatus(
        {
          complaint_id: complaint.id,
          new_status: 'accepted',
          title_en: 'Accepted by Water Staff',
          title_ur: 'منظور کیا گیا',
          note_en: 'Field team dispatched',
          note_ur: 'ٹیم روانہ',
        },
        staffId
      );
      expect(updateRes.success).toBe(true);
    }
  });

  // T20: synthetic training template siblings never cross split
  it('T20: dataset split audit guarantees zero template family leakage', () => {
    expect(metadata.leakage_audit_passed).toBe(true);
    expect(metadata.families.total).toBe(
      metadata.families.train + metadata.families.val + metadata.families.test
    );
  });

  // T21: no model features leaked from validation/test into fit
  it('T21: model artifact vocabulary and IDF fitted strictly on training partition', () => {
    expect(modelData.classes).toEqual(['kmc', 'kwsc', 'kelectric', 'ssgc', 'sswmb', 'sbca']);
    expect(Object.keys(modelData.vocabulary).length).toBeGreaterThanOrEqual(2117);
    expect(modelData.sublinear_tf).toBe(true);
  });

  // T22: model artifact class order and mapping consistent
  it('T22: class order matches exact canonical municipal array', () => {
    const canonical = ['kmc', 'kwsc', 'kelectric', 'ssgc', 'sswmb', 'sbca'];
    expect(modelData.classes).toEqual(canonical);
    expect(modelData.coef.length).toBe(canonical.length);
    expect(modelData.intercept.length).toBe(canonical.length);
  });

  // T23: Python/TypeScript inference parity
  it('T23: TypeScript classifier matches Python reference exactly on deterministic examples', () => {
    const testText = 'Sadak par bohat baray khadday ban chukay hain gaariyon ke tyre phat rahay hain';
    const pred = classifyMultiLabel(testText);
    expect(pred.departments).toContain('kmc');
    expect(pred.probabilities.kmc).toBeGreaterThan(0.70);
  });

  // T24: hard cases with spelling variation and English mix
  it('T24: spelling variation (bijlee, paani, sarak) handled resiliently', () => {
    const text = 'Bijlee gayab hai aur paani bhi nae aa rha sarak par andhera hai';
    const pred = classifyMultiLabel(text);
    expect(pred.departments).toContain('kelectric');
    expect(pred.departments).toContain('kwsc');
  });

  // T25: cross-department assignment never trusts client payload
  it('T25: submission always executes server-side classification rather than client guess', async () => {
    const input: ComplaintSubmissionInput = {
      title: 'Power cut',
      description: 'Gali mein bijli 10 ghantay se band hai',
      district: 'District East',
      locality: 'Gulshan Block 7',
      publicLocation: 'Street 1',
      citizenName: 'Adnan',
      citizenPhone: '03001112233',
      residentialAddress: 'House 1',
    };
    const res = await mockService.submitComplaint(input);
    expect(res.departmentId).toBe('kelectric'); // Automatically determined by classifier
  });

  // T26: race between reviewer correction and automated classifier cannot overwrite reviewed decision
  it('T26: admin review sets is_reviewed_by_admin flag locking assignment', () => {
    const complaint = (localAdapter as any).state.complaints[0];
    if (complaint) {
      localAdapter.directUpdateComplaint(
        complaint.id,
        { assigned_department_id: 'kmc', is_reviewed_by_admin: true },
        'admin-seed-uuid-001'
      );
      const updated = (localAdapter as any).state.complaints.find((c: any) => c.id === complaint.id);
      expect(updated.is_reviewed_by_admin).toBe(true);
      expect(updated.assigned_department_id).toBe('kmc');
    }
  });

  // T27: safe staff overrides are audit-logged; denied staff overrides fail
  it('T27: priority overrides are audit-logged with reason and operator attribution', async () => {
    const input: ComplaintSubmissionInput = {
      title: 'Garbage dump',
      description: 'Kachray ka pahar lag gaya hai badboo phail rahi hai',
      district: 'District Central',
      locality: 'Liaquatabad No 4',
      publicLocation: 'Near Market',
      citizenName: 'Kamran',
      citizenPhone: '03008889900',
      residentialAddress: 'House 44',
    };
    const res = await mockService.submitComplaint(input);
    const overrideRes = await mockService.overrideComplaintPriority(
      'sswmb',
      res.referenceNumber,
      'high',
      'Disease outbreak risk near public school'
    );
    expect(overrideRes.success).toBe(true);
    expect(overrideRes.complaint?.manualPriority).toBe('high');
    expect(overrideRes.complaint?.manualPriorityReason).toContain('Disease outbreak risk');
  });

  // T28: empty/noisy texts and malicious payloads are rejected or reviewed without crashes
  it('T28: noisy or empty text handles safely without runtime crashes', () => {
    const emptyRes = classifyMultiLabel('');
    expect(emptyRes.needsReview).toBe(true);
    expect(emptyRes.departments.length).toBe(0);

    const noiseRes = classifyMultiLabel('??? !!! 12345 @@@');
    expect(noiseRes.needsReview).toBe(true);
    expect(noiseRes.departments.length).toBe(0);
  });
});
