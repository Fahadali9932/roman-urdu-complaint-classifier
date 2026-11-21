-- V13.11: Atomic, shared intake quotas that work across Edge instances.
-- Service role only; no anonymous Data API access to counters or their RPC.
-- The global quotas cap resource consumption even if a caller spoofs IP headers.

CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA app_private TO service_role;

CREATE TABLE IF NOT EXISTS app_private.complaint_intake_rate_limits (
    bucket_key TEXT PRIMARY KEY CHECK (length(bucket_key) BETWEEN 3 AND 100),
    window_slot BIGINT NOT NULL,
    hits INTEGER NOT NULL CHECK (hits >= 1),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp()
);

CREATE INDEX IF NOT EXISTS complaint_intake_limits_updated_at_idx
    ON app_private.complaint_intake_rate_limits (updated_at);

ALTER TABLE app_private.complaint_intake_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private.complaint_intake_rate_limits FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON app_private.complaint_intake_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.reserve_complaint_intake_quota(
    p_client_hash TEXT,
    p_is_authenticated BOOLEAN
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
SET statement_timeout = '3s'
AS $quota$
DECLARE
    v_now TIMESTAMPTZ := pg_catalog.clock_timestamp();
    v_minute BIGINT := pg_catalog.floor(extract(epoch FROM v_now) / 60)::BIGINT;
    v_day BIGINT := pg_catalog.floor(extract(epoch FROM v_now) / 86400)::BIGINT;
    v_client_limit INT := CASE WHEN p_is_authenticated THEN 30 ELSE 10 END;
    v_bucket_key TEXT;
    v_window BIGINT;
    v_limit INT;
    v_index INT;
BEGIN
    IF p_client_hash IS NULL OR p_client_hash !~ '^[0-9a-f]{64}$' THEN
        RETURN FALSE;
    END IF;

    -- The first bucket limits a single client. The remaining buckets provide
    -- global resource caps when forwarded IP headers are manipulated.
    FOR v_index IN 1..3 LOOP
        IF v_index = 1 THEN
            v_bucket_key := 'client:' || p_client_hash;
            v_window := v_minute;
            v_limit := v_client_limit;
        ELSIF v_index = 2 THEN
            v_bucket_key := 'global:minute';
            v_window := v_minute;
            v_limit := 120;
        ELSE
            v_bucket_key := 'global:day';
            v_window := v_day;
            v_limit := 600;
        END IF;

        INSERT INTO app_private.complaint_intake_rate_limits AS existing
            (bucket_key, window_slot, hits, updated_at)
        VALUES (v_bucket_key, v_window, 1, v_now)
        ON CONFLICT (bucket_key) DO UPDATE SET
            window_slot = EXCLUDED.window_slot,
            hits = CASE WHEN existing.window_slot = EXCLUDED.window_slot THEN existing.hits + 1 ELSE 1 END,
            updated_at = EXCLUDED.updated_at
        WHERE existing.window_slot <> EXCLUDED.window_slot
           OR existing.hits < v_limit;

        IF NOT FOUND THEN
            RETURN FALSE;
        END IF;
    END LOOP;

    -- Opportunistic bounded cleanup. Counter keys are hashed and carry no
    -- raw citizen identifiers; stale rows cannot accumulate indefinitely.
    IF pg_catalog.random() < 0.02 THEN
        DELETE FROM app_private.complaint_intake_rate_limits target
        WHERE target.updated_at < v_now - INTERVAL '2 days'
          AND target.bucket_key IN (
              SELECT bucket_key FROM app_private.complaint_intake_rate_limits
              WHERE updated_at < v_now - INTERVAL '2 days'
              ORDER BY updated_at LIMIT 200
          );
    END IF;

    RETURN TRUE;
END;
$quota$;

REVOKE ALL ON FUNCTION public.reserve_complaint_intake_quota(TEXT, BOOLEAN)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_complaint_intake_quota(TEXT, BOOLEAN)
    TO service_role;
