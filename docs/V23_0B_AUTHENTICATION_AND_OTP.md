# AWAAZ-E-AWAM (آوازِ عوام) — V23.0B AUTHENTICATION ARCHITECTURE, ROLE SEPARATION & OTP TRUTH

## 1. AUTHENTICATION LANDSCAPE

Awaaz-e-Awam operates three distinct user cohorts:
1. **Citizens:** File complaints, track status, view public issues map.
2. **Department Heads (HODs):** Review assigned issues, issue work orders, manage officer roster, approve profiles.
3. **Field Officers:** View assigned field orders, verify live GPS proximity, capture on-site completion proof.

---

## 2. CITIZEN AUTHENTICATION ARCHITECTURE

- **Interface:** `src/features/auth/LoginPage.tsx`
- **Method:** `supabase.auth.signInWithPassword({ email, password })`
- **Server Guard:**
  ```ts
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle();

  if (profile?.role !== 'citizen') {
    await supabase.auth.signOut();
    throw new Error('This is a department account. Please use the department sign-in page.');
  }
  ```
- **Live Failure Handling:** Network errors, authentication errors, and misconfigurations throw honest user-facing messages. No mock data is substituted when Supabase is configured.

---

## 3. STAFF AUTHENTICATION ARCHITECTURE

### Department Head Authentication
- **Interface:** `src/features/department/auth/HodLoginPage.tsx`
- **Service:** `staffAuthService.signInDepartmentStaffWithUsername(username, accessKey, expectedDeptId)`
- **Boundary Verification:**
  1. Department matching: Account must have active membership in the selected department (`kmc`, `kwsc`, `kelectric`, `ssgc`, `sswmb`, `sbca`).
  2. Role guard: `fieldOperations.getMyRole(dept, userId)` must return `'head'`.
  3. If an officer attempts sign-in at `HodLoginPage`:
     - Session is terminated via `signOut()`.
     - User receives explicit error:
       > *"This sign-in is reserved for Department Heads. Your account belongs to the Field Officer workspace and is not authorized for the Department Head workspace."*

### Field Officer Authentication
- **Interface:** `src/features/department/auth/OfficerLoginPage.tsx`
- **Service:** `staffAuthService.signInDepartmentStaffWithUsername(username, accessKey, expectedDeptId)`
- **Boundary Verification:**
  1. Department matching: Account must belong to selected department.
  2. Role guard: `fieldOperations.getMyRole(dept, userId)` must return `'officer'`.
  3. If a Head attempts sign-in at `OfficerLoginPage`:
     - Session is terminated via `signOut()`.
     - User receives explicit error:
       > *"This sign-in is for Field Officers. Your account belongs to the Department Head workspace and is not authorized for the Field Officer workspace."*
  4. First login enforcement: If `must_change_password === true`, officer is gated to forced passphrase update before viewing orders.

---

## 4. ROLE SEPARATION & CROSS-PORTAL ACCESS MATRIX

| User Identity / Credentials | Citizen Login (`/login`) | HOD Login (`/department/head/login`) | Officer Login (`/department/officer/login`) | Admin Login (`/admin/login`) |
| :--- | :--- | :--- | :--- | :--- |
| **Citizen Account** | **ALLOW** -> `/dashboard` | **REJECT** (Role guard: citizen) | **REJECT** (Role guard: citizen) | **REJECT** (Admin guard) |
| **KMC Department Head** | **REJECT** (Role guard: staff) | **ALLOW** -> `/department/head` | **REJECT** (Role guard: Head at Officer) | **REJECT** (Not main admin) |
| **KMC Field Officer** | **REJECT** (Role guard: staff) | **REJECT** (Role guard: Officer at Head) | **ALLOW** -> `/department/officer` | **REJECT** (Not main admin) |
| **KW&SC Officer at KMC Login** | **REJECT** | **REJECT** (`wrong_department`) | **REJECT** (`wrong_department`) | **REJECT** |
| **Suspended Officer** | **REJECT** | **REJECT** (`status: suspended`) | **REJECT** (`status: suspended`) | **REJECT** |
| **Main Administrator** | **REJECT** (Staff account) | **REJECT** (Not department head) | **REJECT** (Not field officer) | **ALLOW** -> `/admin/requests` |

---

## 5. OFFICER ACCOUNT PROVISIONING: OPTION A (SERVER-SIDE EDGE FUNCTION)

### Security Contract
The project owner required that HOD officer creation must **NEVER** expose the Supabase `service_role` key to the browser.

### Implementation: Supabase Edge Function `manage-department-officers`
1. **Client Action:** The Department Head calls `fieldOperations.provisionOfficer(...)`, which invokes `manage-department-officers` passing their authenticated JWT.
2. **Server-Side Validation:**
   - Validates caller JWT and checks `aal2` MFA status.
   - Queries `department_memberships` using service role to verify caller is active `head` for `departmentId`.
   - Rejects unauthorized callers with `403 Forbidden`.
3. **Atomic User & Membership Provisioning:**
   - Calls `admin.auth.admin.createUser` creating an auth user with synthetic email `staff+{dept}.{empId}@awaaz-e-awam.org`.
   - Generates high-entropy 18-character temporary access key (`generateTemporaryAccessKey()`).
   - Sets `must_change_password: true`.
   - Upserts `profiles` record.
   - Inserts `department_memberships` record with `staff_role: 'officer'`, `status: 'active'`, `approved_by: caller.id`.
   - Inserts audit log in `access_audit_log`.
4. **Failure Rollback:** If profile or membership insertion fails, the auth user is rolled back via `admin.auth.admin.deleteUser`.
5. **Memory-Only Delivery:** The temporary access key is returned to the HOD once in memory for secure official handover.

---

## 6. FIRST-LOGIN VERIFICATION & REALISTIC OTP ANALYSIS

### Honest Appraisal of Delivery Channels
A critical requirement of V23.0B was an honest technical evaluation of OTP delivery without fabricating live production states:

1. **Default Supabase SMTP:**
   - **Limit:** 3-4 emails per hour across the entire project.
   - **Production Viability:** Unusable for multi-officer department onboarding. Attempting to send consecutive onboarding OTPs quickly triggers rate limit errors (`429 Too Many Requests`).
2. **Custom SMTP Providers (Zero-Cost / Free Tier):**
   - **Brevo (formerly Sendinblue):** Free tier offers 300 emails/day with no credit card requirement. Highly recommended for free-tier pilots.
   - **Resend:** Free tier offers 100 emails/day (3,000/month), but requires custom DNS records (SPF, DKIM, DMARC) for a verified domain.
   - **SendGrid:** Free tier exists but requires account verification that frequently gates new accounts behind automated compliance checks.
3. **SMS / WhatsApp Gateways:**
   - Providers such as Twilio or Infobip require active credit cards and charge per-SMS ($0.03-$0.07 per SMS in Pakistan).
   - In accordance with our \$0.00 expenditure constraint, SMS gateways cannot be enabled without paid card billing.

### Implemented Zero-Cost Secure Verification Architecture
- The Edge Function `manage-department-officers` supports `action: 'verify_onboarding_otp'`.
- In development/test mode, the system accepts valid 6-digit codes and logs verification to `access_audit_log`.
- When custom SMTP is unconfigured, authentication relies on the **Temporary Access Key + Forced First-Login Password Reset** pattern (`complete_first_login_password`), which provides cryptographic security without third-party email bottlenecks.
