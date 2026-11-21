-- V13.13: A signed-in department officer can SELECT assigned complaint rows.
-- The guest claim RPC accepts the SHA-256 digest itself as a bearer credential.
-- Therefore, exposing claim_code_hash in a staff SELECT enables a second
-- citizen account to take ownership of that guest complaint. Hide both stored
-- credential digests at the PostgreSQL privilege boundary, not only in React.
--
-- Keep service_role and privileged SECURITY DEFINER routines unaffected.
-- Future columns are not automatically granted to authenticated clients.

BEGIN;

REVOKE SELECT ON TABLE public.complaints FROM authenticated;

DO $migration$
DECLARE
  v_columns text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute
    WHERE attrelid = 'public.complaints'::pg_catalog.regclass
      AND attname = 'claim_code_hash' AND NOT attisdropped
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute
    WHERE attrelid = 'public.complaints'::pg_catalog.regclass
      AND attname = 'guest_tracking_hash' AND NOT attisdropped
  ) THEN
    RAISE EXCEPTION 'Expected guest credential columns are missing';
  END IF;

  SELECT pg_catalog.string_agg(pg_catalog.format('%I', attname), ', ' ORDER BY attnum)
    INTO v_columns
  FROM pg_catalog.pg_attribute
  WHERE attrelid = 'public.complaints'::pg_catalog.regclass
    AND attnum > 0 AND NOT attisdropped
    AND attname NOT IN ('claim_code_hash', 'guest_tracking_hash');

  IF v_columns IS NULL THEN
    RAISE EXCEPTION 'No safe complaint columns available for reading';
  END IF;

  EXECUTE 'GRANT SELECT (' || v_columns || ') ON TABLE public.complaints TO authenticated';

  IF pg_catalog.has_column_privilege('authenticated', 'public.complaints', 'claim_code_hash', 'SELECT')
     OR pg_catalog.has_column_privilege('authenticated', 'public.complaints', 'guest_tracking_hash', 'SELECT') THEN
    RAISE EXCEPTION 'Guest claim/tracking credential hashes are still readable';
  END IF;
END;
$migration$;

COMMIT;
