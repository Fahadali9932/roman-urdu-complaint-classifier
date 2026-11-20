import { describe, it, expect } from 'vitest';
import {
  classifyV13_5,
  assessComplaintDraftV13_5,
  resolveComplaintClarificationV13_5,
} from '../services/v13_5/v13_5_engine';
import { LocalV11ComplaintService } from '../services/LocalV11ComplaintService';
import { championV11Model } from '../services/v11InferenceAdapter';

describe('AWAAZ-E-AWAM — Phase V13.5 Two-Department Policy Engine', () => {
  it('allows single department complaint to be auto-routed', () => {
    const text = 'Hamare ghar ke samne bijli ka transformer blast ho gaya hai aur light ghayab hai';
    const result = classifyV13_5(text, championV11Model as any);

    expect(result.twoDeptPolicyTriggered).toBe(false);
    expect(result.isTwoDepartmentCompliant).toBe(true);
    expect(result.needsReview).toBe(false);
    expect(result.departments).toContain('kelectric');
    expect(result.departments.length).toBe(1);
    expect(result.allDetectedDepartments).toEqual(result.departments);
  });

  it('allows dual-department independent complaint to be auto-routed', () => {
    const text = 'Do din se bijli nahi aa rahi aur hamari gali ki road bhi toot gayi hai.';
    const result = classifyV13_5(text, championV11Model as any);

    expect(result.twoDeptPolicyTriggered).toBe(false);
    expect(result.isTwoDepartmentCompliant).toBe(true);
    expect(result.needsReview).toBe(false);
    expect(result.departments).toContain('kelectric');
    expect(result.departments).toContain('kmc');
    expect(result.departments.length).toBe(2);
    expect(result.allDetectedDepartments).toEqual(result.departments);
  });

  it('escalates 3+ independent departments to human triage under policy', () => {
    // 3 clear independent issues: Water (KWSC), Electricity (KE), Gas (SSGC)
    const text = (
      'Mohtaram afsaran, Keamari Jackson Bazaar (District Keamari) mein aik sath teen mukhtalif idaron ke masail hain. ' +
      'Awwal ye ke peenay ke saaf paani ki supply pichle pandrah din se band hai aur tanker mafia se paani lena par raha hai, ' +
      'doyam ye ke bijli ke taar toot kar zameen par gir chuke hain aur live wire se curren lagne ka shadid khatra hai, ' +
      'aur soyam mazeed ye ke gali ke main gas connection mein gas ka low pressure hai jis se geyser aur chulhe thap hain. ' +
      'In teeno alag alag masail ka fori jaeza le kar karrawai farmai jaye.'
    );
    const result = classifyV13_5(text, championV11Model as any);

    expect(result.twoDeptPolicyTriggered).toBe(true);
    expect(result.isTwoDepartmentCompliant).toBe(false);
    expect(result.needsReview).toBe(true);
    expect(result.reviewReason).toBe('EXCEEDS_TWO_DEPARTMENTS_HUMAN_TRIAGE_REQUIRED');
    // Crucial: departments must NOT be auto-assigned or arbitrarily truncated
    expect(result.departments).toEqual([]);
    // Crucial: all detected candidate departments must be preserved in allDetectedDepartments
    expect(result.allDetectedDepartments.length).toBeGreaterThanOrEqual(3);
    expect(result.allDetectedDepartments).toContain('kwsc');
    expect(result.allDetectedDepartments).toContain('kelectric');
    expect(result.allDetectedDepartments).toContain('ssgc');
  });

  it('assessComplaintDraftV13_5 returns state review for 3+ departments', () => {
    const text = (
      'Mohtaram afsaran, Keamari Jackson Bazaar (District Keamari) mein aik sath teen mukhtalif idaron ke masail hain. ' +
      'Awwal ye ke peenay ke saaf paani ki supply pichle pandrah din se band hai aur tanker mafia se paani lena par raha hai, ' +
      'doyam ye ke bijli ke taar toot kar zameen par gir chuke hain aur live wire se curren lagne ka shadid khatra hai, ' +
      'aur soyam mazeed ye ke gali ke main gas connection mein gas ka low pressure hai jis se geyser aur chulhe thap hain. ' +
      'In teeno alag alag masail ka fori jaeza le kar karrawai farmai jaye.'
    );
    const preview = assessComplaintDraftV13_5(text, championV11Model as any);

    expect(preview.state).toBe('review');
    if (preview.state === 'review') {
      expect(preview.reason).toBe('EXCEEDS_TWO_DEPARTMENTS_HUMAN_TRIAGE_REQUIRED');
      expect(preview.prediction.allDetectedDepartments.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('LocalV11ComplaintService with v13_5_candidate sets correct modelVersion and routes 3+ issues to review', async () => {
    const service = new LocalV11ComplaintService();
    service.setEngineMode('v13_5_candidate');

    const text = (
      'Mohtaram afsaran, Keamari Jackson Bazaar (District Keamari) mein aik sath teen mukhtalif idaron ke masail hain. ' +
      'Awwal ye ke peenay ke saaf paani ki supply pichle pandrah din se band hai aur tanker mafia se paani lena par raha hai, ' +
      'doyam ye ke bijli ke taar toot kar zameen par gir chuke hain aur live wire se curren lagne ka shadid khatra hai, ' +
      'aur soyam mazeed ye ke gali ke main gas connection mein gas ka low pressure hai jis se geyser aur chulhe thap hain. ' +
      'In teeno alag alag masail ka fori jaeza le kar karrawai farmai jaye.'
    );

    const submission = await service.submitComplaint({
      citizenName: 'Muhammad Ali',
      citizenPhone: '03001234567',
      citizenEmail: 'ali@example.com',
      residentialAddress: 'House 1, Street 2',
      district: 'District Keamari',
      locality: 'Keamari Jackson Bazaar',
      publicLocation: 'Near Bazaar',
      title: 'Multiple Municipal Issues',
      description: text,
    });

    expect(submission.v11Analysis?.modelVersion).toBe('V13.5 Candidate (Two-Dept Policy • Run004)');
    expect(submission.status).toBe('under_review');
    expect(submission.needsReview).toBe(true);
    expect(submission.v11Analysis?.reviewReason).toBe('EXCEEDS_TWO_DEPARTMENTS_HUMAN_TRIAGE_REQUIRED');
    expect(submission.departments).toEqual([]);

    const complaints = await service.getComplaints();
    expect(complaints.length).toBe(1);
    expect(complaints[0].status).toBe('under_review');
    expect(complaints[0].description).toBe(text);
  });
});
