-- V13.18 staging regression fix: proof versions must have a strict ordering.
-- now() is transaction-stable; a dispute and second upload in the same
-- transaction could share a timestamp and select the older approved proof.
-- clock_timestamp() is evaluated per insertion; the unique index rejects a
-- collision rather than returning the wrong version to a citizen.

ALTER TABLE public.department_work_evidence
  ALTER COLUMN submitted_at SET DEFAULT clock_timestamp();

DO $preflight$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.department_work_evidence
    GROUP BY order_id, submitted_at HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate proof timestamps must be reconciled before this migration';
  END IF;
END;
$preflight$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_v1318_one_proof_version_per_timestamp
  ON public.department_work_evidence(order_id, submitted_at);

COMMENT ON COLUMN public.department_work_evidence.submitted_at IS
  'Per-upload clock timestamp, unique within each order; order by descending submitted_at selects newest evidence version.';
