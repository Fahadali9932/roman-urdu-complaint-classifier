"""Awaaz-e-Awam (آوازِ عوام) — Phase V11.5 Training Telemetry Engine.

Atomic, durable progress reporter for continuous training cycles.
Writes atomic snapshots to data/v11/training_telemetry/active_status.json
using tempfile + os.replace() to prevent partially written reads.
"""
from __future__ import annotations

import json
import os
import shutil
import sys
import tempfile
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

TELEMETRY_DIR = Path("data/v11/training_telemetry")
STATUS_FILE = TELEMETRY_DIR / "active_status.json"


def ensure_telemetry_dir() -> Path:
    TELEMETRY_DIR.mkdir(parents=True, exist_ok=True)
    return TELEMETRY_DIR


def get_disk_resources() -> Dict[str, Any]:
    """Inspects C: and D: drive storage safely."""
    res: Dict[str, Any] = {}
    for drive in ["C:", "D:"]:
        try:
            total, used, free = shutil.disk_usage(f"{drive}\\")
            res[drive] = {
                "total_gb": round(total / (1024**3), 2),
                "used_gb": round(used / (1024**3), 2),
                "free_gb": round(free / (1024**3), 2),
            }
        except Exception:
            pass
    return res


def write_atomic_status(status_payload: Dict[str, Any]) -> None:
    """Atomically write status payload to STATUS_FILE using os.replace."""
    ensure_telemetry_dir()
    status_payload["updated_at"] = time.time()
    status_payload["updated_iso"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    tmp_fd, tmp_path = tempfile.mkstemp(dir=TELEMETRY_DIR, prefix="status_", suffix=".tmp")
    with os.fdopen(tmp_fd, "w", encoding="utf-8") as f:
        json.dump(status_payload, f, indent=2, ensure_ascii=False)
        f.flush()
        os.fsync(f.fileno())

    os.replace(tmp_path, STATUS_FILE)


def read_status() -> Dict[str, Any]:
    """Reads current status payload or returns default IDLE state."""
    if not STATUS_FILE.exists():
        return get_idle_status()

    try:
        data = json.loads(STATUS_FILE.read_text(encoding="utf-8"))
        # Check staleness: if active/live but updated > 25 seconds ago
        if data.get("state") in ("LIVE", "RUNNING") and (time.time() - data.get("updated_at", 0)) > 25.0:
            data["state"] = "STALE"
            data["notes"] = data.get("notes", []) + ["Heartbeat timeout: process may be hung or terminated."]
        return data
    except Exception:
        return get_idle_status()


def get_idle_status() -> Dict[str, Any]:
    """Returns baseline idle state structure."""
    return {
        "state": "IDLE",
        "stage": "Standby",
        "progress_current": 0,
        "progress_target": 0,
        "percent_complete": 0.0,
        "current_cycle": 0,
        "total_cycles": 0,
        "active_task": "No training operation running",
        "elapsed_seconds": 0.0,
        "estimated_remaining_seconds": 0.0,
        "resources": get_disk_resources(),
        "latest_metrics": {
            "exact_accuracy": 0.5255,
            "macro_f1": 0.7283,
            "false_extra_rate": 0.2710,
            "missed_rate": 0.2771,
        },
        "recent_events": [
            {
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                "level": "INFO",
                "message": "AI Control Center telemetry initialized in standby mode.",
            }
        ],
        "active_model": {
            "version": "v11-candidate-run-004-champion",
            "sha256": "e4d042937cf8c3e1e3c70f147a707b33a629d463db34485766c98da21c2e3a56",
            "status": "active_runtime",
        },
    }
