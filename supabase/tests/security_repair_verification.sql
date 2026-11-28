-- ==============================================================================
-- AWAAZ-E-AWAM — PHASE 3F.6: DATABASE SECURITY & PRIVACY REPAIR VERIFICATION
-- File: supabase/tests/security_repair_verification.sql
-- Description: End-to-end SQL verification for:
--   1. Closed privileged intake overload (only service_role has EXECUTE)
--   2. Zero raw complaint narrative leakage into staff-visible fields
--   3. Multi-department atomic submission and independent issue delivery
--   4. Department isolation and staff authorization via department_memberships
--   5. Unrelated department and revoked staff denial
--   6. Safe guest tracking lookup with public category and issues
--   7. Atomic rollback on transaction failure
-- University: Greenwich University, Karachi, Pakistan
-- ==============================================================================

BEGIN;
SET LOCAL statement_timeout = '15s';
SET LOCAL lock_timeout = '3s';
SET LOCAL plpgsql.check_asserts = on;

-- ------------------------------------------------------------------------------
-- FIXTURES SETUP
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_admin_id UUID := '55555555-5555-4555-8555-555555555555'::UUID;
    v_citizen_id UUID := '11111111-1111-4111-8111-111111111111'::UUID;
    v_other_citizen_id UUID := '22222222-2222-4222-8222-222222222222'::UUID;
    v_kwsc_staff_id UUID := '33333333-3333-4333-8333-333333333333'::UUID;
    v_ke_staff_id UUID := '66666666-6666-4666-8666-666666666666'::UUID;
    v_ssgc_staff_id UUID := '77777777-7777-4777-8777-777777777777'::UUID;
    v_revoked_staff_id UUID := '88888888-8888-4888-8888-888888888888'::UUID;
BEGIN
    RAISE NOTICE 'Setting up test accounts, profiles and memberships...';

    -- Profiles and approval records reference auth.users. All fixtures roll back.
    INSERT INTO auth.users (id, email)
    SELECT id, id::text || '@fixture.invalid' FROM unnest(ARRAY[
        v_admin_id, v_citizen_id, v_other_citizen_id, v_kwsc_staff_id, v_ke_staff_id,
        v_ssgc_staff_id, v_revoked_staff_id, '99999999-9999-4999-8999-999999999999'::uuid
    ]) AS fixture(id);

    -- Test profiles
    INSERT INTO public.profiles (id, full_name, email, role)
    VALUES
        (v_admin_id, 'Admin User', 'admin@awaaz.test', 'main_admin'),
        (v_citizen_id, 'Citizen Ali', 'ali@citizen.test', 'citizen'),
        (v_other_citizen_id, 'Citizen Aisha', 'aisha@citizen.test', 'citizen'),
        (v_kwsc_staff_id, 'KWSC Officer', 'officer@kwsc.test', 'department_staff'),
        (v_ke_staff_id, 'KE Officer', 'officer@kelectric.test', 'department_staff'),
        (v_ssgc_staff_id, 'SSGC Officer', 'officer@ssgc.test', 'department_staff'),
        ('99999999-9999-4999-8999-999999999999', 'KMC Officer', 'kmc@fixture.invalid', 'department_staff'),
        (v_revoked_staff_id, 'Revoked Officer', 'revoked@kwsc.test', 'department_staff')
    ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

    -- Department memberships
    INSERT INTO public.department_memberships (id, user_id, department_id, status, approved_by)
    VALUES
        ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', v_kwsc_staff_id, 'kwsc', 'active', v_admin_id),
        ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', v_ke_staff_id, 'kelectric', 'active', v_admin_id),
        ('cccccccc-cccc-cccc-cccc-cccccccccccc', v_ssgc_staff_id, 'ssgc', 'active', v_admin_id),
        ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '99999999-9999-4999-8999-999999999999', 'kmc', 'active', v_admin_id),
        ('dddddddd-dddd-dddd-dddd-dddddddddddd', v_revoked_staff_id, 'kwsc', 'revoked', v_admin_id)
    ON CONFLICT (user_id, department_id) DO UPDATE SET status = EXCLUDED.status;

    RAISE NOTICE 'Fixtures initialized successfully.';
END;
$$;

-- ------------------------------------------------------------------------------
-- CASE 1 & 2: MULTI-DEPARTMENT SUBMISSION & INDEPENDENT ISSUE ACCESS
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_citizen_id UUID := '11111111-1111-4111-8111-111111111111'::UUID;
    v_res JSONB;
    v_cid UUID;
    v_ref TEXT;
    v_issue_count INT;
    v_kwsc_issues INT;
    v_ke_issues INT;
    v_timeline_count INT;
BEGIN
    RAISE NOTICE 'Executing Case 1: Multi-department complaint submission...';

    v_res := public.submit_citizen_complaint(
        p_citizen_id => v_citizen_id,
        p_title => 'Water pipe burst and power outage',
        p_description => 'Gali number 4 mein paani ki main line phat gayi hai aur bijli ka pole gir gaya hai. Mera naam Ali hai phone 03001234567.',
        p_sanitized_description => 'Water pipeline burst and electric power distribution line faulted.',
        p_generated_heading => 'Water burst and electricity outage',
        p_factual_summary => 'Water pipeline burst and power distribution fault in lane 4.',
        p_redaction_flags => jsonb_build_object(
            'hasPhone', true,
            'hasName', true,
            'multi_department_routing', jsonb_build_object(
                'is_multilabel', true,
                'departments', jsonb_build_array('kwsc', 'kelectric'),
                'issues', jsonb_build_array(
                    jsonb_build_object('departmentId', 'kwsc', 'issueType', 'pipeline_burst', 'confidence', 0.95),
                    jsonb_build_object('departmentId', 'kelectric', 'issueType', 'power_outage', 'confidence', 0.92)
                )
            )
        ),
        p_redaction_needs_review => false,
        p_incident_district => 'District East',
        p_incident_locality => 'Gulshan-e-Iqbal',
        p_incident_public_location => 'Block 13-D Lane 4',
        p_citizen_name => 'Ali Khan',
        p_citizen_phone => '03001234567',
        p_citizen_email => 'ali@citizen.test',
        p_residential_address => 'House 42, Block 13-D, Gulshan, Karachi',
        p_predicted_department_id => 'kwsc',
        p_prediction_confidence => 0.95,
        p_needs_review => false
    );

    v_cid := (v_res->>'complaint_id')::UUID;
    v_ref := v_res->>'reference_number';

    ASSERT v_cid IS NOT NULL, 'Case 1 Failed: Complaint ID is NULL';
    PERFORM set_config('awaaz.assigned_id', v_cid::text, true);
    ASSERT v_ref LIKE ('KHI-' || to_char(now(), 'YYYY') || '-%'), 'Case 1 Failed: Reference format unexpected: ' || v_ref;

    -- Verify 2 department issues persisted in public.complaint_issues
    SELECT count(*) INTO v_issue_count FROM public.complaint_issues WHERE complaint_id = v_cid;
    ASSERT v_issue_count = 2, 'Case 1 Failed: Expected 2 issues, got ' || v_issue_count;

    SELECT count(*) INTO v_kwsc_issues FROM public.complaint_issues WHERE complaint_id = v_cid AND department_id = 'kwsc';
    SELECT count(*) INTO v_ke_issues FROM public.complaint_issues WHERE complaint_id = v_cid AND department_id = 'kelectric';
    ASSERT v_kwsc_issues = 1 AND v_ke_issues = 1, 'Case 1 Failed: Expected 1 KWSC and 1 KE issue';

    -- Verify citizen timeline events
    SELECT count(*) INTO v_timeline_count FROM public.complaint_timeline_events WHERE complaint_id = v_cid;
    ASSERT v_timeline_count >= 2, 'Case 1 Failed: Expected at least 2 timeline events';

    RAISE NOTICE 'Case 1 Passed: 1 complaint, 2 issues (KWSC & KE), timeline intact.';
END;
$$;

-- ------------------------------------------------------------------------------
-- CASE 2 & 3: ISOLATION, DENIAL OF UNRELATED & REVOKED, OWNER TRACKING
-- ------------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
DO $$
DECLARE
    v_id uuid := current_setting('awaaz.assigned_id')::uuid;
    who text;
    dept text;
BEGIN
    FOR who, dept IN SELECT * FROM (VALUES
        ('33333333-3333-4333-8333-333333333333', 'kwsc'),
        ('66666666-6666-4666-8666-666666666666', 'kelectric')
    ) AS staff(user_id, department_id) LOOP
        PERFORM set_config('request.jwt.claim.sub', who, true);
        ASSERT EXISTS (SELECT FROM public.complaints WHERE id = v_id), 'Assigned staff cannot see complaint';
        ASSERT (SELECT count(id) FROM public.complaint_issues WHERE complaint_id = v_id) = 1;
        ASSERT EXISTS (SELECT FROM public.complaint_issues WHERE complaint_id = v_id AND department_id = dept);
    END LOOP;
    FOREACH who IN ARRAY ARRAY[
        '77777777-7777-4777-8777-777777777777', '88888888-8888-4888-8888-888888888888',
        '22222222-2222-4222-8222-222222222222'
    ] LOOP
        PERFORM set_config('request.jwt.claim.sub', who, true);
        ASSERT NOT EXISTS (SELECT FROM public.complaints WHERE id = v_id);
        ASSERT NOT EXISTS (SELECT FROM public.complaint_issues WHERE complaint_id = v_id);
    END LOOP;
    PERFORM set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
    ASSERT EXISTS (SELECT FROM public.complaints WHERE id = v_id);
    ASSERT (SELECT count(id) FROM public.complaint_issues WHERE complaint_id = v_id) = 2;
    ASSERT NOT has_column_privilege(current_user, 'public.complaint_issues', 'staff_notes', 'SELECT');
END;
$$;
RESET ROLE;

-- ------------------------------------------------------------------------------
-- CASE 4: PRIVILEGED INTAKE OVERLOAD SECURITY
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_anon_exec BOOLEAN;
    v_auth_exec BOOLEAN;
    v_service_exec BOOLEAN;
    v_has_hash BOOLEAN;
    v_count INT;
BEGIN
    RAISE NOTICE 'Executing Case 4: Privileged intake overload catalog check...';

    SELECT count(*) INTO v_count
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'submit_citizen_complaint';

    ASSERT v_count = 1, 'Case 4 Failed: Expected exactly 1 overload of submit_citizen_complaint, found ' || v_count;

    SELECT has_function_privilege('anon', p.oid, 'EXECUTE'),
           has_function_privilege('authenticated', p.oid, 'EXECUTE'),
           has_function_privilege('service_role', p.oid, 'EXECUTE'),
           'p_guest_tracking_hash' = ANY(p.proargnames)
    INTO v_anon_exec, v_auth_exec, v_service_exec, v_has_hash
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'submit_citizen_complaint';

    ASSERT v_anon_exec = false, 'Case 4 Failed: anon role has EXECUTE privilege';
    ASSERT v_auth_exec = false, 'Case 4 Failed: authenticated role has EXECUTE privilege';
    ASSERT v_service_exec = true, 'Case 4 Failed: service_role lacks EXECUTE privilege';
    ASSERT v_has_hash = true, 'Case 4 Failed: submit_citizen_complaint lacks p_guest_tracking_hash parameter';

    RAISE NOTICE 'Case 4 Passed: Direct client execution is closed; only service_role is granted.';
END;
$$;

-- ------------------------------------------------------------------------------
-- CASE 5: GUEST SUBMISSION & TRACKING LOOKUP
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_tracking_hash TEXT := 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    v_claim_hash TEXT := 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3';
    v_res JSONB;
    v_track_res JSONB;
    v_invalid_res JSONB;
BEGIN
    RAISE NOTICE 'Executing Case 5: Guest submission and tracking...';

    v_res := public.submit_citizen_complaint(
        p_citizen_id => NULL,
        p_title => 'Open manhole danger',
        p_description => 'Sewer line ubal rahi hai aur manhole khula hua hai.',
        p_sanitized_description => 'Open sewer manhole overflowing in public street.',
        p_generated_heading => 'Open sewer manhole hazard',
        p_factual_summary => 'Sewerage line overflow and open manhole reported.',
        p_redaction_flags => '{}'::jsonb,
        p_redaction_needs_review => false,
        p_incident_district => 'District Central',
        p_incident_locality => 'Nazimabad',
        p_incident_public_location => 'Block 2 near post office',
        p_citizen_name => 'Guest Citizen',
        p_citizen_phone => '03111234567',
        p_citizen_email => 'guest@example.test',
        p_residential_address => 'Nazimabad Block 2, Karachi',
        p_predicted_department_id => 'kwsc',
        p_prediction_confidence => 0.90,
        p_needs_review => false,
        p_claim_code_hash => v_claim_hash,
        p_guest_tracking_hash => v_tracking_hash
    );

    ASSERT (v_res->>'success')::BOOLEAN = true, 'Case 5 Failed: Guest submission failed';

    -- Track with valid hash
    v_track_res := public.get_guest_complaint_status(v_tracking_hash);
    ASSERT (v_track_res->>'found')::BOOLEAN = true, 'Case 5 Failed: Valid tracking hash not found';
    ASSERT v_track_res->>'public_status' = 'assigned', 'Case 5 Failed: Expected status assigned';
    ASSERT v_track_res #>> '{public_updates,1,status}' = 'assigned';
    ASSERT (v_track_res #>> '{public_updates,1,at}')::timestamptz = (
        SELECT created_at FROM public.complaint_timeline_events
        WHERE complaint_id = (v_res->>'complaint_id')::uuid AND status = 'assigned'
    );
    ASSERT (v_track_res ? 'citizen_name') = false, 'Case 5 Failed: Tracking leaks citizen name';
    ASSERT (v_track_res ? 'raw_description') = false, 'Case 5 Failed: Tracking leaks raw description';

    -- Track with invalid hash
    v_invalid_res := public.get_guest_complaint_status('0000000000000000000000000000000000000000000000000000000000000000');
    ASSERT (v_invalid_res->>'found')::BOOLEAN = false, 'Case 5 Failed: Invalid tracking hash returned data';

    RAISE NOTICE 'Case 5 Passed: Guest submission and tracking digest lookup verified.';
END;
$$;

-- ------------------------------------------------------------------------------
-- CASE 6: PRIVACY-UNCERTAIN COMPLAINT HOLDS ASSIGNMENT & PROTECTS STAFF TEXT
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_citizen_id UUID := '11111111-1111-4111-8111-111111111111'::UUID;
    v_res JSONB;
    v_cid UUID;
    v_rec RECORD;
    v_priv RECORD;
BEGIN
    RAISE NOTICE 'Executing Case 6: Privacy-uncertain complaint review hold...';

    -- Submit complaint with empty sanitized text and uncertain redaction flag
    v_res := public.submit_citizen_complaint(
        p_citizen_id => v_citizen_id,
        p_title => 'Mera secret complaint',
        p_description => 'Mera naam Asad hai aur phone 03009999999 hai, sewer pipe kharab hai.',
        p_sanitized_description => '', -- Empty sanitization!
        p_generated_heading => '',
        p_factual_summary => '',
        p_redaction_flags => '{"uncertainRedaction":true,"multi_department_routing":{"departments":["kmc"],"issues":[{"departmentId":"kmc"}]}}'::jsonb,
        p_redaction_needs_review => true,
        p_incident_district => 'District South',
        p_incident_locality => 'Saddar',
        p_incident_public_location => 'Preedy Street',
        p_citizen_name => 'Asad Khan',
        p_citizen_phone => '03009999999',
        p_citizen_email => 'asad@example.test',
        p_residential_address => 'Flat 12, Saddar, Karachi',
        p_predicted_department_id => 'kwsc',
        p_prediction_confidence => 0.88,
        p_needs_review => true
    );

    v_cid := (v_res->>'complaint_id')::UUID;

    -- Inspect public.complaints staff-facing fields
    SELECT title, description, sanitized_description, generated_heading, factual_summary,
           status, assigned_department_id, assigned_department_ids
    INTO v_rec
    FROM public.complaints
    WHERE id = v_cid;

    ASSERT v_rec.status = 'under_review', 'Case 6 Failed: Status is not under_review';
    ASSERT v_rec.assigned_department_id IS NULL, 'Case 6 Failed: Assigned department is not NULL';
    ASSERT cardinality(v_rec.assigned_department_ids) = 0, 'Case 6 Failed: Assigned department IDs not empty';
    ASSERT v_rec.description = 'Complaint pending privacy review.', 'Case 6 Failed: Description leaked raw text: ' || v_rec.description;
    ASSERT v_rec.sanitized_description = 'Complaint pending privacy review.', 'Case 6 Failed: Sanitized description leaked raw text';
    ASSERT v_rec.factual_summary = 'Complaint pending privacy review.', 'Case 6 Failed: Factual summary leaked raw text';

    -- Inspect private table: raw description must be preserved safely
    SELECT raw_description INTO v_priv FROM public.complaint_citizen_private WHERE complaint_id = v_cid;
    ASSERT v_priv.raw_description LIKE 'Mera naam Asad%', 'Case 6 Failed: Private record lost raw narrative';

    ASSERT NOT EXISTS (SELECT FROM public.complaint_issues WHERE complaint_id = v_cid);
    PERFORM set_config('awaaz.held_id', v_cid::text, true);

    RAISE NOTICE 'Case 6 Passed: Privacy-uncertain complaint holds assignment and substitutes safe staff text.';
END;
$$;

-- ------------------------------------------------------------------------------
-- CASE 7: CONTROLLED TRANSACTION FAILURE ATOMIC ROLLBACK
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_failed BOOLEAN := false;
    v_count_before INT;
    v_count_after INT;
BEGIN
    RAISE NOTICE 'Executing Case 7: Transaction atomicity check...';

    SELECT count(*) INTO v_count_before FROM public.complaints;

    BEGIN
        -- Fail during issue insertion, after the complaint and private record are written.
        PERFORM public.submit_citizen_complaint(
            p_citizen_id => '11111111-1111-4111-8111-111111111111'::UUID,
            p_title => 'Overflow',
            p_description => 'A service line needs repair.',
            p_redaction_flags => '{"multi_department_routing":{"issues":[{"departmentId":"kwsc","confidence":"invalid"}]}}'::jsonb,
            p_sanitized_description => 'Valid sanitized text',
            p_incident_district => 'District East',
            p_incident_locality => 'Gulshan',
            p_incident_public_location => 'Street 1',
            p_citizen_name => 'Test',
            p_citizen_phone => '03001234567',
            p_residential_address => 'House 1',
            p_predicted_department_id => 'kwsc',
            p_prediction_confidence => 0.90,
            p_needs_review => false
        );
    EXCEPTION WHEN invalid_text_representation THEN
        v_failed := true;
    END;

    ASSERT v_failed = true, 'Case 7 Failed: Expected issue confidence validation failure';

    SELECT count(*) INTO v_count_after FROM public.complaints;
    ASSERT v_count_before = v_count_after, 'Case 7 Failed: Complaint was partially inserted!';

    RAISE NOTICE 'Case 7 Passed: Controlled failure rolled back completely.';
END;
$$;

SET LOCAL ROLE anon;
DO $$
DECLARE
    result jsonb := public.get_guest_complaint_status('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
BEGIN
    ASSERT result->>'public_status' = 'assigned' AND (result->>'found')::boolean;
    ASSERT jsonb_array_length(result->'public_issues') = 1;
    ASSERT public.get_guest_complaint_status(repeat('0', 64)) = '{"found":false}'::jsonb;
END;
$$;
RESET ROLE;

SET LOCAL ROLE authenticated;
DO $$
DECLARE
    held uuid := current_setting('awaaz.held_id')::uuid;
BEGIN
    PERFORM set_config('request.jwt.claim.sub', '99999999-9999-4999-8999-999999999999', true);
    ASSERT NOT EXISTS (SELECT FROM public.complaints WHERE id = held);
    BEGIN
        PERFORM public.staff_review_and_assign_complaint(held, 'kmc', NULL);
        RAISE EXCEPTION 'Department staff assigned a held complaint';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    PERFORM set_config('request.jwt.claim.sub', '55555555-5555-4555-8555-555555555555', true);
    ASSERT EXISTS (SELECT FROM public.complaints WHERE id = held AND status = 'under_review');
    PERFORM public.staff_review_and_assign_complaint(held, 'kmc', 'Internal routing note');
    PERFORM set_config('request.jwt.claim.sub', '99999999-9999-4999-8999-999999999999', true);
    ASSERT EXISTS (SELECT FROM public.complaints WHERE id = held AND status = 'assigned');
    ASSERT EXISTS (SELECT FROM public.complaint_issues WHERE complaint_id = held AND department_id = 'kmc');
    PERFORM set_config('request.jwt.claim.sub', '55555555-5555-4555-8555-555555555555', true);
    PERFORM public.admin_reassign_complaint(held, 'kwsc', 'Transfer');
    PERFORM set_config('request.jwt.claim.sub', '99999999-9999-4999-8999-999999999999', true);
    ASSERT NOT EXISTS (SELECT FROM public.complaints WHERE id = held);
    ASSERT NOT EXISTS (SELECT FROM public.complaint_issues WHERE complaint_id = held);
    PERFORM set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);
    ASSERT EXISTS (SELECT FROM public.complaints WHERE id = held);
    ASSERT EXISTS (SELECT FROM public.complaint_issues WHERE complaint_id = held AND department_id = 'kwsc');
END;
$$;
RESET ROLE;
ROLLBACK;
