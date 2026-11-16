# AWAAZ-E-AWAM (آوازِ عوام) — PHASE V8
## SECURITY & PRIVACY REGRESSION AUDIT

**Project:** `D:\RomanUrdu_ComplaintClassifier_staff_auth`  
**Remote Supabase:** `akbwiedtmxjxcjscgitw`  
**Date:** 16 November 2026  
**Auditor:** Principal Security Engineer & Privacy Architect  

---

## 1. Executive Summary

This Security Regression Audit verifies that the Phase V8 changes maintain strict institutional boundaries, prevent cross-tenant data leakage, enforce NIST 800-63B password requirements, protect citizen PII, and preserve Row Level Security (RLS) policies.

---

## 2. Multi-Department Tenant Isolation

In Test 5 of the Phase V8 verification suite, authenticated API queries were executed on behalf of all six Karachi municipal departments. The results verify zero data leakage across departmental borders.

| Department | Authenticated Identity | Active Role | Records Queried | Foreign Records Seen | Boundary Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **KMC** | `roads-01` (`roads@kmc.gov.pk`) | Clearinghouse & Roads | 20 | 0 | **ISOLATED** |
| **KWSC** | `water-01` (`water@kwsc.gov.pk`) | Water & Sewerage Officer | 13 | 0 | **ISOLATED** |
| **K-Electric**| `electricity-01` (`power@kelectric.com.pk`)| Power Grid Officer | 6 | 0 | **ISOLATED** |
| **SSGC** | `gas-01` (`gas@ssgc.com.pk`) | Gas Distribution Officer | 7 | 0 | **ISOLATED** |
| **SBCA** | `building-01` (`building@sbca.gov.pk`) | Building Control Officer | 6 | 0 | **ISOLATED** |
| **SSWMB** | `sanitation-01` (`sanitation@sswmb.gov.pk`)| Solid Waste Officer | 8 | 0 | **ISOLATED** |

**Empirical Result:** 100% compliance. Staff from KWSC cannot read K-Electric complaints, SSGC staff cannot read SBCA complaints, and SSWMB staff cannot access KMC infrastructure records.

---

## 3. Row Level Security (RLS) Boundaries

### 3.1 Anonymous Client Restrictions
Direct PostgREST queries from an unauthenticated or anonymous client (`anon` key) against `public.complaints` are completely blocked by PostgreSQL RLS:
```json
{
  "code": "42501",
  "message": "permission denied for table complaints"
}
```
Public users cannot enumerate or scrape citizen complaints.

### 3.2 Direct Staff Update Restrictions
Direct SQL `UPDATE` operations on `public.complaints` by staff clients are disallowed by table permissions. All mutations must pass through the `SECURITY DEFINER` function `public.staff_update_complaint_status`, which strictly verifies:
1. Active session in `auth.users`.
2. Department membership in `public.department_memberships`.
3. Department assignment match (`complaint.assigned_department_id = staff.department_id`).
4. Allowed status transition validity.

---

## 4. NIST 800-63B Password Policy Enforcement

Password change actions initiated via the topbar avatar menu are governed by the NIST 800-63B standard:
1. **Passphrase Length:** Minimum 15 characters required. Submissions with $< 15$ characters are immediately blocked client-side with a clear indicator:
   `"Passphrase must be at least 15 characters long (NIST 800-63B standard)."`
2. **Confirmation Match:** Re-entered passphrase must match exactly.
3. **Password Masking:** Password fields are masked by default (`type="password"`) with an accessible toggle to reveal/hide characters.
4. **No Forced Arbitrary Special Characters:** Focuses on passphrase length and entropy rather than counter-productive arbitrary composition rules.

---

## 5. Citizen PII Protection & Data Minimization

When citizens submit complaints (registered or guest):
1. **PII Masking:** Names, telephone numbers, emails, and residential addresses are processed and flagged by `processComplaintPrivacy`.
2. **Staff Narrative View:** Staff view the `sanitized_description` and AI-synthesized `factual_summary`, preventing exposure of citizen personal contact information during routine queue triage.
3. **Corridor Corroboration:** When complaints corroborate into a single incident case, each citizen report retains its own private reference number and distinct identity. Citizens tracking their report never see personal details of other citizens reporting the same street defect.
