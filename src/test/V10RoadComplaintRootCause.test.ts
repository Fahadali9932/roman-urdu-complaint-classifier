import { describe, it, expect } from 'vitest';
import { classifyMultiLabel, normalizeRomanUrdu } from '../services/multiLabelClassifier';

describe('AWAAZ-E-AWAM (آوازِ عوام) — Phase V10 ML Verification Suite', () => {
  const userRoadComplaint = 'humare ghar ke pass wali road bohot zada kharab hoi v hai isko theek kiya jae';

  it('verifies enhanced Roman Urdu normalization preserves key road signals and canonical forms', () => {
    const norm = normalizeRomanUrdu(userRoadComplaint);

    expect(norm).toContain('hamare');
    expect(norm).toContain('paas');
    expect(norm).toContain('road');
    expect(norm).toContain('bohot');
    expect(norm).toContain('zyada');
    expect(norm).toContain('kharab');
    expect(norm).toContain('hui hai');
    expect(norm).toContain('theek kiya jaye');
  });

  it('MANDATORY REGRESSION C01: user road complaint is classified with high confidence and auto-routes to KMC', () => {
    const result = classifyMultiLabel(userRoadComplaint);

    expect(result.primaryDepartment).toBe('kmc');
    expect(result.departments).toEqual(['kmc']);
    expect(result.confidence).toBeGreaterThan(0.75); // Model scores ~0.8162
    expect(result.needsReview).toBe(false); // Auto-routes cleanly!
    expect(result.issues[0].issueType).toBe('kmc.road_damage');
  });

  it('decouples service identification from location completeness (shows INCOMPLETE_PUBLIC_LOCATION instead of AI uncertainty)', () => {
    // When location is missing, service is recognized as road damage, but review reason indicates missing location
    const result = classifyMultiLabel(userRoadComplaint, { hasLocation: false });

    expect(result.primaryDepartment).toBe('kmc');
    expect(result.departments).toContain('kmc');
    expect(result.confidence).toBeGreaterThan(0.75);
    expect(result.needsReview).toBe(true);
    expect(result.reviewReason).toBe('INCOMPLETE_PUBLIC_LOCATION');
  });

  describe('Causal Relation & Consequence Disambiguation (Section 6 Requirements)', () => {
    it('Example A (Power out causing water motor to stop) -> K-Electric only; KWSC is suppressed', () => {
      const text = 'kal se bijli nahi hai is wajah se ghar ki pani wali motor nahi chal rahi';
      const result = classifyMultiLabel(text);

      expect(result.primaryDepartment).toBe('kelectric');
      expect(result.departments).toContain('kelectric');
      expect(result.departments).not.toContain('kwsc'); // Motor consequence suppressed!
      expect(result.issues[0].issueType).toBe('kelectric.power_outage');
    });

    it('Example B (Two independent departments) -> K-Electric and KWSC both assigned', () => {
      const text = 'hamare area mein bijli nahi aa rahi aur sarkari pani ki main pipeline bhi phat gai hai';
      const result = classifyMultiLabel(text);

      expect(result.departments).toContain('kelectric');
      expect(result.departments).toContain('kwsc');
      expect(result.isMultiLabel).toBe(true);
      expect(result.issues.length).toBe(2);
    });

    it('Example C (One incident, two repair requirements) -> KWSC water leak + KMC road surface damage', () => {
      const text = 'pani ki main line phat gai hai aur us ki wajah se road ki satah bhi toot gai hai';
      const result = classifyMultiLabel(text);

      expect(result.departments).toContain('kwsc');
      expect(result.departments).toContain('kmc');
      expect(result.isMultiLabel).toBe(true);
      const types = result.issues.map((i) => i.issueType);
      expect(types).toContain('kwsc.water_leak');
      expect(types).toContain('kmc.road_damage');
    });

    it('Example D (Sewer overflow causing traffic jam) -> KWSC only; phantom KMC road defect is suppressed', () => {
      const text = 'sewerage ka pani road par aa raha hai jis se traffic ruk gaya hai';
      const result = classifyMultiLabel(text);

      expect(result.departments).toContain('kwsc');
      expect(result.departments).not.toContain('kmc'); // Traffic jam on road is not structural road damage!
      expect(result.issues[0].issueType).toBe('kwsc.sewage_overflow');
    });
  });

  describe('Negation Handling & False Alarm Prevention', () => {
    it('negated road damage does not trigger KMC', () => {
      const text = 'sarak bilkul theek hai magar gutter ka paani ubal raha hai sewer line theek karo';
      const result = classifyMultiLabel(text);

      expect(result.departments).toContain('kwsc');
      expect(result.departments).not.toContain('kmc');
    });

    it('negated gas leak with low pressure does not trigger explosive gas leak hazard', () => {
      const text = 'gas leak nahi hai magar pressure intehai kam hai chulha nahi jal raha';
      const result = classifyMultiLabel(text);

      expect(result.departments).toContain('ssgc');
      expect(result.hasHazard).toBe(false); // Negation protects against false hazard alarm
      expect(result.issues[0].issueType).toBe('ssgc.low_pressure');
    });
  });
});
