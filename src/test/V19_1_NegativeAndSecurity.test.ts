import { describe, expect, it } from 'vitest';
import { fieldOperations, haversineDistanceMeters } from '../features/department/services/fieldOperations';
import { syntheticImageDetector } from '../services/syntheticImageDetector';
import { trustedTimeService } from '../services/trustedTimeService';

describe('V19.1 Rigorous Negative & Security Audit Test Suite', () => {
  // 1. GPS Validation & Proximity Guard Tests
  describe('1. GPS Auditing & Distance Calculations', () => {
    it('rejects missing latitude or longitude with descriptive error', async () => {
      // @ts-expect-error testing invalid input
      await expect(fieldOperations.submitWorkCompletion('local-dev-order-01', 'proof.jpg', { latitude: null, longitude: 67.11, accuracy: 5 }))
        .rejects.toThrow(/Device GPS coordinates are required/i);

      // @ts-expect-error testing invalid input
      await expect(fieldOperations.submitWorkCompletion('local-dev-order-01', 'proof.jpg', { latitude: 24.9, longitude: null, accuracy: 5 }))
        .rejects.toThrow(/Device GPS coordinates are required/i);
    });

    it('rejects coordinates out of physical bounds (-90..90, -180..180)', async () => {
      await expect(fieldOperations.submitWorkCompletion('local-dev-order-01', 'proof.jpg', { latitude: 95.5, longitude: 67.11, accuracy: 5 }))
        .rejects.toThrow(/out of bounds/i);

      await expect(fieldOperations.submitWorkCompletion('local-dev-order-01', 'proof.jpg', { latitude: 24.9, longitude: 185.0, accuracy: 5 }))
        .rejects.toThrow(/out of bounds/i);

      await expect(fieldOperations.submitWorkCompletion('local-dev-order-01', 'proof.jpg', { latitude: -92.0, longitude: 67.11, accuracy: 5 }))
        .rejects.toThrow(/out of bounds/i);
    });

    it('calculates genuine Haversine distance with high mathematical precision', () => {
      // Distance between NED University Gate (24.9312, 67.1123) and adjacent curb (~14m)
      const dist1 = haversineDistanceMeters(24.9312, 67.1123, 24.9313, 67.1123);
      expect(dist1).toBeGreaterThan(10);
      expect(dist1).toBeLessThan(15);

      // Same coordinates = 0m
      const distZero = haversineDistanceMeters(24.9312, 67.1123, 24.9312, 67.1123);
      expect(distZero).toBe(0);
    });

    it('flags location > 30m as unverified exception review (needs_review)', async () => {
      // Coordinates placed ~144m away from NED University Gate baseline
      const farCoords = { latitude: 24.9325, longitude: 67.1123, accuracy: 5.0 };
      const res = await fieldOperations.submitWorkCompletion('local-dev-order-01', 'proofs/far-away.jpg', farCoords);

      expect(res.success).toBe(true);
      expect(res.gpsVerified).toBe(false);
      expect(res.exceptionReview).toBe(true);
      expect(res.locationResult).toBe('needs_review');
      expect(res.distanceMeters).toBeGreaterThan(30);
    });

    it('flags poor GPS accuracy (> 50m) as exception review even if coordinates match', async () => {
      // Coordinates match site, but device satellite accuracy is ±65m
      const inaccurateCoords = { latitude: 24.9312, longitude: 67.1123, accuracy: 65.0 };
      const res = await fieldOperations.submitWorkCompletion('local-dev-order-01', 'proofs/poor-acc.jpg', inaccurateCoords);

      expect(res.success).toBe(true);
      expect(res.gpsVerified).toBe(false);
      expect(res.exceptionReview).toBe(true);
      expect(res.locationResult).toBe('poor_accuracy');
    });

    it('verifies GPS proximity ONLY when distance <= 30m AND accuracy <= 30m', async () => {
      // Close coordinates (~14m) with ±5m accuracy
      const validCoords = { latitude: 24.9313, longitude: 67.1123, accuracy: 5.0 };
      const res = await fieldOperations.submitWorkCompletion('local-dev-order-01', 'proofs/valid-proximity.jpg', validCoords);

      expect(res.success).toBe(true);
      expect(res.gpsVerified).toBe(true);
      expect(res.exceptionReview).toBe(false);
      expect(res.locationResult).toBe('near');
      expect(res.distanceMeters).toBeLessThanOrEqual(30);
    });
  });

  // 2. State Machine & Idempotency Tests
  describe('2. State Machine Transitions & Idempotent Replay', () => {
    it('startWorkOrder is idempotent: returns existing deadline without resetting timer if already in_progress', async () => {
      // First start
      const first = await fieldOperations.startWorkOrder('local-dev-order-03');
      expect(first.success).toBe(true);
      expect(first.effectiveDeadlineAt).toBeDefined();

      const initialDeadline = first.effectiveDeadlineAt;

      // Repeated start on same order
      const second = await fieldOperations.startWorkOrder('local-dev-order-03');
      expect(second.success).toBe(true);
      expect(second.idempotentReplay).toBe(true);
      expect(second.effectiveDeadlineAt).toBe(initialDeadline);
    });

    it('rejects starting a completed and verified work order', async () => {
      await expect(fieldOperations.startWorkOrder('local-dev-order-04'))
        .rejects.toThrow(/Cannot start completed and verified work order/i);
    });

    it('rejects approving work orders that are not pending review', async () => {
      // Order 03 is in_progress, not pending_review
      await expect(fieldOperations.approveResolution('local-dev-order-03'))
        .rejects.toThrow(/not pending supervisor review/i);
    });

    it('rejects returning verified work orders for correction', async () => {
      await expect(fieldOperations.returnCorrection('local-dev-order-04', 'Needs more work'))
        .rejects.toThrow(/Cannot return verified order/i);
    });

    it('requires a mandatory reason when returning work for correction', async () => {
      await expect(fieldOperations.returnCorrection('local-dev-order-01', '   '))
        .rejects.toThrow(/Correction reason is mandatory/i);
    });
  });

  // 3. Deadline Extension & Supervisory Warning Tests
  describe('3. Deadline Extensions & Supervisory Warnings', () => {
    it('rejects deadline extensions with zero or negative hours', async () => {
      await expect(fieldOperations.extendDeadline('local-dev-order-01', 0, 'Testing zero'))
        .rejects.toThrow(/Additional hours must be greater than zero/i);

      await expect(fieldOperations.extendDeadline('local-dev-order-01', -5, 'Testing negative'))
        .rejects.toThrow(/Additional hours must be greater than zero/i);
    });

    it('rejects deadline extensions without an operational reason', async () => {
      await expect(fieldOperations.extendDeadline('local-dev-order-01', 24, ''))
        .rejects.toThrow(/Reason for extension is required/i);
    });

    it('successfully extends deadline and maintains immutable history ledger', async () => {
      const res = await fieldOperations.extendDeadline('local-dev-order-01', 36, 'Asphalt curing delayed due to monsoon rain');
      expect(res.success).toBe(true);
      expect(res.additionalHours).toBe(36);
      expect(new Date(res.extendedDeadline).getTime()).toBeGreaterThan(new Date(res.previousDeadline).getTime());

      const history = await fieldOperations.fetchDeadlineHistory('local-dev-order-01');
      expect(history.length).toBeGreaterThan(0);
      expect(history[history.length - 1].reason).toContain('monsoon rain');
      expect(history[history.length - 1].additional_hours).toBe(36);
    });

    it('requires a mandatory reason when issuing formal warnings', async () => {
      await expect(fieldOperations.issueWarning('kmc', 'local-officer-a', ''))
        .rejects.toThrow(/Warning reason is mandatory/i);
    });

    it('records formal supervisory warning and transmits notification', async () => {
      const res = await fieldOperations.issueWarning('kmc', 'local-officer-b', 'Repeated failure to report on-site arrival', 'formal');
      expect(res.success).toBe(true);
      expect(res.warningId).toBeDefined();

      const warnings = await fieldOperations.fetchOfficerWarnings('kmc', 'local-officer-b');
      expect(warnings.some((w) => w.reason.includes('Repeated failure'))).toBe(true);

      const notifs = await fieldOperations.fetchNotifications('kmc', 'local-officer-b');
      expect(notifs.some((n) => n.notification_type === 'warning' && n.message.includes('Repeated failure'))).toBe(true);
    });
  });

  // 4. Ranking Engine & Score Calculation Formula
  describe('4. Verified Ranking Engine Formula', () => {
    it('calculates ratings strictly using the verified formula: 1.0 + 4.0 * (0.7 * onTimeRate + 0.3 * (1 - disputeRate))', () => {
      // 10 verified, 9 on-time (90%), 1 disputed (10%)
      // onTime = 0.9, lowDisputes = 0.9
      // raw = 1.0 + 4.0 * (0.7 * 0.9 + 0.3 * 0.9) = 1.0 + 4.0 * (0.63 + 0.27) = 1.0 + 4.0 * 0.9 = 4.6
      const rating1 = fieldOperations.calculateOfficerRating({
        verified_cases: 10,
        on_time_cases: 9,
        disputed_cases: 1,
      });
      expect(rating1.score).toBe(4.6);
      expect(rating1.onTimeRate).toBe(90);
      expect(rating1.disputeRate).toBe(10);

      // Perfect record: 10 verified, 10 on-time (100%), 0 disputes (0%)
      // raw = 1.0 + 4.0 * (0.7 * 1.0 + 0.3 * 1.0) = 5.0
      const ratingPerfect = fieldOperations.calculateOfficerRating({
        verified_cases: 10,
        on_time_cases: 10,
        disputed_cases: 0,
      });
      expect(ratingPerfect.score).toBe(5.0);

      // Terrible record: 10 verified, 0 on-time (0%), 10 disputes (100%)
      // raw = 1.0 + 4.0 * (0.7 * 0 + 0.3 * 0) = 1.0
      const ratingFloor = fieldOperations.calculateOfficerRating({
        verified_cases: 10,
        on_time_cases: 0,
        disputed_cases: 10,
      });
      expect(ratingFloor.score).toBe(1.0);
    });
  });

  // 5. Data Masking & Profile Privacy
  describe('5. Data Masking & Profile Privacy Protection', () => {
    it('masks CNIC and Phone numbers before saving officer profile details', async () => {
      const res = await fieldOperations.saveOfficerProfile('local-officer-a', 'kmc', {
        fullName: 'Field Officer Tariq',
        employeeId: 'kmc-7788',
        officialEmail: 'tariq.kmc@sindh.gov.pk',
        phone: '03001234567',
        cnic: '4210112345671',
      });

      expect(res.success).toBe(true);
      expect(res.phoneMasked).toBe('0300-***-567');
      expect(res.cnicMasked).toBe('42101-*******-1');

      const profile = await fieldOperations.fetchOfficerProfile('local-officer-a');
      expect(profile).not.toBeNull();
      expect(profile?.phone_masked).toBe('0300-***-567');
      expect(profile?.cnic_masked).toBe('42101-*******-1');
    });
  });

  // 6. Truthful Synthetic Image Detection & Forensic Heuristics
  describe('6. Truthful Synthetic Image Screening', () => {
    it('detects known AI generative software signatures in file headers', async () => {
      // Mock file with Midjourney header signature
      const content = 'JFIF\x00\x01\x01\x00Prompt: Highly realistic Karachi pothole, created with Midjourney v6';
      const syntheticBlob = new Blob([content], { type: 'image/jpeg' });

      const report = await syntheticImageDetector.screenImage(syntheticBlob);
      expect(report.status).toBe('confirmed_synthetic');
      expect(report.detectedArtifacts.some((a) => a.includes('midjourney'))).toBe(true);
      expect(report.verdictLabel).toContain('Confirmed AI-Generated');
    });

    it('falls back truthfully to screening_unavailable or manual_review in headless zero-cost environment', async () => {
      // Clean mock image without EXIF or generative markers
      const cleanContent = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00]);
      const cleanBlob = new Blob([cleanContent], { type: 'image/jpeg' });

      const report = await syntheticImageDetector.screenImage(cleanBlob);
      // In Node/headless test environment without window.Image, status is explicitly screening_unavailable
      expect(['screening_unavailable', 'manual_review_required']).toContain(report.status);
      expect(report.status).not.toBe('screening_passed'); // Never falsely marks untested evidence as passed without sensor proof!
    });
  });

  // 7. Monotonic Trusted Server Clock
  describe('7. Monotonic Trusted Server Clock', () => {
    it('anchors clock to server and advances monotonically using performance.now', () => {
      const serverTime = '2026-11-27T00:00:00.000Z';
      trustedTimeService.syncWithServerTime(serverTime);

      expect(trustedTimeService.isSynchronized()).toBe(true);

      const t1 = trustedTimeService.nowMs();
      const t2 = trustedTimeService.nowMs();
      expect(t2).toBeGreaterThanOrEqual(t1);

      const pkt = trustedTimeService.formatPkt();
      expect(pkt.fullStr).toContain('PKT');
    });
  });
});
