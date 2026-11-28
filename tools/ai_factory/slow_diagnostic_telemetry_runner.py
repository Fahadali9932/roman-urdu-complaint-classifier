"""Awaaz-e-Awam (آوازِ عوام) — Slow Diagnostic Telemetry Runner.

A bounded, non-destructive diagnostic simulation of 30 complaint samples
executing over ~25 seconds with steady heartbeats and status flushes.
Demonstrates live telemetry streaming to the /admin/ai Control Center
without manual browser refreshes.
"""
from __future__ import annotations

import os
import sys
import time
from pathlib import Path

# Insert root
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from tools.ai_factory.telemetry import write_atomic_status, get_disk_resources

STAGES = [
    ("Initializing Diagnostic Run", 5, 0.0, 4.0),
    ("Verifying Data Lineage & Schema", 10, 0.15, 5.0),
    ("Extracting Dual-Track TF-IDF Features", 18, 0.35, 5.0),
    ("Calibrating 3-Fold Platt Ensembles", 25, 0.65, 5.0),
    ("Validating Thresholds on Diagnostic Set", 30, 0.90, 5.0),
    ("Diagnostic Complete & Champion Verified", 30, 1.0, 2.0),
]


def run_diagnostic():
    t_start = time.time()
    events = [
        {"timestamp": time.strftime("%H:%M:%S"), "level": "INFO", "message": "Diagnostic simulation started by Administrator."},
    ]

    total_target = 30
    current_cycle = 1
    total_cycles = 1

    print("[DIAGNOSTIC TELEMETRY RUNNER STARTED]", flush=True)

    for stage_idx, (stage_name, target_samples, progress_ratio, duration_secs) in enumerate(STAGES):
        start_step = time.time()
        step_events = list(events)
        step_events.append({
            "timestamp": time.strftime("%H:%M:%S"),
            "level": "INFO",
            "message": f"Entering Stage {stage_idx + 1}: {stage_name} ({target_samples}/{total_target} samples)",
        })
        events = step_events[-8:]

        # Heartbeat loop within each stage
        heartbeat_interval = 2.0
        elapsed_in_stage = 0.0

        while elapsed_in_stage < duration_secs:
            t_now = time.time()
            elapsed_total = round(t_now - t_start, 1)
            remaining_total = max(0.0, round(25.0 - elapsed_total, 1))

            current_samples = min(target_samples, int(target_samples * (elapsed_in_stage / max(duration_secs, 0.1))))
            pct = round((progress_ratio + (current_samples / total_target) * 0.1) * 100, 1)

            is_last = (stage_idx == len(STAGES) - 1)
            state = "COMPLETED" if is_last else "LIVE"

            payload = {
                "state": state,
                "stage": stage_name,
                "progress_current": current_samples,
                "progress_target": total_target,
                "percent_complete": min(100.0, pct if not is_last else 100.0),
                "current_cycle": current_cycle,
                "total_cycles": total_cycles,
                "active_task": f"Diagnostic run: {stage_name}",
                "elapsed_seconds": elapsed_total,
                "estimated_remaining_seconds": remaining_total if not is_last else 0.0,
                "resources": get_disk_resources(),
                "latest_metrics": {
                    "exact_accuracy": 0.5255 if not is_last else 0.5333,
                    "macro_f1": 0.7283 if not is_last else 0.7320,
                    "false_extra_rate": 0.2710,
                    "missed_rate": 0.2771,
                },
                "recent_events": events,
                "active_model": {
                    "version": "v11-candidate-run-004-champion",
                    "sha256": "e4d042937cf8c3e1e3c70f147a707b33a629d463db34485766c98da21c2e3a56",
                    "status": "active_runtime",
                },
            }

            write_atomic_status(payload)
            print(f"[{time.strftime('%H:%M:%S')}] {state} - Stage: {stage_name} - Progress: {current_samples}/{total_target}", flush=True)

            sleep_time = min(heartbeat_interval, duration_secs - elapsed_in_stage)
            if sleep_time <= 0:
                break
            time.sleep(sleep_time)
            elapsed_in_stage = time.time() - start_step

    print("[DIAGNOSTIC RUNNER FINISHED]", flush=True)


if __name__ == "__main__":
    run_diagnostic()
