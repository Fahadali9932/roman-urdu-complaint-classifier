import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { LanguageProvider } from '../context/LanguageContext';
import { SimplifiedComplaintContainer } from '../features/citizen/simplified-complaint/SimplifiedComplaintContainer';
import { SupabaseComplaintService } from '../services/SupabaseComplaintService';
import { MockComplaintService } from '../services/MockComplaintService';
import {
  assessComplaintDraft,
  resolveComplaintClarification,
  type ClarificationAnswer,
} from '../services/complaintUnderstanding';
import {
  classifyV11RelationAware,
  championV11Model,
} from '../services/v11InferenceAdapter';
import type { ComplaintSubmissionInput } from '../types';

// Mock supabase client
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    functions: {
      invoke: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
        or: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
    })),
  },
  isSupabaseConfigured: () => true,
}));

describe('PHASE V13.0 — REAL CITIZEN SUBMISSION & V11 INTEGRATION', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Objective 1 & 2: Pipeline Audit & Server-Side V11 Integration', () => {
    it('SupabaseComplaintService forwards clarificationAnswer to submit-classified-complaint Edge Function', async () => {
      const { supabase } = await import('../lib/supabase');
      const mockInvoke = vi.mocked(supabase.functions.invoke);

      mockInvoke.mockResolvedValueOnce({
        data: {
          complaint_id: 'cmp-v13-test',
          reference_number: 'KHI-2026-V1301',
          status: 'assigned',
          assigned_department_id: 'ssgc',
          assigned_department_ids: ['ssgc'],
          prediction: {
            departmentId: 'ssgc',
            departments: ['ssgc'],
            confidence: 0.94,
            isMultiLabel: false,
            needsReview: false,
          },
          claim_code: 'CLM-ABCD-EFGH-JKLM',
          guest_tracking_number: '1234 5678 9012 3456 7890 1234',
        },
        error: null,
      });

      const service = new SupabaseComplaintService();
      const input: ComplaintSubmissionInput = {
        title: 'Gas band hai',
        description: 'Hamare ilaqe mein pichle char din se gas bilkul band hai choolhe thande hain.',
        district: 'District East',
        locality: 'Gulshan-e-Iqbal',
        publicLocation: 'Block 7 Main Market',
        incidentLatitude: 24.9056,
        incidentLongitude: 67.0822,
        citizenName: 'Fahad',
        citizenPhone: '03001234567',
        residentialAddress: 'House 12, Block 7',
        clarificationAnswer: {
          draftText: 'Hamare ilaqe mein bohot masla hai',
          questionId: 'describe_issue',
          details: 'Gas bilkul band hai',
        },
      };

      const result = await service.submitComplaint(input);

      expect(mockInvoke).toHaveBeenCalledTimes(1);
      const callArgs = mockInvoke.mock.calls[0];
      expect(callArgs[0]).toBe('submit-classified-complaint');
      expect(callArgs[1]?.body).toMatchObject({
        title: input.title,
        description: input.description,
        incidentDistrict: input.district,
        incidentLocality: input.locality,
        incidentPublicLocation: input.publicLocation,
        citizenName: input.citizenName,
        citizenPhone: input.citizenPhone,
        residentialAddress: input.residentialAddress,
        clarificationAnswer: input.clarificationAnswer,
      });

      expect(result.referenceNumber).toBe('KHI-2026-V1301');
      expect(result.departmentId).toBe('ssgc');
      expect(result.departments).toEqual(['ssgc']);
      expect(result.needsReview).toBe(false);
      expect(result.claimCode).toBe('CLM-ABCD-EFGH-JKLM');
    });

    it('MockComplaintService uses V11 relation-aware engine with frozen Run004 model', async () => {
      const mockService = new MockComplaintService();
      const input: ComplaintSubmissionInput = {
        title: 'Gas cut off',
        description: 'Hamare ilaqe Gulshan Block 7 mein pichle 4 din se gas bilkul band hai choolhe thande hain',
        district: 'District East',
        locality: 'Gulshan Block 7',
        publicLocation: 'Street 4',
        citizenName: 'Fahad',
        citizenPhone: '03001234567',
        residentialAddress: 'House 12, Block 7',
      };

      const result = await mockService.submitComplaint(input);
      expect(result.departments).toEqual(['ssgc']);
      expect(result.departmentId).toBe('ssgc');
      expect(result.needsReview).toBe(false);
    });
  });

  describe('Objective 3: Natural Roman Urdu Understanding (Examples A–G)', () => {
    it('Example A: Fahad paragraph with frustration routes cleanly to SSGC without admin hold', () => {
      const fahadText =
        'Mera naam Fahad hai. Yeh teesri dafa likh raha hoon, tum log sab chor ho koi kaam dhang se nahi karte, itni ghatiya service hai ke sharam aani chahiye. Hamare ilaqe Block 7 Gulshan mein pichle char din se gas bilkul band hai, choolhe thande pare hain, auratain subah se nashte ke liye taras rahi hain aur bahar se khana mangwana par raha hai jo hum afford nahi kar sakte. Meharbani karke is gas ke masle ko foran theek karein warna hum ehtijaj karein ge.';

      const assessment = assessComplaintDraft(fahadText, championV11Model);
      expect(assessment.state).toBe('ready');
      if (assessment.state === 'ready') {
        expect(assessment.departments).toEqual(['ssgc']);
        expect(assessment.prediction.needsReview).toBe(false);
      }

      const prediction = classifyV11RelationAware(fahadText, championV11Model);
      expect(prediction.departments).toEqual(['ssgc']);
      expect(prediction.needsReview).toBe(false);
      expect(prediction.suppressedDepartments).not.toContain('ssgc');
    });

    it('Example B: Causal consequence routes only to responsible department (root cause)', () => {
      const causalText = 'K-Electric ki taar toot kar gir gayi jis se kachray mein aag lag gayi';
      const prediction = classifyV11RelationAware(causalText, championV11Model);

      expect(prediction.departments).toEqual(['kelectric']);
      expect(prediction.departments).not.toContain('sswmb');
    });

    it('Example C: Independent faults route to multiple departments', () => {
      const dualText = 'Bijli bhi teen din se band hai aur gutter ka ganda pani bhi sadak par beh raha hai';
      const prediction = classifyV11RelationAware(dualText, championV11Model);

      expect(prediction.departments).toContain('kelectric');
      expect(prediction.departments).toContain('kwsc');
      expect(prediction.relation).toBe('INDEPENDENT');
    });

    it('Example D: Truly ambiguous complaints require clarification (state: ask)', () => {
      const ambiguousText = 'Hamare ilaqe mein bohot shadeed masla hai log bohot pareshan hain kripya madad karein';
      const assessment = assessComplaintDraft(ambiguousText, championV11Model);

      expect(assessment.state).toBe('ask');
      if (assessment.state === 'ask') {
        expect(assessment.question.id).toBe('describe_issue');
      }
    });

    it('Example E: Answered clarification correctly resolves to target department without admin intervention', () => {
      const ambiguousText = 'Hamare ilaqe mein bohot shadeed masla hai log bohot pareshan hain kripya madad karein';
      const assessment = assessComplaintDraft(ambiguousText, championV11Model);
      expect(assessment.state).toBe('ask');

      if (assessment.state === 'ask') {
        const answer: ClarificationAnswer = {
          draftText: ambiguousText,
          questionId: 'describe_issue',
          details: 'Gas band hai choolhe nahi jal rahe khana nahi ban raha',
        };
        const resolved = resolveComplaintClarification(ambiguousText, answer, championV11Model);
        expect(resolved.state).toBe('ready');
        if (resolved.state === 'ready') {
          expect(resolved.departments).toEqual(['ssgc']);
          expect(resolved.prediction.needsReview).toBe(false);
        }
      }
    });

    it('Example F: Full natural paragraph up to 200 words processed gracefully', () => {
      const words = Array(180).fill('masla').join(' ');
      const validText = `Hamare ilaqe Block 7 mein gas band hai aur log pareshan hain. ${words}`;
      const assessment = assessComplaintDraft(validText, championV11Model);
      expect(assessment.state).not.toBe('invalid');

      const overText = Array(205).fill('masla').join(' ');
      const overAssessment = assessComplaintDraft(overText, championV11Model);
      expect(overAssessment.state).toBe('invalid');
      if (overAssessment.state === 'invalid') {
        expect(overAssessment.reason).toBe('WORD_LIMIT');
      }
    });

    it('Example G: Abusive language alone with clear fault routes directly to responsible department', () => {
      const angryComplaint = 'Tum sab na-ahal aur be-hiss ho! Main do din se complaint kar raha hoon, hamare Block 4 mein bijli ka transformer phat gaya hai!';
      const assessment = assessComplaintDraft(angryComplaint, championV11Model);
      expect(assessment.state).toBe('ready');
      if (assessment.state === 'ready') {
        expect(assessment.departments).toEqual(['kelectric']);
        expect(assessment.prediction.needsReview).toBe(false);
      }
    });
  });

  describe('Objective 4: Clarification UI Integration in Real Submission Flow', () => {
    it('triggers inline clarification card when citizen enters ambiguous text on stage 3', async () => {
      const { container } = render(
        <BrowserRouter>
          <LanguageProvider>
            <SimplifiedComplaintContainer />
          </LanguageProvider>
        </BrowserRouter>
      );

      // Step 1: Citizen Details
      fireEvent.change(container.querySelector('#citizenName')!, { target: { value: 'Ali Raza' } });
      fireEvent.change(container.querySelector('#citizenPhone')!, { target: { value: '03001234567' } });

      fireEvent.click(screen.getByRole('button', { name: /Continue|آگے بڑھیں/i }));

      // Step 2: Photo Capture (Mandatory)
      const fileInput1 = container.querySelector('#file-photo-input')!;
      const dummyPhoto1 = new File(['mock photo bytes'], 'issue-photo.jpg', { type: 'image/jpeg' });
      fireEvent.change(fileInput1, { target: { files: [dummyPhoto1] } });
      await screen.findByText(/photo attached/i);
      fireEvent.click(screen.getByRole('button', { name: /Continue|آگے بڑھیں/i }));

      // Step 3: Location & Residential Address
      fireEvent.change(container.querySelector('#locality')!, { target: { value: 'Gulshan-e-Iqbal' } });
      fireEvent.change(container.querySelector('#publicLocation')!, { target: { value: 'Near Disco Bakery' } });
      fireEvent.change(container.querySelector('#applicantAddress')!, { target: { value: 'House 123, Street 4' } });
      fireEvent.change(container.querySelector('#incident-lat-input')!, { target: { value: '24.9056' } });
      fireEvent.change(container.querySelector('#incident-lon-input')!, { target: { value: '67.0822' } });
      fireEvent.click(screen.getByRole('button', { name: /verify location/i }));

      fireEvent.click(screen.getByRole('button', { name: /Continue|آگے بڑھیں/i }));

      // Step 3: Enter ambiguous complaint
      const descInput = container.querySelector('#description')!;
      fireEvent.change(descInput, { target: { value: 'Hamare ilaqe mein bohot shadeed masla hai log bohot pareshan hain' } });

      fireEvent.click(screen.getByRole('button', { name: /Submit Complaint|شکایت جمع کروائیں/i }));

      // Clarification card should appear inline without wiping complaint text
      await waitFor(() => {
        expect(screen.getByTestId('inline-clarification-card')).toBeInTheDocument();
      });

      expect(descInput).toHaveValue('Hamare ilaqe mein bohot shadeed masla hai log bohot pareshan hain');
      expect(screen.getByTestId('clarification-details-input')).toBeInTheDocument();
    });

    it('submits with clarification answer when citizen answers the inline clarification question', async () => {
      const { supabase } = await import('../lib/supabase');
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      mockInvoke.mockResolvedValueOnce({
        data: {
          complaint_id: 'cmp-v13-clarified',
          reference_number: 'KHI-2026-V1303',
          status: 'assigned',
          assigned_department_id: 'ssgc',
          assigned_department_ids: ['ssgc'],
          prediction: {
            departmentId: 'ssgc',
            departments: ['ssgc'],
            confidence: 0.92,
            isMultiLabel: false,
            needsReview: false,
          },
        },
        error: null,
      });

      const { container } = render(
        <BrowserRouter>
          <LanguageProvider>
            <SimplifiedComplaintContainer />
          </LanguageProvider>
        </BrowserRouter>
      );

      // Step 1
      fireEvent.change(container.querySelector('#citizenName')!, { target: { value: 'Ali Raza' } });
      fireEvent.change(container.querySelector('#citizenPhone')!, { target: { value: '03001234567' } });
      fireEvent.click(screen.getByRole('button', { name: /Continue|آگے بڑھیں/i }));

      // Step 2: Photo Capture (Mandatory)
      const fileInput2 = container.querySelector('#file-photo-input')!;
      const dummyPhoto2 = new File(['mock photo bytes'], 'issue-photo.jpg', { type: 'image/jpeg' });
      fireEvent.change(fileInput2, { target: { files: [dummyPhoto2] } });
      await screen.findByText(/photo attached/i);
      fireEvent.click(screen.getByRole('button', { name: /Continue|آگے بڑھیں/i }));

      // Step 3
      fireEvent.change(container.querySelector('#locality')!, { target: { value: 'Gulshan-e-Iqbal' } });
      fireEvent.change(container.querySelector('#publicLocation')!, { target: { value: 'Near Disco Bakery' } });
      fireEvent.change(container.querySelector('#applicantAddress')!, { target: { value: 'House 123, Street 4' } });
      fireEvent.change(container.querySelector('#incident-lat-input')!, { target: { value: '24.9056' } });
      fireEvent.change(container.querySelector('#incident-lon-input')!, { target: { value: '67.0822' } });
      fireEvent.click(screen.getByRole('button', { name: /verify location/i }));
      fireEvent.click(screen.getByRole('button', { name: /Continue|آگے بڑھیں/i }));

      // Step 3
      const descInput = container.querySelector('#description')!;
      fireEvent.change(descInput, { target: { value: 'Hamare ilaqe mein bohot shadeed masla hai log bohot pareshan hain' } });
      fireEvent.click(screen.getByRole('button', { name: /Submit Complaint|شکایت جمع کروائیں/i }));

      await waitFor(() => {
        expect(screen.getByTestId('inline-clarification-card')).toBeInTheDocument();
      });

      // Type details in clarification input
      const detailsInput = screen.getByTestId('clarification-details-input');
      fireEvent.change(detailsInput, { target: { value: 'Gas band hai choolhe nahi jal rahe' } });

      // Click confirm & submit
      const confirmBtn = screen.getByTestId('clarification-submit-btn');
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalled();
      });

      const callArgs = mockInvoke.mock.calls[0];
      expect(callArgs[1]?.body?.clarificationAnswer).toEqual({
        draftText: 'Hamare ilaqe mein bohot shadeed masla hai log bohot pareshan hain',
        questionId: 'describe_issue',
        details: 'Gas band hai choolhe nahi jal rahe',
      });

      await waitFor(() => {
        expect(screen.getByText('KHI-2026-V1303')).toBeInTheDocument();
      });
    });

    it('submits with skip flag when citizen chooses to skip clarification', async () => {
      const { supabase } = await import('../lib/supabase');
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      mockInvoke.mockResolvedValueOnce({
        data: {
          complaint_id: 'cmp-v13-skipped',
          reference_number: 'KHI-2026-V1304',
          status: 'under_review',
          needs_review: true,
          prediction: {
            needsReview: true,
            reviewReason: 'CLARIFICATION_SKIPPED',
          },
        },
        error: null,
      });

      const { container } = render(
        <BrowserRouter>
          <LanguageProvider>
            <SimplifiedComplaintContainer />
          </LanguageProvider>
        </BrowserRouter>
      );

      // Step 1
      fireEvent.change(container.querySelector('#citizenName')!, { target: { value: 'Ali Raza' } });
      fireEvent.change(container.querySelector('#citizenPhone')!, { target: { value: '03001234567' } });
      fireEvent.click(screen.getByRole('button', { name: /Continue|آگے بڑھیں/i }));

      // Step 2: Photo Capture (Mandatory)
      const fileInput2 = container.querySelector('#file-photo-input')!;
      const dummyPhoto2 = new File(['mock photo bytes'], 'issue-photo.jpg', { type: 'image/jpeg' });
      fireEvent.change(fileInput2, { target: { files: [dummyPhoto2] } });
      await screen.findByText(/photo attached/i);
      fireEvent.click(screen.getByRole('button', { name: /Continue|آگے بڑھیں/i }));

      // Step 3
      fireEvent.change(container.querySelector('#locality')!, { target: { value: 'Gulshan-e-Iqbal' } });
      fireEvent.change(container.querySelector('#publicLocation')!, { target: { value: 'Near Disco Bakery' } });
      fireEvent.change(container.querySelector('#applicantAddress')!, { target: { value: 'House 123, Street 4' } });
      fireEvent.change(container.querySelector('#incident-lat-input')!, { target: { value: '24.9056' } });
      fireEvent.change(container.querySelector('#incident-lon-input')!, { target: { value: '67.0822' } });
      fireEvent.click(screen.getByRole('button', { name: /verify location/i }));
      fireEvent.click(screen.getByRole('button', { name: /Continue|آگے بڑھیں/i }));

      // Step 3
      const descInput = container.querySelector('#description')!;
      fireEvent.change(descInput, { target: { value: 'Hamare ilaqe mein bohot shadeed masla hai log bohot pareshan hain' } });
      fireEvent.click(screen.getByRole('button', { name: /Submit Complaint|شکایت جمع کروائیں/i }));

      await waitFor(() => {
        expect(screen.getByTestId('inline-clarification-card')).toBeInTheDocument();
      });

      // Click skip
      const skipBtn = screen.getByTestId('clarification-skip-btn');
      fireEvent.click(skipBtn);

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalled();
      });

      const callArgs = mockInvoke.mock.calls[0];
      expect(callArgs[1]?.body?.clarificationAnswer).toEqual({
        draftText: 'Hamare ilaqe mein bohot shadeed masla hai log bohot pareshan hain',
        questionId: 'describe_issue',
        skip: true,
      });

      await waitFor(() => {
        expect(screen.getByText('KHI-2026-V1304')).toBeInTheDocument();
      });
    });

    it('submits immediately without clarification when complaint description is unambiguous', async () => {
      const { supabase } = await import('../lib/supabase');
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      mockInvoke.mockResolvedValueOnce({
        data: {
          complaint_id: 'cmp-v13-direct',
          reference_number: 'KHI-2026-V1302',
          status: 'assigned',
          assigned_department_id: 'ssgc',
          assigned_department_ids: ['ssgc'],
          prediction: {
            departmentId: 'ssgc',
            departments: ['ssgc'],
            confidence: 0.94,
            isMultiLabel: false,
            needsReview: false,
          },
        },
        error: null,
      });

      const { container } = render(
        <BrowserRouter>
          <LanguageProvider>
            <SimplifiedComplaintContainer />
          </LanguageProvider>
        </BrowserRouter>
      );

      // Step 1
      fireEvent.change(container.querySelector('#citizenName')!, { target: { value: 'Fahad' } });
      fireEvent.change(container.querySelector('#citizenPhone')!, { target: { value: '03001234567' } });
      fireEvent.click(screen.getByRole('button', { name: /Continue|آگے بڑھیں/i }));

      // Step 2: Photo Capture (Mandatory)
      const fileInput4 = container.querySelector('#file-photo-input')!;
      const dummyPhoto4 = new File(['mock photo bytes'], 'issue-photo.jpg', { type: 'image/jpeg' });
      fireEvent.change(fileInput4, { target: { files: [dummyPhoto4] } });
      await screen.findByText(/photo attached/i);
      fireEvent.click(screen.getByRole('button', { name: /Continue|آگے بڑھیں/i }));

      // Step 3
      fireEvent.change(container.querySelector('#locality')!, { target: { value: 'Gulshan Block 7' } });
      fireEvent.change(container.querySelector('#publicLocation')!, { target: { value: 'Street 4 Main Market' } });
      fireEvent.change(container.querySelector('#applicantAddress')!, { target: { value: 'House 12, Block 7' } });
      fireEvent.change(container.querySelector('#incident-lat-input')!, { target: { value: '24.9056' } });
      fireEvent.change(container.querySelector('#incident-lon-input')!, { target: { value: '67.0822' } });
      fireEvent.click(screen.getByRole('button', { name: /verify location/i }));
      fireEvent.click(screen.getByRole('button', { name: /Continue|آگے بڑھیں/i }));

      // Step 3: Enter Fahad's clear complaint
      fireEvent.change(
        container.querySelector('#description')!,
        { target: { value: 'Hamare ilaqe Block 7 Gulshan mein pichle char din se gas bilkul band hai choolhe thande pare hain.' } }
      );

      fireEvent.click(screen.getByRole('button', { name: /Submit Complaint|شکایت جمع کروائیں/i }));

      // Inline clarification card should NOT appear
      expect(screen.queryByTestId('inline-clarification-card')).not.toBeInTheDocument();

      // Modal should appear with success
      await waitFor(() => {
        expect(screen.getByText('KHI-2026-V1302')).toBeInTheDocument();
      });
    });
  });
});
